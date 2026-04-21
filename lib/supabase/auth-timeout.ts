import type { User } from '@supabase/supabase-js'

type SupabaseAuthClient = {
    auth: {
        getUser: () => Promise<{ data: { user: User | null }, error: Error | null }>
    }
}

const DEFAULT_AUTH_TIMEOUT_MS = 4000

export async function getUserWithTimeout(
    supabase: SupabaseAuthClient,
    timeoutMs = DEFAULT_AUTH_TIMEOUT_MS
): Promise<{ user: User | null; error: Error | null; timedOut: boolean }> {
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    try {
        const result = await Promise.race([
            supabase.auth.getUser().then(({ data, error }) => ({
                user: data.user,
                error,
                timedOut: false,
            })),
            new Promise<{ user: null; error: Error; timedOut: true }>((resolve) => {
                timeoutId = setTimeout(() => {
                    resolve({
                        user: null,
                        error: new Error(`Supabase auth timed out after ${timeoutMs}ms`),
                        timedOut: true,
                    })
                }, timeoutMs)
            }),
        ])

        return result
    } finally {
        if (timeoutId) clearTimeout(timeoutId)
    }
}
