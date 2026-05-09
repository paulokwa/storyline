import 'server-only'

import type { BillingMode } from '@/lib/ai/modes'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/lib/supabase/types'

export type TrialEndpoint = 'ai_helper' | 'analyze_scene' | 'import_ai_detect'

export function getAppManagedOpenAiApiKey() {
    return process.env.APP_MANAGED_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY ?? null
}

export async function logAiModeChange(params: {
    userId: string
    rawEmail?: string | null
    normalizedEmail?: string | null
    emailDomain?: string | null
    billingMode: BillingMode
    provider: 'openai' | 'gemini' | 'openrouter' | 'ollama'
    metadata?: Record<string, unknown>
}) {
    const admin = createAdminClient()
    if (!admin) return

    await admin.from('ai_abuse_signals').insert({
        user_id: params.userId,
        signal_type: 'mode_change',
        raw_email: params.rawEmail ?? null,
        normalized_email: params.normalizedEmail ?? null,
        email_domain: params.emailDomain ?? null,
        billing_mode: params.billingMode,
        provider: params.provider,
        risk_score: 0,
        risk_flags: [],
        metadata: (params.metadata ?? {}) as Json,
    })
}

export async function logUsageEvent(params: {
    userId: string
    requestKey: string
    endpoint: TrialEndpoint
    billingMode: BillingMode
    provider: 'openai' | 'gemini' | 'openrouter' | 'ollama'
    model?: string | null
    status: 'completed' | 'failed' | 'blocked' | 'bypassed'
    inputChars?: number
    outputChars?: number
    errorCode?: string | null
    httpStatus?: number | null
    ipAddress?: string | null
    deviceFingerprint?: string | null
    normalizedEmail?: string | null
    userAgent?: string | null
    metadata?: Record<string, unknown>
}) {
    const admin = createAdminClient()
    if (!admin) return

    const now = new Date().toISOString()

    const { error } = await admin.from('ai_usage_events').upsert({
        user_id: params.userId,
        request_key: params.requestKey,
        endpoint: params.endpoint,
        billing_mode: params.billingMode,
        provider: params.provider,
        model: params.model ?? null,
        status: params.status,
        input_chars: params.inputChars ?? 0,
        output_chars: params.outputChars ?? 0,
        error_code: params.errorCode ?? null,
        http_status: params.httpStatus ?? null,
        ip_address: params.ipAddress ?? null,
        device_fingerprint: params.deviceFingerprint ?? null,
        normalized_email: params.normalizedEmail ?? null,
        user_agent: params.userAgent ?? null,
        metadata: (params.metadata ?? {}) as Json,
        completed_at: params.status === 'completed' || params.status === 'failed' || params.status === 'blocked'
            ? now
            : null,
    }, {
        onConflict: 'request_key',
    })
    if (error) console.error('[logUsageEvent] failed:', error.code, error.message)
}
