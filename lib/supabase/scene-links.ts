import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from './types'

export type Supabase = SupabaseClient<any>

// ==========================================
// CHARACTER LINKS
// ==========================================

export async function getLinkedCharacters(supabase: Supabase, sceneId: string) {
    const { data, error } = await supabase
        .from('scene_characters')
        .select(`
            id,
            scene_id,
            character_id,
            characters (
                *
            )
        `)
        .eq('scene_id', sceneId)
        
    if (error) throw error
    return (data || []).map((d: any) => d.characters)
}

export async function addCharacterLink(supabase: Supabase, sceneId: string, characterId: string) {
    const { data, error } = await supabase
        .from('scene_characters')
        // @ts-ignore - Supabase type inference failure
        .upsert({
            scene_id: sceneId,
            character_id: characterId
        }, { onConflict: 'scene_id,character_id' })
        .select()
        .single()
        
    if (error) throw error
    return data
}

export async function removeCharacterLink(supabase: Supabase, sceneId: string, characterId: string) {
    const { error } = await supabase
        .from('scene_characters')
        .delete()
        .eq('scene_id', sceneId)
        .eq('character_id', characterId)
        
    if (error) throw error
}

// ==========================================
// IDEA LINKS
// ==========================================

export async function getLinkedIdeas(supabase: Supabase, sceneId: string) {
    const { data, error } = await supabase
        .from('scene_ideas')
        .select(`
            id,
            scene_id,
            idea_id,
            ideas (
                *
            )
        `)
        .eq('scene_id', sceneId)
        
    if (error) throw error
    return (data || []).map((d: any) => d.ideas)
}

export async function addIdeaLink(supabase: Supabase, sceneId: string, ideaId: string) {
    const { data, error } = await supabase
        .from('scene_ideas')
        // @ts-ignore - Supabase type inference failure
        .upsert({
            scene_id: sceneId,
            idea_id: ideaId
        }, { onConflict: 'scene_id,idea_id' })
        .select()
        .single()
        
    if (error) throw error
    return data
}

export async function removeIdeaLink(supabase: Supabase, sceneId: string, ideaId: string) {
    const { error } = await supabase
        .from('scene_ideas')
        .delete()
        .eq('scene_id', sceneId)
        .eq('idea_id', ideaId)
        
    if (error) throw error
}
