import { createClient } from '@/lib/supabase/client'

import { normalizeContent } from './normalize'
import { isLocalProjectId } from '@/lib/persistence/project-mode'
import {
    requireLocalProject,
} from '@/lib/persistence/local-projects'
import { LOCAL_STORE_NAMES, getLocalRecordsByProjectId } from '@/lib/persistence/local-db'

export type ExportNode = {
    id: string
    type: 'episode' | 'act' | 'scene' | 'chapter'
    title: string
    order_index: number
    depth: number
    content?: any // TipTap JSON
}

export interface ExportMetadata {
    authorName?: string
    penName?: string
    copyrightHolder?: string
    copyrightYear?: string
    language?: string
    publisher?: string
    description?: string
    keywords?: string
    isbn?: string
}

export type ExportPayload = {
    projectTitle: string
    projectType: 'tv_script' | 'novel'
    nodes: ExportNode[]
    metadata?: ExportMetadata
}

export type ExportScope = 'entire_project' | 'selected_chapters' | 'selected_scenes'

export interface ExportOptions {
    scope: ExportScope
    selectedIds?: string[] // IDs of chapters or scenes
    includeProjectTitle: boolean
    includeChapterTitles: boolean
    includeSceneSubtitles: boolean
    contentMode: 'prose_only' | 'summaries_only' | 'both'
    format: 'md' | 'txt' | 'html' | 'docx' | 'pdf' | 'epub'
}

// Depth-first traversal: sorts siblings by order_index, recurses into children.
// Produces correct export order for any nesting depth including nested chapters.
function buildDepthFirstNodes(
    allNodes: any[],
    sceneMap: Map<string, any>,
    parentId: string | null = null,
    depth: number = 0
): ExportNode[] {
    const children = allNodes
        .filter(n => (n.parent_id ?? null) === parentId)
        .sort((a, b) => a.order_index - b.order_index)

    const result: ExportNode[] = []
    for (const node of children) {
        result.push({
            id: node.id,
            type: node.type as ExportNode['type'],
            title: node.title,
            order_index: node.order_index,
            depth,
            content: normalizeContent(sceneMap.get(node.id)),
        })
        result.push(...buildDepthFirstNodes(allNodes, sceneMap, node.id, depth + 1))
    }
    return result
}

export async function buildExportPayload(projectId: string): Promise<ExportPayload> {
    const isLocal = isLocalProjectId(projectId)

    if (isLocal) {
        const project = await requireLocalProject(projectId)
        const [nodes, scenes] = await Promise.all([
            getLocalRecordsByProjectId<any>(LOCAL_STORE_NAMES.structureNodes, projectId),
            getLocalRecordsByProjectId<any>(LOCAL_STORE_NAMES.scenes, projectId)
        ])

        const activeNodes = nodes.filter((n: any) => n.deleted_at == null)
        const activeScenes = scenes.filter((s: any) => s.deleted_at == null)
        const sceneMap = new Map(activeScenes.map((s: any) => [s.node_id as string, s.content]))

        return {
            projectTitle: project.title ?? 'Untitled',
            projectType: project.type as any,
            nodes: buildDepthFirstNodes(activeNodes, sceneMap),
            metadata: project.export_metadata as ExportMetadata
        }
    }

    // Cloud project (Supabase)
    const supabase = createClient()

    const { data: project } = await supabase
        .from('projects')
        .select('title, type, export_metadata')
        .eq('id', projectId)
        .single() as { data: { title: string; type: string; export_metadata: any } | null }

    if (!project) throw new Error('Project not found')

    const { data: nodes } = await supabase
        .from('structure_nodes')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index') as { data: any[] | null }

    if (!nodes) return { projectTitle: project.title, projectType: project.type as any, nodes: [] }

    const activeNodes = nodes.filter(n => n.deleted_at == null)

    const { data: scenes } = await supabase
        .from('scenes')
        .select('node_id, content, deleted_at')
        .eq('project_id', projectId) as { data: any[] | null }

    const activeScenes = (scenes || []).filter(s => s.deleted_at == null)
    const sceneMap = new Map(activeScenes.map(s => [s.node_id as string, s.content]))

    return {
        projectTitle: project.title,
        projectType: project.type as any,
        nodes: buildDepthFirstNodes(activeNodes, sceneMap),
        metadata: project.export_metadata as ExportMetadata
    }
}
