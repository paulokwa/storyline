import { cache } from 'react'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from './server'

export const getVerifiedUser = cache(async (): Promise<User | null> => {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()

    if (error) {
        console.error('Failed to verify auth user:', error)
        return null
    }

    return data.user
})

export async function requireVerifiedUser(): Promise<User> {
    const user = await getVerifiedUser()

    if (!user) {
        redirect('/login')
    }

    return user
}
