'use client'

import { DEFAULT_WRITING_MODE_BY_TYPE } from '@/lib/constants'
import type { Database, Json, ProjectType, WritingMode } from '@/lib/supabase/types'
import { LOCAL_PROJECT_ID_PREFIX, isLocalProjectId } from '@/lib/persistence/project-mode'
import {
    LOCAL_STORE_NAMES,
    bulkPutLocalRecords,
    deleteLocalRecord,
    deleteLocalRecordsByProjectId,
    getAllLocalRecords,
    getLocalRecord,
    getLocalRecordsByProjectId,
    putLocalRecord,
} from '@/lib/persistence/local-db'

type ProjectRow = Database['public']['Tables']['projects']['Row']
type ProjectUpdate = Database['public']['Tables']['projects']['Update']
type StructureNodeRow = Database['public']['Tables']['structure_nodes']['Row']
type SceneRow = Database['public']['Tables']['scenes']['Row']
type CharacterRow = Database['public']['Tables']['characters']['Row']
type IdeaRow = Database['public']['Tables']['ideas']['Row']
type LocationRow = Database['public']['Tables']['locations']['Row']
type ObjectRow = Database['public']['Tables']['objects']['Row']

export type LocalProjectRow = ProjectRow & {
    is_local: true
    storage_mode: 'local-only'
}

type LocalSceneWithLinks = SceneRow & {
    scene_characters: Array<{ characters: CharacterRow | null }>
    scene_ideas: Array<{ ideas: IdeaRow | null }>
    scene_locations: Array<{ locations: LocationRow | null }>
    scene_objects: Array<{ objects: ObjectRow | null }>
}

type CreateLocalProjectInput = {
    userId: string
    title: string
    type: ProjectType
    writingMode?: WritingMode
    premise?: string
    tone?: string
    setting?: string
    coverUrl?: string
    characters?: string[]
    locations?: string[]
    firstIdea?: string
    chunks?: { title: string; content: string }[]
}

function nowIso() {
    return new Date().toISOString()
}

function createLocalId(prefix: string) {
    return `${LOCAL_PROJECT_ID_PREFIX}${prefix}_${crypto.randomUUID()}`
}

function createLocalProjectRow(input: CreateLocalProjectInput): LocalProjectRow {
    const timestamp = nowIso()
    const writingMode = input.writingMode ?? DEFAULT_WRITING_MODE_BY_TYPE[input.type]

    return {
        allow_collaborator_exports: false,
        allow_viewer_feedback: false,
        cover_url: input.coverUrl || null,
        created_at: timestamp,
        deleted_at: null,
        export_metadata: null,
        id: createLocalId('project'),
        last_accessed_at: timestamp,
        order_index: Date.now(),
        premise: input.premise ?? null,
        project_type: input.type,
        share_owner_feedback: false,
        setting: input.setting ?? null,
        title: input.title,
        tone: input.tone ?? null,
        type: input.type,
        updated_at: timestamp,
        user_id: input.userId,
        writing_mode: writingMode,
        is_local: true,
        storage_mode: 'local-only',
    }
}

function createStructureNodeRow(projectId: string, type: StructureNodeRow['type'], title: string, orderIndex: number, parentId: string | null = null): StructureNodeRow {
    return {
        created_at: nowIso(),
        deleted_at: null,
        id: createLocalId('node'),
        order_index: orderIndex,
        parent_id: parentId,
        project_id: projectId,
        title,
        type,
    }
}

function createSceneRow(projectId: string, nodeId: string, writingMode: WritingMode, content: Json | null = null): SceneRow {
    return {
        content,
        deleted_at: null,
        id: createLocalId('scene'),
        last_editor_id: null,
        node_id: nodeId,
        project_id: projectId,
        updated_at: nowIso(),
        version: 1,
        writing_mode: writingMode,
    }
}

function createCharacterRow(projectId: string, name: string, orderIndex: number, description = '', notes = ''): CharacterRow {
    return {
        created_at: nowIso(),
        deleted_at: null,
        description,
        id: createLocalId('character'),
        name,
        notes,
        order_index: orderIndex,
        project_id: projectId,
    }
}

function createIdeaRow(projectId: string, title: string, orderIndex: number, content = ''): IdeaRow {
    return {
        content,
        created_at: nowIso(),
        deleted_at: null,
        id: createLocalId('idea'),
        order_index: orderIndex,
        project_id: projectId,
        title,
        updated_at: nowIso(),
    }
}

function createLocationRow(projectId: string, name: string, orderIndex: number): LocationRow {
    return {
        atmosphere: '',
        created_at: nowIso(),
        deleted_at: null,
        description: '',
        id: createLocalId('location'),
        name,
        order_index: orderIndex,
        project_id: projectId,
        updated_at: nowIso(),
    }
}

function buildRichTextContent(text: string, writingMode: WritingMode): Json {
    const nodeType = writingMode === 'screenplay' ? 'screenplayAction' : 'paragraph'
    const paragraphs = text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => ({
            type: nodeType,
            content: [{ type: 'text', text: line }],
        }))

    return {
        type: 'doc',
        content: paragraphs.length > 0 ? paragraphs : [{ type: nodeType }],
    }
}

