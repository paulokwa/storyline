'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function TouchProject({ id }: { id: string }) {
    useEffect(() => {
        const supabase = createClient()
        void supabase.rpc('touch_project', { p_id: id }).then(({ error }) => {
            if (error) console.error('Failed to update last_accessed_at:', error)
        })
    }, [id])
    return null
}
