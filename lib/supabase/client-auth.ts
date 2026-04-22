import type { User, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

const INVALID_REFRESH_TOKEN_MESSAGES = [
    'Invalid Refresh Token',
    'Refresh Token Not Found',
]

function isMissingSessionError(error: unknown): error is Error {
    return error instanceof Error && error.name === 'AuthSessionMissingError'
}

function isInvalidRefreshTokenError(error: unknown): error is Error {
    if (!(error instanceof Error)) return false

    return INVALID_REFRESH_TOKEN_MESSAGES.some((message) => error.message.includes(message))
}

export async function getUserSafely(
    supabase: SupabaseClient<Database>
): Promise<{ user: User | null; hadInvalidRefreshToken: boolean }> {
    const { data, error } = await supabase.auth.getUser()

    if (!error) {
        return {
            user: data.user,
            hadInvalidRefreshToken: false,
        }
    }

    if (isMissingSessionError(error)) {
        return {
            user: null,
            hadInvalidRefreshToken: false,
        }
    }

    if (isInvalidRefreshTokenError(error)) {
        const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })

        if (
            signOutError &&
            !isInvalidRefreshTokenError(signOutError) &&
            !isMissingSessionError(signOutError)
        ) {
            console.error('Failed to clear invalid browser auth session:', signOutError)
        }

        return {
            user: null,
            hadInvalidRefreshToken: true,
        }
    }

    throw error
}
