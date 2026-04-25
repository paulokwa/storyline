import { createClient } from '@/lib/supabase/client'
import { insertContentIntoSceneNode } from '@/lib/persistence/scenes'
import { getAiResponses, renameAiResponse, deleteAiResponse } from '@/lib/persistence/ai-feedback'
import { isLocalProjectId } from '@/lib/persistence/project-mode'
import { getLocalRecordsByProjectId, LOCAL_STORE_NAMES } from '@/lib/persistence/local-db'
import type { Database } from '@/lib/supabase/types'

type StructureNodeRow = Database['public']['Tables']['structure_nodes']['Row']

export interface SavedResponseRecord {
    id: string
    title: string
    auto_title: string
    prompt: string
    response: string
    type: string
    source_label: string
    model: string
    action: string
    created_at: string
    linked_entities: unknown
    context_snapshot: string
    source_node_id: string | null
    source_scene_id: string | null
}

export async function loadSavedResponses(projectId: string) {
    const { data, error } = await getAiResponses(projectId)
    if (error) throw error
    // Filter out deleted_at if needed (local doesn't strictly use it yet but let's be safe)
    return (data?.filter(r => !(r as any).deleted_at) ?? []) as SavedResponseRecord[]
}

export async function loadProjectSceneOptions(projectId: string) {
    if (isLocalProjectId(projectId)) {
        const nodes = await getLocalRecordsByProjectId<StructureNodeRow>(LOCAL_STORE_NAMES.structureNodes, projectId)
        return nodes
            .filter(n => n.type === 'scene' && n.deleted_at === null)
            .sort((a, b) => a.order_index - b.order_index)
            .map(n => ({ id: n.id, title: n.title, type: n.type }))
    } else {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('structure_nodes')
            .select('id, title, type')
            .eq('project_id', projectId)
            .eq('type', 'scene')
            .is('deleted_at', null)
            .order('order_index', { ascending: true })

        if (error) throw error
        return (data ?? []) as { id: string; title: string; type: string }[]
    }
}

export async function renameSavedResponse(id: string, title: string) {
    const { error } = await renameAiResponse(id, title)
    if (error) throw error
}

export async function deleteSavedResponse(id: string) {
    const { error } = await deleteAiResponse(id)
    if (error) throw error
}

export async function insertSavedResponseIntoScene(sceneNodeId: string, response: string) {
    await insertContentIntoSceneNode(sceneNodeId, response)
}
