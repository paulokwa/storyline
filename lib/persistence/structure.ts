import { createClient } from '@/lib/supabase/client'
import { softDeleteStructureNode, restoreStructureNode } from '@/lib/supabase/recovery'
import {
    LOCAL_STORE_NAMES,
    getLocalRecord,
    getLocalRecordsByProjectId,
    putLocalRecord,
    bulkPutLocalRecords,
} from '@/lib/persistence/local-db'
import { isLocalProjectId } from '@/lib/persistence/project-mode'
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
    if (isLocalProjectId(projectId)) {
        const data: StructureNodeRow = {
            created_at: new Date().toISOString(),
            deleted_at: null,
            id: `${projectId}_node_${crypto.randomUUID()}`,
            order_index: orderIndex,
            parent_id: parentId,
            project_id: projectId,
            title,
            type,
        }
        await putLocalRecord(LOCAL_STORE_NAMES.structureNodes, data)
        return data
    }

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
    if (isLocalProjectId(projectId)) {
        const data: SceneRow = {
            content: null,
            deleted_at: null,
            id: `${projectId}_scene_${crypto.randomUUID()}`,
            last_editor_id: null,
            node_id: nodeId,
            project_id: projectId,
            updated_at: new Date().toISOString(),
            version: 1,
            writing_mode: writingMode ?? 'simple',
        }
        await putLocalRecord(LOCAL_STORE_NAMES.scenes, data)
        return data
    }

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
    if (isLocalProjectId(nodeId)) {
        const node = await getLocalRecord<StructureNodeRow>(LOCAL_STORE_NAMES.structureNodes, nodeId)
        if (!node) throw new Error('Local structure node not found.')
        await putLocalRecord(LOCAL_STORE_NAMES.structureNodes, {
            ...node,
            title,
        })
        return
    }

    const supabase = createClient()
    const { error } = await supabase
        .from('structure_nodes')
        .update({ title })
        .eq('id', nodeId)

    if (error) throw error
}

export async function reorderStructureNodes(nodes: StructureNodeRow[]) {
    if (nodes.length > 0 && isLocalProjectId(nodes[0].project_id)) {
        await bulkPutLocalRecords(
            LOCAL_STORE_NAMES.structureNodes,
            nodes.map((node) => ({
                ...node,
                updated_at: new Date().toISOString(),
            })) as Array<StructureNodeRow & { updated_at: string }>
        )
        return
    }

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
    if (isLocalProjectId(projectId)) {
        const descendants = new Set<string>()

        const collectDescendants = (targetId: string) => {
            descendants.add(targetId)
            allNodes
                .filter((node) => node.parent_id === targetId)
                .forEach((node) => collectDescendants(node.id))
        }

        collectDescendants(nodeId)

        const timestamp = new Date().toISOString()
        const storedNodes = await getLocalRecordsByProjectId<StructureNodeRow>(LOCAL_STORE_NAMES.structureNodes, projectId)
        const storedScenes = await getLocalRecordsByProjectId<SceneRow>(LOCAL_STORE_NAMES.scenes, projectId)

        await bulkPutLocalRecords(
            LOCAL_STORE_NAMES.structureNodes,
            storedNodes.map((node) =>
                descendants.has(node.id)
                    ? { ...node, deleted_at: timestamp }
                    : node
            )
        )

        await bulkPutLocalRecords(
            LOCAL_STORE_NAMES.scenes,
            storedScenes.map((scene) =>
                descendants.has(scene.node_id)
                    ? { ...scene, deleted_at: timestamp }
                    : scene
            )
        )

        return [...descendants]
    }

    const supabase = createClient()
    return softDeleteStructureNode(supabase, projectId, nodeId, allNodes)
}

export async function restoreStructureTree(nodeId: string, descendantIds: string[]) {
    if (isLocalProjectId(nodeId)) {
        const targetIds = new Set([nodeId, ...descendantIds])
        const nodes = await Promise.all(
            [...targetIds].map((id) => getLocalRecord<StructureNodeRow>(LOCAL_STORE_NAMES.structureNodes, id))
        )

        await bulkPutLocalRecords(
            LOCAL_STORE_NAMES.structureNodes,
            nodes.filter((node): node is StructureNodeRow => !!node).map((node) => ({
                ...node,
                deleted_at: null,
            }))
        )
        return
    }

    const supabase = createClient()
    return restoreStructureNode(supabase, nodeId, descendantIds)
}
