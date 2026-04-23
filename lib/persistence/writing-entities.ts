import { createClient } from '@/lib/supabase/client'
import { softDeleteEntity } from '@/lib/supabase/recovery'
import type { Database } from '@/lib/supabase/types'

export type WritingEntityTable = 'characters' | 'ideas' | 'locations' | 'objects'

type WritingEntityRow<T extends WritingEntityTable> = Database['public']['Tables'][T]['Row']
type WritingEntityInsert<T extends WritingEntityTable> = Database['public']['Tables'][T]['Insert']
type WritingEntityUpdate<T extends WritingEntityTable> = Database['public']['Tables'][T]['Update']

export async function updateWritingEntity<T extends WritingEntityTable>(
    table: T,
    id: string,
    updates: WritingEntityUpdate<T>
) {
    const supabase = createClient()
    switch (table) {
        case 'characters': {
            const { data, error } = await supabase
                .from('characters')
                .update(updates as Database['public']['Tables']['characters']['Update'])
                .eq('id', id)
                .select()
                .single()
            if (error) throw error
            return data as WritingEntityRow<T>
        }
        case 'ideas': {
            const { data, error } = await supabase
                .from('ideas')
                .update(updates as Database['public']['Tables']['ideas']['Update'])
                .eq('id', id)
                .select()
                .single()
            if (error) throw error
            return data as WritingEntityRow<T>
        }
        case 'locations': {
            const { data, error } = await supabase
                .from('locations')
                .update(updates as Database['public']['Tables']['locations']['Update'])
                .eq('id', id)
                .select()
                .single()
            if (error) throw error
            return data as WritingEntityRow<T>
        }
        case 'objects': {
            const { data, error } = await supabase
                .from('objects')
                .update(updates as Database['public']['Tables']['objects']['Update'])
                .eq('id', id)
                .select()
                .single()
            if (error) throw error
            return data as WritingEntityRow<T>
        }
    }
}

export async function createWritingEntity<T extends WritingEntityTable>(
    table: T,
    input: WritingEntityInsert<T>
) {
    const supabase = createClient()
    switch (table) {
        case 'characters': {
            const { data, error } = await supabase
                .from('characters')
                .insert(input as Database['public']['Tables']['characters']['Insert'])
                .select()
                .single()
            if (error) throw error
            return data as WritingEntityRow<T>
        }
        case 'ideas': {
            const { data, error } = await supabase
                .from('ideas')
                .insert(input as Database['public']['Tables']['ideas']['Insert'])
                .select()
                .single()
            if (error) throw error
            return data as WritingEntityRow<T>
        }
        case 'locations': {
            const { data, error } = await supabase
                .from('locations')
                .insert(input as Database['public']['Tables']['locations']['Insert'])
                .select()
                .single()
            if (error) throw error
            return data as WritingEntityRow<T>
        }
        case 'objects': {
            const { data, error } = await supabase
                .from('objects')
                .insert(input as Database['public']['Tables']['objects']['Insert'])
                .select()
                .single()
            if (error) throw error
            return data as WritingEntityRow<T>
        }
    }
}

export async function reorderWritingEntities<T extends WritingEntityTable>(
    table: T,
    rows: WritingEntityRow<T>[]
) {
    const supabase = createClient()
    switch (table) {
        case 'characters': {
            const { error } = await supabase
                .from('characters')
                .upsert(rows as Database['public']['Tables']['characters']['Row'][])
            if (error) throw error
            return
        }
        case 'ideas': {
            const { error } = await supabase
                .from('ideas')
                .upsert(rows as Database['public']['Tables']['ideas']['Row'][])
            if (error) throw error
            return
        }
        case 'locations': {
            const { error } = await supabase
                .from('locations')
                .upsert(rows as Database['public']['Tables']['locations']['Row'][])
            if (error) throw error
            return
        }
        case 'objects': {
            const { error } = await supabase
                .from('objects')
                .upsert(rows as Database['public']['Tables']['objects']['Row'][])
            if (error) throw error
            return
        }
    }
}

export async function softDeleteWritingEntity(table: WritingEntityTable, id: string) {
    const supabase = createClient()
    await softDeleteEntity(supabase, table, id)
}
