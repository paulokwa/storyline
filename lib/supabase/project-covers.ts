'use client'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export async function uploadProjectCover(
    supabase: SupabaseClient<Database>,
    userId: string,
    file: File
) {
    const fileExt = file.name.split('.').pop() || 'png'
    const filePath = `${userId}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
        .from('project-covers')
        .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
        .from('project-covers')
        .getPublicUrl(filePath)

    return {
        filePath,
        publicUrl,
    }
}

export function isTemporaryCoverUrl(url: string | null | undefined) {
    return typeof url === 'string' && url.startsWith('blob:')
}
