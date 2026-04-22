import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRequestContext } from '@/lib/server/request-context'
import { getAiRuntimeState } from '@/lib/ai/runtime'
import { logUsageEvent } from '@/lib/ai/trial-server'

export async function POST(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null) as {
        requestId?: string
        endpoint?: 'ai_helper'
        status?: 'completed' | 'failed'
        inputChars?: number
        outputChars?: number
        errorCode?: string | null
        deviceFingerprint?: string | null
    } | null

    if (!body?.requestId || !body?.endpoint || !body?.status) {
        return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
    }

    const runtime = await getAiRuntimeState(supabase, user.id)
    const context = getRequestContext(request, body.deviceFingerprint)

    await logUsageEvent({
        userId: user.id,
        requestKey: body.requestId,
        endpoint: body.endpoint,
        billingMode: 'ollama',
        provider: 'ollama',
        model: runtime.aiSettings?.ollama_model ?? 'llama3',
        status: body.status,
        inputChars: body.inputChars ?? 0,
        outputChars: body.outputChars ?? 0,
        errorCode: body.errorCode ?? null,
        httpStatus: body.errorCode === 'cancelled' ? 499 : (body.status === 'completed' ? 200 : 502),
        ipAddress: context.ipAddress,
        deviceFingerprint: context.deviceFingerprint,
        normalizedEmail: runtime.trialAccount?.normalized_email ?? null,
        userAgent: context.userAgent,
        metadata: { source: 'local_ollama_client' },
    })

    return NextResponse.json({ ok: true })
}
