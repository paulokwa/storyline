import { createClient } from '@/lib/supabase/client'
import { softDeleteStructureNode, restoreStructureNode } from '@/lib/supabase/recovery'
import type { Database, NodeType, WritingMode } from '@/lib/supabase/types'

type StructureNodeRow = Database['public']['Tables']['structure_nodes']['Row']
type SceneRow = Database['public']['Tables']['scenes']['Row']

export type CreateStructureNodeInput = {
    projectId: string
    parentId?: string | null
    type: NodeType
    title: string
    orderIndex: number
}

export async function createStructureNode({
    projectId,
    parentId = null,
    type,
    title,
    orderIndex,
}: CreateStructureNodeInput) {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('structure_nodes')
        .insert({
            project_id: projectId,
            parent_id: parentId,
            type,
            title,
            order_index: orderIndex,
        })
        .select()
        .single()

    if (error) throw error
    return data as StructureNodeRow
}

export async function createSceneForNode(projectId: string, nodeId: string, writingMode: WritingMode) {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('scenes')
        .insert({
            node_id: nodeId,
            project_id: projectId,
            writing_mode: writingMode ?? 'simple',
        })
        .select()
        .single()

    if (error) throw error
    return data as SceneRow
}

export async function renameStructureNode(nodeId: string, title: string) {
    const supabase = createClient()
    const { error } = await supabase
        .from('structure_nodes')
        .update({ title })
        .eq('id', nodeId)

    if (error) throw error
}

export async function reorderStructureNodes(nodes: StructureNodeRow[]) {
    const supabase = createClient()
    const { error } = await supabase
        .from('structure_nodes')
        .upsert(nodes)

    if (error) throw error
}

export async function softDeleteStructureTree(
    projectId: string,
    nodeId: string,
    allNodes: StructureNodeRow[]
) {
    const supabase = createClient()
    return softDeleteStructureNode(supabase, projectId, nodeId, allNodes)
}

export async function restoreStructureTree(nodeId: string, descendantIds: string[]) {
    const supabase = createClient()
    return restoreStructureNode(supabase, nodeId, descendantIds)
}
