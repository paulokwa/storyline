import { cache } from 'react'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from './server'
import { getUserWithTimeout } from './auth-timeout'

const INVALID_REFRESH_TOKEN_MESSAGES = ['Invalid Refresh Token', 'Refresh Token Not Found']

export const getVerifiedUser = cache(async (): Promise<User | null> => {
    const supabase = await createClient()
    const { user, error, timedOut } = await getUserWithTimeout(supabase)

    if (error) {
        const isMissingSession = error.name === 'AuthSessionMissingError'
        const isInvalidRefreshToken = !isMissingSession &&
            INVALID_REFRESH_TOKEN_MESSAGES.some((msg) => error.message.includes(msg))

        if (isInvalidRefreshToken) {
            await supabase.auth.signOut({ scope: 'local' })
            return null
        }

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
