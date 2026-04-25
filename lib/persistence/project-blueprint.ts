import { DEFAULT_WRITING_MODE_BY_TYPE } from '@/lib/constants'
import type { Json, ProjectType, WritingMode } from '@/lib/supabase/types'

export type InitialProjectChunk = {
    title: string
    content: string
}

export type InitialProjectInput = {
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
    chunks?: InitialProjectChunk[]
}

export type ProjectBlueprintNode = {
    key: string
    parentKey: string | null
    type: 'episode' | 'act' | 'scene' | 'chapter'
    title: string
    orderIndex: number
}

export type ProjectBlueprintScene = {
    nodeKey: string
    content: Json | null
    writingMode: WritingMode
}

export type ProjectBlueprint = {
    project: {
        title: string
        type: ProjectType
        writingMode: WritingMode
        premise: string | null
        tone: string | null
        setting: string | null
        coverUrl: string | null
        orderIndex: number
    }
    nodes: ProjectBlueprintNode[]
    scenes: ProjectBlueprintScene[]
    entities: {
        characters: Array<{
            name: string
            description: string
            notes: string
            orderIndex: number
        }>
        ideas: Array<{
            title: string
            content: string
            orderIndex: number
        }>
        locations: Array<{
            name: string
            description: string
            atmosphere: string
            orderIndex: number
        }>
        objects: Array<{
            name: string
            description: string
            significance: string
            orderIndex: number
        }>
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

export function generateInitialProject(input: InitialProjectInput): ProjectBlueprint {
    const writingMode = input.writingMode ?? DEFAULT_WRITING_MODE_BY_TYPE[input.type]
    const nodes: ProjectBlueprintNode[] = []
    const scenes: ProjectBlueprintScene[] = []
    const ideas: ProjectBlueprint['entities']['ideas'] = []

    let initialSceneContent: Json | null = null
    if (input.firstIdea?.trim()) {
        const firstIdea = input.firstIdea.trim()
        ideas.push({
            title: 'Initial Vision',
            content: firstIdea,
            orderIndex: 0,
        })
        initialSceneContent = buildRichTextContent(firstIdea, writingMode)
    }

    const addNode = (
        key: string,
        type: ProjectBlueprintNode['type'],
        title: string,
        orderIndex: number,
        parentKey: string | null = null
    ) => {
        nodes.push({ key, parentKey, type, title, orderIndex })
    }

    const addScene = (nodeKey: string, content: Json | null) => {
        scenes.push({ nodeKey, content, writingMode })
    }

    const chunks = input.chunks?.filter((chunk) => chunk.content.trim()) ?? []

    if (chunks.length > 0) {
        if (input.type === 'novel') {
            chunks.forEach((chunk, index) => {
                const chapterKey = `chapter-${index}`
                const sceneKey = `scene-${index}`
                addNode(chapterKey, 'chapter', chunk.title || `Chapter ${index + 1}`, index)
                addNode(sceneKey, 'scene', chunk.title || 'Scene 1', 0, chapterKey)
                addScene(sceneKey, buildRichTextContent(chunk.content, writingMode))
            })
        } else {
            addNode('episode-0', 'episode', 'Imported Episode', 0)
            addNode('act-0', 'act', 'Imported Act', 0, 'episode-0')

            chunks.forEach((chunk, index) => {
                const sceneKey = `scene-${index}`
                addNode(sceneKey, 'scene', chunk.title || `Scene ${index + 1}`, index, 'act-0')
                addScene(sceneKey, buildRichTextContent(chunk.content, writingMode))
            })
        }
    } else if (input.type === 'tv_script') {
        addNode('episode-0', 'episode', 'Episode 1', 0)
        addNode('act-0', 'act', 'Act 1', 0, 'episode-0')
        addNode('scene-0', 'scene', 'Scene 1', 0, 'act-0')
        addScene('scene-0', initialSceneContent)
    } else {
        addNode('chapter-0', 'chapter', 'Chapter 1', 0)
        addNode('scene-0', 'scene', 'Scene 1', 0, 'chapter-0')
        addScene('scene-0', initialSceneContent)
    }

    return {
        project: {
            title: input.title || 'My New Project',
            type: input.type,
            writingMode,
            premise: input.premise ?? null,
            tone: input.tone ?? null,
            setting: input.setting ?? null,
            coverUrl: input.coverUrl || null,
            orderIndex: Date.now(),
        },
        nodes,
        scenes,
        entities: {
            characters: (input.characters ?? [])
                .map((name, index) => ({
                    name: name.trim(),
                    description: index === 0 ? 'Protagonist' : 'Supporting Character',
                    notes: '',
                    orderIndex: index,
                }))
                .filter((row) => row.name),
            ideas,
            locations: (input.locations ?? [])
                .map((name, index) => ({
                    name: name.trim(),
                    description: '',
                    atmosphere: '',
                    orderIndex: index,
                }))
                .filter((row) => row.name),
            objects: [],
        },
    }
}
