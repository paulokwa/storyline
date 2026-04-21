import { cache } from 'react'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from './server'
import { getUserWithTimeout } from './auth-timeout'

export const getVerifiedUser = cache(async (): Promise<User | null> => {
    const supabase = await createClient()
    const { user, error, timedOut } = await getUserWithTimeout(supabase)

    if (error) {
        const isMissingSession = error.name === 'AuthSessionMissingError'
        if (!isMissingSession) {
            console.error(timedOut ? 'Supabase auth timed out while verifying user:' : 'Failed to verify auth user:', error)
        }
        return null
    }

    return user
})

export async function requireVerifiedUser(): Promise<User> {
    const user = await getVerifiedUser()

    if (!user) {
        redirect('/login')
    }

    return user
}