async function writeInitialProjectContent(
    project: LocalProjectRow,
    input: CreateLocalProjectInput
) {
    const writingMode = (project.writing_mode ?? DEFAULT_WRITING_MODE_BY_TYPE[project.type as ProjectType]) as WritingMode
    const characters = (input.characters ?? []).map((name, index) => createCharacterRow(project.id, name.trim(), index, index === 0 ? 'Protagonist' : 'Supporting Character'))
        .filter((row) => row.name)
    const locations = (input.locations ?? []).map((name, index) => createLocationRow(project.id, name.trim(), index))
        .filter((row) => row.name)
    const ideas: IdeaRow[] = []

    let initialSceneContent: Json | null = null
    if (input.firstIdea?.trim()) {
        ideas.push(createIdeaRow(project.id, 'Initial Vision', 0, input.firstIdea.trim()))
        initialSceneContent = buildRichTextContent(input.firstIdea.trim(), writingMode)
    }

    const nodes: StructureNodeRow[] = []
    const scenes: SceneRow[] = []

    const chunks = input.chunks?.filter((chunk) => chunk.content.trim()) ?? []

    if (chunks.length > 0) {
        if (project.type === 'novel') {
            chunks.forEach((chunk, index) => {
                const chapter = createStructureNodeRow(project.id, 'chapter', chunk.title || `Chapter ${index + 1}`, index)
                const sceneNode = createStructureNodeRow(project.id, 'scene', chunk.title || 'Scene 1', 0, chapter.id)
                nodes.push(chapter, sceneNode)
                scenes.push(createSceneRow(project.id, sceneNode.id, writingMode, buildRichTextContent(chunk.content, writingMode)))
            })
        } else {
            const episode = createStructureNodeRow(project.id, 'episode', 'Imported Episode', 0)
            const act = createStructureNodeRow(project.id, 'act', 'Imported Act', 0, episode.id)
            nodes.push(episode, act)

            chunks.forEach((chunk, index) => {
                const sceneNode = createStructureNodeRow(project.id, 'scene', chunk.title || `Scene ${index + 1}`, index, act.id)
                nodes.push(sceneNode)
                scenes.push(createSceneRow(project.id, sceneNode.id, writingMode, buildRichTextContent(chunk.content, writingMode)))
            })
        }
    } else if (project.type === 'tv_script') {
        const episode = createStructureNodeRow(project.id, 'episode', 'Episode 1', 0)
        const act = createStructureNodeRow(project.id, 'act', 'Act 1', 0, episode.id)
        const sceneNode = createStructureNodeRow(project.id, 'scene', 'Scene 1', 0, act.id)
        nodes.push(episode, act, sceneNode)
        scenes.push(createSceneRow(project.id, sceneNode.id, writingMode, initialSceneContent))
    } else {
        const chapter = createStructureNodeRow(project.id, 'chapter', 'Chapter 1', 0)
        const sceneNode = createStructureNodeRow(project.id, 'scene', 'Scene 1', 0, chapter.id)
        nodes.push(chapter, sceneNode)
        scenes.push(createSceneRow(project.id, sceneNode.id, writingMode, initialSceneContent))
    }

    await Promise.all([
        bulkPutLocalRecords(LOCAL_STORE_NAMES.structureNodes, nodes),
        bulkPutLocalRecords(LOCAL_STORE_NAMES.scenes, scenes),
        bulkPutLocalRecords(LOCAL_STORE_NAMES.characters, characters),
        bulkPutLocalRecords(LOCAL_STORE_NAMES.ideas, ideas),
        bulkPutLocalRecords(LOCAL_STORE_NAMES.locations, locations),
        bulkPutLocalRecords(LOCAL_STORE_NAMES.objects, []),
    ])
}

export async function createLocalProject(input: CreateLocalProjectInput) {
    const project = createLocalProjectRow(input)
    await putLocalRecord(LOCAL_STORE_NAMES.projects, project)
    await writeInitialProjectContent(project, input)
    return project
}

export async function getLocalProject(projectId: string) {
    if (!isLocalProjectId(projectId)) return null
    return getLocalRecord<LocalProjectRow>(LOCAL_STORE_NAMES.projects, projectId)
}

export async function requireLocalProject(projectId: string) {
    const project = await getLocalProject(projectId)
    if (!project) {
        throw new Error('Local project not found.')
    }

    return project
}

export async function listLocalProjects() {
    const projects = await getAllLocalRecords<LocalProjectRow>(LOCAL_STORE_NAMES.projects)
    return projects.sort((a, b) => {
        const aIndex = a.order_index ?? 0
        const bIndex = b.order_index ?? 0
        return aIndex - bIndex
    })
}

export async function updateLocalProject(projectId: string, updates: ProjectUpdate) {
    const project = await requireLocalProject(projectId)
    const nextProject: LocalProjectRow = {
        ...project,
        ...updates,
        updated_at: nowIso(),
        is_local: true,
        storage_mode: 'local-only',
    }

    await putLocalRecord(LOCAL_STORE_NAMES.projects, nextProject)
    return nextProject
}

