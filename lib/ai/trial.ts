import 'server-only'

import type { Database } from '@/lib/supabase/types'
import type { BillingMode } from '@/lib/ai/modes'
import { createAdminClient } from '@/lib/supabase/admin'

export const APP_MANAGED_OPENAI_MODEL = 'gpt-4.1-mini'
export const TRIAL_BUDGET_MICROS = 2_000_000
export const LOW_BALANCE_MICROS = 250_000

type TrialEndpoint = 'ai_helper' | 'analyze_scene' | 'import_ai_detect'

type EndpointCostProfile = {
    inputMicrosPer1kTokens: number
    outputMicrosPer1kTokens: number
    minMicros: number
    maxOutputTokens: number
}

const ENDPOINT_COST_PROFILES: Record<TrialEndpoint, EndpointCostProfile> = {
    ai_helper: {
        inputMicrosPer1kTokens: 3_000,
        outputMicrosPer1kTokens: 12_000,
        minMicros: 25_000,
        maxOutputTokens: 1_000,
    },
    analyze_scene: {
        inputMicrosPer1kTokens: 2_500,
        outputMicrosPer1kTokens: 9_000,
        minMicros: 18_000,
        maxOutputTokens: 1_200,
    },
    import_ai_detect: {
        inputMicrosPer1kTokens: 15_000,
        outputMicrosPer1kTokens: 30_000,
        minMicros: 250_000,
        maxOutputTokens: 4_096,
    },
}

export type TrialAccountRow = Database['public']['Tables']['ai_trial_accounts']['Row']
export type UserAiSettingsRow = Database['public']['Tables']['user_api_keys']['Row']

export function estimateTokensFromChars(text: string | number | null | undefined) {
    if (!text) return 0
    const length = typeof text === 'number' ? text : text.length
    return Math.ceil(length / 4)
}

export function formatMicrosAsUsd(micros: number | null | undefined) {
    const safe = Math.max(micros ?? 0, 0)
    return (safe / 1_000_000).toFixed(2)
}

export function isLowTrialBalance(remainingMicros: number | null | undefined) {
    return (remainingMicros ?? 0) > 0 && (remainingMicros ?? 0) <= LOW_BALANCE_MICROS
}

export function estimateTrialReserveMicros(params: {
    endpoint: TrialEndpoint
    inputChars: number
    outputChars?: number
    outputTokensCap?: number
}) {
    const profile = ENDPOINT_COST_PROFILES[params.endpoint]
    const inputTokens = estimateTokensFromChars(params.inputChars)
    const outputTokens =
        typeof params.outputChars === 'number'
            ? estimateTokensFromChars(params.outputChars)
            : (params.outputTokensCap ?? profile.maxOutputTokens)

    const inputMicros = Math.ceil(inputTokens / 1000) * profile.inputMicrosPer1kTokens
    const outputMicros = Math.ceil(outputTokens / 1000) * profile.outputMicrosPer1kTokens

    return Math.max(profile.minMicros, inputMicros + outputMicros)
}

export function getAppManagedOpenAiApiKey() {
    return process.env.OPENAI_API_KEY ?? null
}

export function getTrialStatusMessage(account: TrialAccountRow | null | undefined) {
    if (!account) {
        return 'Free Trial AI is unavailable right now.'
    }

    switch (account.status) {
        case 'active':
            return 'Free Trial AI is active.'
        case 'exhausted':
            return 'Your sponsored AI trial has been used up.'
        case 'blocked':
            return 'Free Trial AI is currently blocked for this account.'
        case 'abuse_review':
            return 'Free Trial AI is under review right now.'
        case 'disabled':
            return 'Free Trial AI is not enabled for this account.'
        default:
            return 'Free Trial AI is unavailable right now.'
    }
}

export async function logAiModeChange(params: {
    userId: string
    rawEmail?: string | null
    normalizedEmail?: string | null
    emailDomain?: string | null
    billingMode: BillingMode
    provider: 'openai' | 'gemini' | 'ollama'
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
        metadata: params.metadata ?? {},
    })
}

export async function logUsageEvent(params: {
    userId: string
    requestKey: string
    endpoint: TrialEndpoint
    billingMode: BillingMode
    provider: 'openai' | 'gemini' | 'ollama'
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

    await admin.from('ai_usage_events').upsert({
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
        metadata: params.metadata ?? {},
        completed_at: params.status === 'completed' || params.status === 'failed' || params.status === 'blocked'
            ? now
            : null,
    }, {
        onConflict: 'request_key',
    })
}
