import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBillingModeLabel, type BillingMode } from '@/lib/ai/modes'
import { logAiModeChange } from '@/lib/ai/trial'

type PreferencesBody = {
    aiEnabled?: boolean
    billingMode?: BillingMode
    aiProvider?: 'openai' | 'gemini' | 'ollama'
    aiFallbackEnabled?: boolean
    ollamaModel?: string
    ollamaUrl?: string
    apiKey?: string
    removeApiKey?: boolean
}

export async function POST(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: PreferencesBody
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    const { data: currentSettings } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

    const { data: trialAccount } = await supabase
        .from('ai_trial_accounts')
        .select('raw_email, normalized_email, email_domain')
        .eq('user_id', user.id)
        .maybeSingle()

    const nextBillingMode = body.billingMode ?? (currentSettings?.billing_mode as BillingMode | null) ?? 'app_managed_trial'

    let nextProvider = body.aiProvider ?? (currentSettings?.ai_provider as 'openai' | 'gemini' | 'ollama' | null) ?? 'openai'
    if (nextBillingMode === 'app_managed_trial') nextProvider = 'openai'
    if (nextBillingMode === 'ollama') nextProvider = 'ollama'

    const currentApiKey = currentSettings?.api_key ?? null
    let nextApiKey = currentApiKey

    if (body.removeApiKey) {
        nextApiKey = null
    } else if (body.apiKey?.trim()) {
        nextApiKey = body.apiKey.trim()
    }

    if (nextBillingMode === 'byok' && !nextApiKey) {
        return NextResponse.json({ error: 'Please save an API key before switching to BYOK mode.' }, { status: 400 })
    }

    const payload = {
        user_id: user.id,
        ai_enabled: body.aiEnabled ?? currentSettings?.ai_enabled ?? true,
        billing_mode: nextBillingMode,
        ai_provider: nextProvider,
        ai_fallback_enabled: body.aiFallbackEnabled ?? currentSettings?.ai_fallback_enabled ?? false,
        ollama_model: body.ollamaModel?.trim() || currentSettings?.ollama_model || 'llama3',
        ollama_url: body.ollamaUrl?.trim() || currentSettings?.ollama_url || 'http://127.0.0.1:11434',
        api_key: nextApiKey,
    }

    const { error } = await (supabase as any)
        .from('user_api_keys')
        .upsert(payload, { onConflict: 'user_id' })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const modeChanged =
        currentSettings?.billing_mode !== payload.billing_mode ||
        currentSettings?.ai_provider !== payload.ai_provider

    if (modeChanged) {
        await logAiModeChange({
            userId: user.id,
            rawEmail: trialAccount?.raw_email ?? user.email ?? null,
            normalizedEmail: trialAccount?.normalized_email ?? null,
            emailDomain: trialAccount?.email_domain ?? null,
            billingMode: payload.billing_mode,
            provider: payload.ai_provider,
            metadata: {
                previousBillingMode: currentSettings?.billing_mode ?? null,
                previousProvider: currentSettings?.ai_provider ?? null,
                nextBillingModeLabel: getBillingModeLabel(payload.billing_mode),
            },
        })
    }

    return NextResponse.json({
        ok: true,
        settings: {
            ai_enabled: payload.ai_enabled,
            billing_mode: payload.billing_mode,
            ai_provider: payload.ai_provider,
            ai_fallback_enabled: payload.ai_fallback_enabled,
            ollama_model: payload.ollama_model,
            ollama_url: payload.ollama_url,
        },
    })
}