export async function touchLocalProject(projectId: string) {
    const project = await requireLocalProject(projectId)
    const timestamp = nowIso()
    await putLocalRecord(LOCAL_STORE_NAMES.projects, {
        ...project,
        last_accessed_at: timestamp,
        updated_at: timestamp,
    })
}

export async function softDeleteLocalProject(projectId: string) {
    return updateLocalProject(projectId, { deleted_at: nowIso() })
}

export async function restoreLocalProject(projectId: string) {
    return updateLocalProject(projectId, { deleted_at: null })
}

export async function destroyLocalProject(projectId: string) {
    await Promise.all([
        deleteLocalRecord(LOCAL_STORE_NAMES.projects, projectId),
        deleteLocalRecordsByProjectId(LOCAL_STORE_NAMES.structureNodes, projectId),
        deleteLocalRecordsByProjectId(LOCAL_STORE_NAMES.scenes, projectId),
        deleteLocalRecordsByProjectId(LOCAL_STORE_NAMES.characters, projectId),
        deleteLocalRecordsByProjectId(LOCAL_STORE_NAMES.ideas, projectId),
        deleteLocalRecordsByProjectId(LOCAL_STORE_NAMES.locations, projectId),
        deleteLocalRecordsByProjectId(LOCAL_STORE_NAMES.objects, projectId),
    ])
}

function sortActiveRows<T extends { deleted_at: string | null; order_index: number }>(rows: T[]) {
    return rows
        .filter((row) => row.deleted_at == null)
        .sort((a, b) => a.order_index - b.order_index)
}

export async function loadLocalStoryWorkspaceData(projectId: string) {
    const project = await requireLocalProject(projectId)
    const [
        nodes,
        scenes,
        projectCharacters,
        projectIdeas,
        projectLocations,
        projectObjects,
    ] = await Promise.all([
        getLocalRecordsByProjectId<StructureNodeRow>(LOCAL_STORE_NAMES.structureNodes, projectId),
        getLocalRecordsByProjectId<SceneRow>(LOCAL_STORE_NAMES.scenes, projectId),
        getLocalRecordsByProjectId<CharacterRow>(LOCAL_STORE_NAMES.characters, projectId),
        getLocalRecordsByProjectId<IdeaRow>(LOCAL_STORE_NAMES.ideas, projectId),
        getLocalRecordsByProjectId<LocationRow>(LOCAL_STORE_NAMES.locations, projectId),
        getLocalRecordsByProjectId<ObjectRow>(LOCAL_STORE_NAMES.objects, projectId),
    ])

    const allScenes: LocalSceneWithLinks[] = scenes
        .filter((scene) => scene.deleted_at == null)
        .map((scene) => ({
            ...scene,
            scene_characters: [],
            scene_ideas: [],
            scene_locations: [],
            scene_objects: [],
        }))

    return {
        project,
        nodes: sortActiveRows(nodes),
        projectCharacters: sortActiveRows(projectCharacters),
        projectIdeas: sortActiveRows(projectIdeas),
        projectLocations: sortActiveRows(projectLocations),
        projectObjects: sortActiveRows(projectObjects),
        projectAiFeedback: [],
        allScenes,
        projectRelationships: [],
    }
}

export async function loadLocalCharactersWorkspaceData(projectId: string) {
    const [project, characters, locations, objects] = await Promise.all([
        requireLocalProject(projectId),
        getLocalRecordsByProjectId<CharacterRow>(LOCAL_STORE_NAMES.characters, projectId),
        getLocalRecordsByProjectId<LocationRow>(LOCAL_STORE_NAMES.locations, projectId),
        getLocalRecordsByProjectId<ObjectRow>(LOCAL_STORE_NAMES.objects, projectId),
    ])

    const availableEntities = [
        ...sortActiveRows(characters).map((character) => ({ id: character.id, name: character.name, type: 'character' as const })),
        ...sortActiveRows(locations).map((location) => ({ id: location.id, name: location.name, type: 'location' as const })),
        ...sortActiveRows(objects).map((object) => ({ id: object.id, name: object.name, type: 'object' as const })),
    ]

    return {
        characters: sortActiveRows(characters),
        projectType: project.type,
        availableEntities,
    }
}

export async function loadLocalIdeasWorkspaceData(projectId: string) {
    const ideas = await getLocalRecordsByProjectId<IdeaRow>(LOCAL_STORE_NAMES.ideas, projectId)
    return { ideas: sortActiveRows(ideas) }
}

export async function loadLocalLocationsWorkspaceData(projectId: string) {
    const locations = await getLocalRecordsByProjectId<LocationRow>(LOCAL_STORE_NAMES.locations, projectId)
    return { locations: sortActiveRows(locations) }
}

export async function loadLocalObjectsWorkspaceData(projectId: string) {
    const objects = await getLocalRecordsByProjectId<ObjectRow>(LOCAL_STORE_NAMES.objects, projectId)
    return { objects: sortActiveRows(objects) }
}
