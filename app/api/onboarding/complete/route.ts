import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type CompleteOnboardingBody = {
    preferredStorageMode?: 'local' | 'cloud'
}

export async function POST(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({})) as CompleteOnboardingBody
    const preferredStorageMode = body.preferredStorageMode === 'cloud' ? 'cloud' : 'local'

    const { error } = await supabase
        .from('profiles')
        .update({
            onboarding_completed: true,
            preferred_storage_mode: preferredStorageMode,
        })
        .eq('id', user.id)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
}
