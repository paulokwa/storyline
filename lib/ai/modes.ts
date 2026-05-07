export type BillingMode = 'app_managed_trial' | 'byok' | 'ollama'
export type SupportedAiProvider = 'openai' | 'gemini' | 'ollama'
export type AiContextMode = 'smart' | 'manual'

export function getBillingModeLabel(mode: BillingMode) {
    switch (mode) {
        case 'app_managed_trial':
            return 'Free Trial AI'
        case 'byok':
            return 'Use Your Own Key'
        case 'ollama':
            return 'Ollama / Local AI'
        default:
            return 'AI'
    }
}

export function resolveBillingModeFromSettings(settings: {
    billing_mode?: string | null
    ai_provider?: string | null
    api_key?: string | null
} | null | undefined): BillingMode {
    if (settings?.billing_mode === 'app_managed_trial' || settings?.billing_mode === 'byok' || settings?.billing_mode === 'ollama') {
        return settings.billing_mode
    }

    if (settings?.ai_provider === 'ollama') return 'ollama'
    if (settings?.api_key) return 'byok'
    return 'app_managed_trial'
}

export function resolveAiContextModeFromSettings(settings: {
    ai_context_mode?: string | null
} | null | undefined): AiContextMode {
    return settings?.ai_context_mode === 'smart' ? 'smart' : 'manual'
}
