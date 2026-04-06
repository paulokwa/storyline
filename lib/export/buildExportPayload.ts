import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

export type ExportNode = {
    id: string
    type: 'episode' | 'act' | 'scene' | 'chapter'
    title: string
    order_index: number
    content?: any // TipTap JSON
    summary?: string
}

export type ExportPayload = {
    projectTitle: string
    projectType: 'tv_script' | 'novel'
    nodes: ExportNode[]
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

export async function buildExportPayload(projectId: string): Promise<ExportPayload> {
    const supabase = createClient()

    // 1. Fetch project
    const { data: project } = await supabase
        .from('projects')
        .select('title, type')
        .eq('id', projectId)
        .single() as { data: { title: string; type: string } | null }

    if (!project) throw new Error('Project not found')

    // 2. Fetch all structure nodes
    const { data: nodes } = await supabase
        .from('structure_nodes')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index') as { data: any[] | null }

    if (!nodes) return { projectTitle: project.title, projectType: project.type as any, nodes: [] }

    // 3. Fetch all scenes content
    const { data: scenes } = await supabase
        .from('scenes')
        .select('node_id, content')
        .eq('project_id', projectId) as { data: any[] | null }

    const sceneMap = new Map((scenes || []).map(s => [s.node_id as string, s.content]))

    // 4. Combine into a flat list of nodes in order
    const exportNodes: ExportNode[] = nodes.map(node => ({
        id: node.id,
        type: node.type as any,
        title: node.title,
        order_index: node.order_index,
        content: sceneMap.get(node.id)
    }))

    return {
        projectTitle: project.title,
        projectType: project.type as any,
        nodes: exportNodes
    }
}
