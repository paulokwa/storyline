import { createClient } from '@/lib/supabase/client'
import { softDeleteEntity } from '@/lib/supabase/recovery'
import { insertContentIntoSceneNode } from '@/lib/persistence/scenes'

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
    const supabase = createClient()
    const { data, error } = await supabase
        .from('ai_responses')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as SavedResponseRecord[]
}

export async function loadProjectSceneOptions(projectId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('structure_nodes')
        .select('id, title, type')
        .eq('project_id', projectId)
        .eq('type', 'scene')
        .order('order_index', { ascending: true })

    if (error) throw error
    return (data ?? []) as { id: string; title: string; type: string }[]
}

export async function renameSavedResponse(id: string, title: string) {
    const supabase = createClient()
    const { error } = await supabase
        .from('ai_responses')
        .update({
            title,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)

    if (error) throw error
}

export async function deleteSavedResponse(id: string) {
    const supabase = createClient()
    await softDeleteEntity(supabase, 'ai_responses', id)
}

export async function insertSavedResponseIntoScene(sceneNodeId: string, response: string) {
    await insertContentIntoSceneNode(sceneNodeId, response)
}
