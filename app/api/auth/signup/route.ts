import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { getURL } from '@/lib/utils/url'
import { getRequestContext } from '@/lib/server/request-context'

type SignupBody = {
    displayName?: string
    email?: string
    password?: string
    deviceFingerprint?: string | null
}

export async function POST(request: Request) {
    let body: SignupBody

    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    const displayName = body.displayName?.trim() ?? ''
    const email = body.email?.trim().toLowerCase() ?? ''
    const password = body.password ?? ''
    const context = getRequestContext(request, body.deviceFingerprint)

    if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }

    if (password.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const response = NextResponse.next()

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
                    response.cookies.set({ name, value, ...options })
                },
                remove(name: string, options: CookieOptions) {
                    cookieStore.delete({ name, ...options })
                    response.cookies.delete({ name, ...options })
                },
            },
        }
    )

    const signupAttempt = await supabase.rpc('record_signup_attempt_signal', {
        p_raw_email: email,
        p_ip_address: context.ipAddress,
        p_device_fingerprint: context.deviceFingerprint,
        p_user_agent: context.userAgent,
        p_accept_language: context.acceptLanguage,
    })

    if (signupAttempt.error) {
        return NextResponse.json({ error: 'Unable to verify signup safety right now.' }, { status: 503 })
    }

    const attemptData = signupAttempt.data as { allowed?: boolean } | null
    if (attemptData?.allowed === false) {
        return NextResponse.json(
            { error: 'Too many recent signup attempts from this network or device. Please try again later.' },
            { status: 429 }
        )
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { display_name: displayName },
            emailRedirectTo: `${getURL()}api/auth/callback?intent=signup&next=/library`,
        },
    })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (data.user?.id) {
        await supabase.rpc('evaluate_and_grant_ai_trial', {
            p_user_id: data.user.id,
            p_raw_email: email,
            p_ip_address: context.ipAddress,
            p_device_fingerprint: context.deviceFingerprint,
            p_user_agent: context.userAgent,
            p_accept_language: context.acceptLanguage,
        })
    }

    return NextResponse.json({
        ok: true,
        verificationRequired: !data.session,
        email,
    })
}
