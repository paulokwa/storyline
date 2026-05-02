'use client'

import { generateInitialProject, type InitialProjectInput, type ProjectBlueprint } from '@/lib/persistence/project-blueprint'
import type { Database } from '@/lib/supabase/types'
import { LOCAL_PROJECT_ID_PREFIX, isLocalProjectId } from '@/lib/persistence/project-mode'
import {
    LOCAL_STORE_NAMES,
    bulkPutLocalRecords,
    deleteLocalRecord,
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
type AiResponseRow = Database['public']['Tables']['ai_responses']['Row']

export type LocalProjectRow = ProjectRow & {
    is_local: true
    storage_mode: 'local-only'
    migrated_to_cloud_project_id?: string | null
    storyline_file_handle?: FileSystemFileHandle | null
    linked_file_name?: string | null
    last_file_save_at?: string | null
}

type LocalSceneWithLinks = SceneRow & {
    scene_characters: Array<{ characters: CharacterRow | null }>
    scene_ideas: Array<{ ideas: IdeaRow | null }>
    scene_locations: Array<{ locations: LocationRow | null }>
    scene_objects: Array<{ objects: ObjectRow | null }>
}

export type CreateLocalProjectInput = InitialProjectInput & {
    userId: string
}

const PROJECT_LINKED_LOCAL_STORES = [
    LOCAL_STORE_NAMES.structureNodes,
    LOCAL_STORE_NAMES.scenes,
    LOCAL_STORE_NAMES.characters,
    LOCAL_STORE_NAMES.ideas,
    LOCAL_STORE_NAMES.locations,
    LOCAL_STORE_NAMES.objects,
    LOCAL_STORE_NAMES.comments,
    LOCAL_STORE_NAMES.projectAssets,
    LOCAL_STORE_NAMES.sceneAssets,
    LOCAL_STORE_NAMES.entityAssets,
    LOCAL_STORE_NAMES.aiResponses,
] as const

let legacyLocalProjectNormalizationPromise: Promise<void> | null = null

function nowIso() {
    return new Date().toISOString()
}

function createLocalId(prefix: string) {
    return `${LOCAL_PROJECT_ID_PREFIX}${prefix}_${crypto.randomUUID()}`
}

async function normalizeLegacyLocalProjects() {
    if (legacyLocalProjectNormalizationPromise) {
        return legacyLocalProjectNormalizationPromise
    }

    legacyLocalProjectNormalizationPromise = (async () => {
        const projects = await getAllLocalRecords<LocalProjectRow>(LOCAL_STORE_NAMES.projects)
        const legacyProjects = projects.filter((project) => {
            const isMarkedLocal = project.storage_mode === 'local-only' || project.is_local === true
            return isMarkedLocal && !isLocalProjectId(project.id)
        })

        for (const legacyProject of legacyProjects) {
            const nextProjectId = createLocalId('project')
            const linkedRecords = await Promise.all(
                PROJECT_LINKED_LOCAL_STORES.map(async (storeName) => ({
                    storeName,
                    records: await getLocalRecordsByProjectId<Array<{ id: string; project_id: string }>[number]>(
                        storeName,
                        legacyProject.id
                    ),
                }))
            )

            const nextProject: LocalProjectRow = {
                ...legacyProject,
                id: nextProjectId,
                is_local: true,
                storage_mode: 'local-only',
                updated_at: nowIso(),
            }

            await putLocalRecord(LOCAL_STORE_NAMES.projects, nextProject)

            await Promise.all(
                linkedRecords.map(({ storeName, records }) =>
                    bulkPutLocalRecords(
                        storeName,
                        records.map((record) => ({
                            ...record,
                            project_id: nextProjectId,
                        }))
                    )
                )
            )

            await deleteLocalRecord(LOCAL_STORE_NAMES.projects, legacyProject.id)
        }
    })()

    try {
        await legacyLocalProjectNormalizationPromise
    } finally {
        legacyLocalProjectNormalizationPromise = null
    }
}

function createLocalProjectRow(input: CreateLocalProjectInput, blueprint: ProjectBlueprint): LocalProjectRow {
    const timestamp = nowIso()

    return {
        allow_collaborator_exports: false,
        allow_viewer_feedback: false,
        cover_url: blueprint.project.coverUrl,
        created_at: timestamp,
        deleted_at: null,
        export_metadata: null,
        id: createLocalId('project'),
        last_accessed_at: timestamp,
        order_index: blueprint.project.orderIndex,
        premise: blueprint.project.premise,
        project_type: blueprint.project.type,
        share_owner_feedback: false,
        setting: blueprint.project.setting,
        title: blueprint.project.title,
        tone: blueprint.project.tone,
        type: blueprint.project.type,
        updated_at: timestamp,
        user_id: input.userId,
        writing_mode: blueprint.project.writingMode,
        is_local: true,
        storage_mode: 'local-only',
        migrated_to_cloud_project_id: null,
        storyline_file_handle: null,
        linked_file_name: null,
        last_file_save_at: null,
    }
}

async function writeInitialProjectContent(
    project: LocalProjectRow,
    blueprint: ProjectBlueprint
) {
    const timestamp = nowIso()
    const nodeIdsByKey = new Map<string, string>()
    const nodes: StructureNodeRow[] = blueprint.nodes.map((node) => {
        const id = createLocalId('node')
        nodeIdsByKey.set(node.key, id)
        return {
            created_at: timestamp,
            deleted_at: null,
            id,
            order_index: node.orderIndex,
            parent_id: null,
            project_id: project.id,
            title: node.title,
            type: node.type,
        }
    })

    nodes.forEach((node, index) => {
        const parentKey = blueprint.nodes[index].parentKey
        node.parent_id = parentKey ? nodeIdsByKey.get(parentKey) ?? null : null
    })

    const scenes: SceneRow[] = blueprint.scenes.map((scene) => ({
        content: scene.content,
        deleted_at: null,
        id: createLocalId('scene'),
        last_editor_id: null,
        node_id: nodeIdsByKey.get(scene.nodeKey)!,
        project_id: project.id,
        updated_at: timestamp,
        version: 1,
        writing_mode: scene.writingMode,
    }))

    const characters: CharacterRow[] = blueprint.entities.characters.map((character) => ({
        created_at: timestamp,
        deleted_at: null,
        description: character.description,
        id: createLocalId('character'),
        name: character.name,
        notes: character.notes,
        order_index: character.orderIndex,
        project_id: project.id,
    }))

    const ideas: IdeaRow[] = blueprint.entities.ideas.map((idea) => ({
        content: idea.content,
        created_at: timestamp,
        deleted_at: null,
        id: createLocalId('idea'),
        order_index: idea.orderIndex,
        project_id: project.id,
        title: idea.title,
        updated_at: timestamp,
    }))

    const locations: LocationRow[] = blueprint.entities.locations.map((location) => ({
        atmosphere: location.atmosphere,
        created_at: timestamp,
        deleted_at: null,
        description: location.description,
        id: createLocalId('location'),
        name: location.name,
        order_index: location.orderIndex,
        project_id: project.id,
        updated_at: timestamp,
    }))

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
    const blueprint = generateInitialProject(input)
    const project = createLocalProjectRow(input, blueprint)
    await putLocalRecord(LOCAL_STORE_NAMES.projects, project)
    await writeInitialProjectContent(project, blueprint)
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
    await normalizeLegacyLocalProjects()
    const projects = await getAllLocalRecords<LocalProjectRow>(LOCAL_STORE_NAMES.projects)
    return projects.sort((a, b) => {
        const aIndex = a.order_index ?? 0
        const bIndex = b.order_index ?? 0
        return aIndex - bIndex
    })
}

export async function updateLocalProject(
    projectId: string, 
    updates: ProjectUpdate & { 
        migrated_to_cloud_project_id?: string | null;
        storyline_file_handle?: FileSystemFileHandle | null;
        linked_file_name?: string | null;
        last_file_save_at?: string | null;
    }
) {
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
    const linkedRecords = await Promise.all(
        PROJECT_LINKED_LOCAL_STORES.map(async (storeName) => ({
            storeName,
            records: await getLocalRecordsByProjectId<{ id: string }>(storeName, projectId),
        }))
    )

    await Promise.all([
        deleteLocalRecord(LOCAL_STORE_NAMES.projects, projectId),
        ...linkedRecords.flatMap(({ storeName, records }) =>
            records.map((record) => deleteLocalRecord(storeName, record.id))
        ),
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
        projectAiFeedback,
    ] = await Promise.all([
        getLocalRecordsByProjectId<StructureNodeRow>(LOCAL_STORE_NAMES.structureNodes, projectId),
        getLocalRecordsByProjectId<SceneRow>(LOCAL_STORE_NAMES.scenes, projectId),
        getLocalRecordsByProjectId<CharacterRow>(LOCAL_STORE_NAMES.characters, projectId),
        getLocalRecordsByProjectId<IdeaRow>(LOCAL_STORE_NAMES.ideas, projectId),
        getLocalRecordsByProjectId<LocationRow>(LOCAL_STORE_NAMES.locations, projectId),
        getLocalRecordsByProjectId<ObjectRow>(LOCAL_STORE_NAMES.objects, projectId),
        getLocalRecordsByProjectId<AiResponseRow>(LOCAL_STORE_NAMES.aiResponses, projectId),
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
        projectAiFeedback: projectAiFeedback || [],
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
