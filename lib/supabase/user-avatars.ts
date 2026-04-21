'use client'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export async function uploadUserAvatar(
    supabase: SupabaseClient<Database>,
    userId: string,
    file: File
) {
    const fileExt = file.name.split('.').pop() || 'png'
    const filePath = `${userId}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(filePath, file, {
            upsert: false,
        })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(filePath)

    return {
        filePath,
        publicUrl,
    }
}
