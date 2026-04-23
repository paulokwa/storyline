import { createClient } from '@/lib/supabase/client'
import { softDeleteEntity } from '@/lib/supabase/recovery'
import {
    LOCAL_STORE_NAMES,
    bulkPutLocalRecords,
    getLocalRecord,
    putLocalRecord,
} from '@/lib/persistence/local-db'
import { isLocalProjectId } from '@/lib/persistence/project-mode'
import type { Database } from '@/lib/supabase/types'

export type WritingEntityTable = 'characters' | 'ideas' | 'locations' | 'objects'

type WritingEntityRow<T extends WritingEntityTable> = Database['public']['Tables'][T]['Row']
type WritingEntityInsert<T extends WritingEntityTable> = Database['public']['Tables'][T]['Insert']
type WritingEntityUpdate<T extends WritingEntityTable> = Database['public']['Tables'][T]['Update']

const LOCAL_STORE_BY_TABLE: Record<WritingEntityTable, typeof LOCAL_STORE_NAMES.characters | typeof LOCAL_STORE_NAMES.ideas | typeof LOCAL_STORE_NAMES.locations | typeof LOCAL_STORE_NAMES.objects> = {
    characters: LOCAL_STORE_NAMES.characters,
    ideas: LOCAL_STORE_NAMES.ideas,
    locations: LOCAL_STORE_NAMES.locations,
    objects: LOCAL_STORE_NAMES.objects,
}

export async function updateWritingEntity<T extends WritingEntityTable>(
    table: T,
    id: string,
    updates: WritingEntityUpdate<T>
) {
    if (isLocalProjectId(id)) {
        const storeName = LOCAL_STORE_BY_TABLE[table]
        const existing = await getLocalRecord<WritingEntityRow<T>>(storeName, id)
        if (!existing) throw new Error(`Local ${table} record not found.`)

        const data = {
            ...existing,
            ...updates,
        } as WritingEntityRow<T>

        await putLocalRecord(storeName, data as WritingEntityRow<T> & { id: string })
        return data
    }

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
    if (isLocalProjectId(input.project_id)) {
        const storeName = LOCAL_STORE_BY_TABLE[table]
        const timestamp = new Date().toISOString()
        const localId = `${input.project_id}_${table.slice(0, -1)}_${crypto.randomUUID()}`

        const baseRecord = {
            ...input,
            created_at: timestamp,
            deleted_at: null,
            id: localId,
        }

        let data: WritingEntityRow<T>

        switch (table) {
            case 'characters':
                data = {
                    description: '',
                    name: '',
                    notes: '',
                    order_index: 0,
                    project_id: input.project_id,
                    created_at: timestamp,
                    deleted_at: null,
                    id: localId,
                    ...(baseRecord as object),
                } as unknown as WritingEntityRow<T>
                break
            case 'ideas':
                data = {
                    content: '',
                    order_index: 0,
                    project_id: input.project_id,
                    title: '',
                    created_at: timestamp,
                    deleted_at: null,
                    id: localId,
                    updated_at: timestamp,
                    ...(baseRecord as object),
                } as unknown as WritingEntityRow<T>
                break
            case 'locations':
                data = {
                    atmosphere: '',
                    description: '',
                    name: '',
                    order_index: 0,
                    project_id: input.project_id,
                    created_at: timestamp,
                    deleted_at: null,
                    id: localId,
                    updated_at: timestamp,
                    ...(baseRecord as object),
                } as unknown as WritingEntityRow<T>
                break
            case 'objects':
                data = {
                    description: '',
                    name: '',
                    order_index: 0,
                    project_id: input.project_id,
                    significance: '',
                    created_at: timestamp,
                    deleted_at: null,
                    id: localId,
                    updated_at: timestamp,
                    ...(baseRecord as object),
                } as unknown as WritingEntityRow<T>
                break
        }

        await putLocalRecord(storeName, data as WritingEntityRow<T> & { id: string })
        return data
    }

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
    if (rows.length > 0 && isLocalProjectId(rows[0].id)) {
        await bulkPutLocalRecords(LOCAL_STORE_BY_TABLE[table], rows as Array<WritingEntityRow<T> & { id: string }>)
        return
    }

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
    if (isLocalProjectId(id)) {
        const storeName = LOCAL_STORE_BY_TABLE[table]
        const existing = await getLocalRecord<WritingEntityRow<typeof table>>(storeName, id)
        if (!existing) return
        await putLocalRecord(storeName, {
            ...existing,
            deleted_at: new Date().toISOString(),
        } as WritingEntityRow<typeof table> & { id: string })
        return
    }

    const supabase = createClient()
    await softDeleteEntity(supabase, table, id)
}
