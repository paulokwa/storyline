import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { AiContextMode, BillingMode } from '@/lib/ai/modes'
import { resolveAiContextModeFromSettings, resolveBillingModeFromSettings } from '@/lib/ai/modes'
import { APP_MANAGED_OPENAI_MODEL } from '@/lib/ai/trial'
import { getAppManagedOpenAiApiKey } from '@/lib/ai/trial-server'
import { DEFAULT_GEMINI_MODEL, DEFAULT_OPENROUTER_MODEL, OPENROUTER_CURATED_MODEL_IDS } from '@/lib/ai/providers'

export type AiRuntimeState = {
    aiSettings: Database['public']['Tables']['user_api_keys']['Row'] | null
    trialAccount: Database['public']['Tables']['ai_trial_accounts']['Row'] | null
    billingMode: BillingMode
    contextMode: AiContextMode
    provider: 'openai' | 'gemini' | 'openrouter' | 'ollama'
    model: string
    apiKey: string | null
}

export async function getAiRuntimeState(
    supabase: SupabaseClient<Database>,
    userId: string
): Promise<AiRuntimeState> {
    const [{ data: aiSettings }, { data: initialTrialAccount }] = await Promise.all([
        supabase
            .from('user_api_keys')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle(),
        supabase
            .from('ai_trial_accounts')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle(),
    ])

    const billingMode = resolveBillingModeFromSettings(aiSettings)
    const contextMode = resolveAiContextModeFromSettings(aiSettings)
    let trialAccount = initialTrialAccount ?? null

    if (
        billingMode === 'app_managed_trial' &&
        trialAccount &&
        (trialAccount.status === 'exhausted' || trialAccount.reserved_micros > 0)
    ) {
        const { error } = await supabase.rpc('reconcile_ai_trial_account', {
            p_user_id: userId,
        })

        if (!error) {
            const { data: refreshedTrialAccount } = await supabase
                .from('ai_trial_accounts')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle()

            trialAccount = refreshedTrialAccount ?? null
        }
    }

    const provider =
        billingMode === 'app_managed_trial'
            ? 'openai'
            : aiSettings?.ai_provider === 'gemini' || aiSettings?.ai_provider === 'ollama' || aiSettings?.ai_provider === 'openrouter'
                ? aiSettings.ai_provider
                : 'openai'

    const apiKey =
        billingMode === 'app_managed_trial'
            ? getAppManagedOpenAiApiKey()
            : aiSettings?.api_key ?? null

    const storedOpenrouterModel = aiSettings?.openrouter_model ?? null
    const model =
        provider === 'gemini'
            ? DEFAULT_GEMINI_MODEL
            : provider === 'openrouter'
                // Only use the stored model if it's still in the curated list — protects against
                // retired OpenRouter model IDs (e.g. :free variants that were removed) causing 404s.
                ? (storedOpenrouterModel && OPENROUTER_CURATED_MODEL_IDS.has(storedOpenrouterModel)
                    ? storedOpenrouterModel
                    : DEFAULT_OPENROUTER_MODEL)
                : APP_MANAGED_OPENAI_MODEL

    return {
        aiSettings: aiSettings ?? null,
        trialAccount,
        billingMode,
        contextMode,
        provider,
        model,
        apiKey,
    }
}
