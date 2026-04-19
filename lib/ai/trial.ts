import type { Database } from '@/lib/supabase/types'

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
