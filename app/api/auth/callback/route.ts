import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { type CookieOptions, createServerClient } from '@supabase/ssr'

const INVALID_REFRESH_TOKEN_MESSAGES = ['Invalid Refresh Token', 'Refresh Token Not Found']

function getSafeNext(next: string | null) {
    if (!next || !next.startsWith('/') || next.startsWith('//')) {
        return '/library'
    }

    return next
}

function getVerificationStatus(errorMessage: string) {
    const normalizedMessage = errorMessage.toLowerCase()

    if (normalizedMessage.includes('expired') || normalizedMessage.includes('invalid')) {
        return 'already-used'
    }

    return 'failed'
}

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = getSafeNext(searchParams.get('next'))
    const intent = searchParams.get('intent')

    if (code) {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        cookieStore.set({ name, value, ...options })
                    },
                    remove(name: string, options: CookieOptions) {
                        cookieStore.delete({ name, ...options })
                    },
                },
            }
        )

        const { data: currentUserData, error: currentUserError } = await supabase.auth.getUser()
        const hadActiveSession = Boolean(currentUserData.user)

        if (currentUserError && INVALID_REFRESH_TOKEN_MESSAGES.some((message) => currentUserError.message.includes(message))) {
            await supabase.auth.signOut({ scope: 'local' })
        }

        // Exchange the verification code for a secure session cookie
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            return NextResponse.redirect(`${origin}${next}`)
        }

        if (intent === 'signup') {
            if (hadActiveSession) {
                await supabase.auth.signOut({ scope: 'local' })
            }

            return NextResponse.redirect(
                `${origin}/login?verification=${getVerificationStatus(error.message)}`
            )
        }
    }

    // If there's no code or the exchange failed, redirect to login
    return NextResponse.redirect(`${origin}/login?error=Invalid_Or_Expired_Token`)
}
