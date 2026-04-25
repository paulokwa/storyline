import { createClient } from '@/lib/supabase/client'
import { LOCAL_STORE_NAMES, getLocalRecordsByProjectId, putLocalRecord, deleteLocalRecord, updateLocalRecord } from '@/lib/persistence/local-db'
import { LOCAL_PROJECT_ID_PREFIX, isLocalProjectId } from '@/lib/persistence/project-mode'
import { softDeleteEntity } from '@/lib/supabase/recovery'
import type { Database } from '@/lib/supabase/types'

type AiResponse = Database['public']['Tables']['ai_responses']['Row']
type AiResponseInsert = Database['public']['Tables']['ai_responses']['Insert']

export async function saveAiResponse(data: AiResponseInsert): Promise<{ error: unknown }> {
    const { project_id } = data
    
    if (isLocalProjectId(project_id)) {
        try {
            const now = new Date().toISOString()
            const id = `${LOCAL_PROJECT_ID_PREFIX}ai_${crypto.randomUUID()}`
            
            const localRecord = {
                ...data,
                id,
                created_at: now,
                updated_at: now,
            }
            
            await putLocalRecord(LOCAL_STORE_NAMES.aiResponses, localRecord)
            return { error: null }
        } catch (err) {
            console.error('[AiFeedback] Local save error:', err)
            return { error: err }
        }
    } else {
        const supabase = createClient()
        const { error } = await supabase
            .from('ai_responses')
            .insert(data)
        
        return { error }
    }
}

export async function getAiResponses(projectId: string): Promise<{ data: AiResponse[] | null, error: unknown }> {
    if (isLocalProjectId(projectId)) {
        try {
            const records = await getLocalRecordsByProjectId<AiResponse>(LOCAL_STORE_NAMES.aiResponses, projectId)
            return { data: records, error: null }
        } catch (err) {
            console.error('[AiFeedback] Local fetch error:', err)
            return { data: null, error: err }
        }
    } else {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('ai_responses')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })
        
        return { data: data as AiResponse[] | null, error }
    }
}

export async function renameAiResponse(id: string, title: string): Promise<{ error: unknown }> {
    if (isLocalProjectId(id)) {
        try {
            await updateLocalRecord<AiResponse>(LOCAL_STORE_NAMES.aiResponses, id, {
                title,
                updated_at: new Date().toISOString()
            })
            return { error: null }
        } catch (err) {
            return { error: err }
        }
    } else {
        const supabase = createClient()
        const { error } = await supabase
            .from('ai_responses')
            .update({ title, updated_at: new Date().toISOString() })
            .eq('id', id)
        return { error }
    }
}

export async function deleteAiResponse(id: string): Promise<{ error: unknown }> {
    if (isLocalProjectId(id)) {
        try {
            // For local, we just delete it (soft delete not strictly required for local AI feedback yet but we could implement it if needed)
            // But let's stay consistent and just delete it for now as recovery tab isn't wired for local AI responses yet.
            await deleteLocalRecord(LOCAL_STORE_NAMES.aiResponses, id)
            return { error: null }
        } catch (err) {
            return { error: err }
        }
    } else {
        const supabase = createClient()
        await softDeleteEntity(supabase, 'ai_responses', id)
        return { error: null }
    }
}
