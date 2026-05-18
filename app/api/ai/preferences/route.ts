import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBillingModeLabel, type AiContextMode, type BillingMode } from '@/lib/ai/modes'
import { logAiModeChange } from '@/lib/ai/trial-server'
import { getRequestContext } from '@/lib/server/request-context'
import { createAdminClient } from '@/lib/supabase/admin'
import { DEFAULT_OPENROUTER_MODEL, OPENROUTER_CURATED_MODEL_IDS, maskApiKey } from '@/lib/ai/providers'

type PreferencesBody = {
    aiEnabled?: boolean
    billingMode?: BillingMode
    aiProvider?: 'openai' | 'gemini' | 'openrouter' | 'ollama'
    aiFallbackEnabled?: boolean
    aiFallbackProvider?: 'gemini' | 'openai' | 'openrouter' | null
    aiContextMode?: AiContextMode
    ollamaModel?: string
    ollamaUrl?: string
    openrouterModel?: string
    apiKey?: string
    removeApiKey?: boolean
    fallbackApiKey?: string
    removeFallbackApiKey?: boolean
    // Which provider the apiKey belongs to (for per-provider storage)
    apiKeyProvider?: 'gemini' | 'openai' | 'openrouter'
}

export async function POST(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requestContext = getRequestContext(request)

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

    if (body.aiContextMode && body.aiContextMode !== 'smart' && body.aiContextMode !== 'manual') {
        return NextResponse.json({ error: 'Unsupported AI context mode.' }, { status: 400 })
    }

    const nextContextMode: AiContextMode =
        body.aiContextMode ?? currentSettings?.ai_context_mode ?? 'smart'

    let nextProvider = body.aiProvider ?? (currentSettings?.ai_provider as 'openai' | 'gemini' | 'openrouter' | 'ollama' | null) ?? 'openai'
    if (nextBillingMode === 'app_managed_trial') nextProvider = 'openai'
    if (nextBillingMode === 'ollama') nextProvider = 'ollama'

    // Per-provider key storage — each cloud provider keeps its own key
    const keyProvider = body.apiKeyProvider ?? (nextProvider as 'gemini' | 'openai' | 'openrouter')
    const newKey = body.apiKey?.trim() || null

    const nextGeminiKey = keyProvider === 'gemini'
        ? (body.removeApiKey ? null : (newKey ?? currentSettings?.gemini_api_key ?? null))
        : (currentSettings?.gemini_api_key ?? null)

    const nextOpenaiKey = keyProvider === 'openai'
        ? (body.removeApiKey ? null : (newKey ?? currentSettings?.openai_api_key ?? null))
        : (currentSettings?.openai_api_key ?? null)

    const nextOpenrouterKey = keyProvider === 'openrouter'
        ? (body.removeApiKey ? null : (newKey ?? currentSettings?.openrouter_api_key ?? null))
        : (currentSettings?.openrouter_api_key ?? null)

    // Keep legacy api_key in sync with the active provider's key for any older code paths
    const currentApiKey = currentSettings?.api_key ?? null
    let nextApiKey = currentApiKey
    if (body.removeApiKey) {
        nextApiKey = null
    } else if (newKey) {
        nextApiKey = newKey
    }

    const currentFallbackApiKey = currentSettings?.fallback_api_key ?? null
    let nextFallbackApiKey = currentFallbackApiKey

    if (body.removeFallbackApiKey) {
        nextFallbackApiKey = null
    } else if (body.fallbackApiKey?.trim()) {
        nextFallbackApiKey = body.fallbackApiKey.trim()
    }

    // If the fallback is turned off, clear the stored fallback key too
    if (!body.aiFallbackEnabled && body.aiFallbackEnabled !== undefined) {
        nextFallbackApiKey = null
    }

    if (nextBillingMode === 'byok' && !nextGeminiKey && !nextOpenaiKey && !nextOpenrouterKey) {
        return NextResponse.json({ error: 'Please save at least one API key before switching to BYOK mode.' }, { status: 400 })
    }

    if (nextBillingMode === 'app_managed_trial') {
        const admin = createAdminClient()
        if (!admin) {
            return NextResponse.json(
                { error: 'Free Trial AI needs the server admin connection to be configured before it can enroll accounts.' },
                { status: 503 }
            )
        }

        const { error: trialGrantError } = await admin.rpc('evaluate_and_grant_ai_trial', {
            p_user_id: user.id,
            p_raw_email: trialAccount?.raw_email ?? user.email ?? '',
            p_ip_address: requestContext.ipAddress ?? '',
            p_device_fingerprint: requestContext.deviceFingerprint ?? '',
            p_user_agent: requestContext.userAgent ?? '',
            p_accept_language: requestContext.acceptLanguage ?? '',
        })

        if (trialGrantError) {
            return NextResponse.json(
                { error: 'Unable to verify Free Trial AI for this account right now. Please try again.' },
                { status: 503 }
            )
        }

        const { data: ensuredTrialAccount, error: ensuredTrialAccountError } = await supabase
            .from('ai_trial_accounts')
            .select('status')
            .eq('user_id', user.id)
            .maybeSingle()

        if (ensuredTrialAccountError || !ensuredTrialAccount) {
            return NextResponse.json(
                { error: 'Free Trial AI could not finish setting up this account. Please try again.' },
                { status: 503 }
            )
        }
    }

    const requestedOpenrouterModel = body.openrouterModel?.trim()
    const nextOpenrouterModel =
        requestedOpenrouterModel && OPENROUTER_CURATED_MODEL_IDS.has(requestedOpenrouterModel)
            ? requestedOpenrouterModel
            : currentSettings?.openrouter_model ?? DEFAULT_OPENROUTER_MODEL

    const payload = {
        user_id: user.id,
        ai_enabled: body.aiEnabled ?? currentSettings?.ai_enabled ?? false,
        billing_mode: nextBillingMode,
        ai_provider: nextProvider,
        ai_context_mode: nextContextMode,
        ai_fallback_enabled: body.aiFallbackEnabled ?? currentSettings?.ai_fallback_enabled ?? false,
        ai_fallback_provider: body.aiFallbackProvider ?? currentSettings?.ai_fallback_provider ?? null,
        ollama_model: body.ollamaModel?.trim() || currentSettings?.ollama_model || 'llama3',
        ollama_url: body.ollamaUrl?.trim() || currentSettings?.ollama_url || 'http://127.0.0.1:11434',
        openrouter_model: nextOpenrouterModel,
        api_key: nextApiKey,
        gemini_api_key: nextGeminiKey,
        openai_api_key: nextOpenaiKey,
        openrouter_api_key: nextOpenrouterKey,
        fallback_api_key: nextFallbackApiKey,
    }

    const { error } = await supabase
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
        maskedGeminiKey: maskApiKey(nextGeminiKey),
        maskedOpenaiKey: maskApiKey(nextOpenaiKey),
        maskedOpenrouterKey: maskApiKey(nextOpenrouterKey),
        maskedFallbackApiKey: maskApiKey(nextFallbackApiKey),
        settings: {
            ai_enabled: payload.ai_enabled,
            billing_mode: payload.billing_mode,
            ai_provider: payload.ai_provider,
            ai_context_mode: payload.ai_context_mode,
            ai_fallback_enabled: payload.ai_fallback_enabled,
            ai_fallback_provider: payload.ai_fallback_provider,
            ollama_model: payload.ollama_model,
            ollama_url: payload.ollama_url,
        },
    })
}
