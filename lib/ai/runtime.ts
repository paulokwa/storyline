import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { BillingMode } from '@/lib/ai/modes'
import { resolveBillingModeFromSettings } from '@/lib/ai/modes'
import { APP_MANAGED_OPENAI_MODEL } from '@/lib/ai/trial'
import { getAppManagedOpenAiApiKey } from '@/lib/ai/trial-server'
import { DEFAULT_GEMINI_MODEL } from '@/lib/ai/providers'

export type AiRuntimeState = {
    aiSettings: Database['public']['Tables']['user_api_keys']['Row'] | null
    trialAccount: Database['public']['Tables']['ai_trial_accounts']['Row'] | null
    billingMode: BillingMode
    provider: 'openai' | 'gemini' | 'ollama'
    model: string
    apiKey: string | null
}

export async function getAiRuntimeState(
    supabase: SupabaseClient<Database>,
    userId: string
): Promise<AiRuntimeState> {
    const [{ data: aiSettings }, { data: trialAccount }] = await Promise.all([
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
    const provider =
        billingMode === 'app_managed_trial'
            ? 'openai'
            : aiSettings?.ai_provider === 'gemini' || aiSettings?.ai_provider === 'ollama'
                ? aiSettings.ai_provider
                : 'openai'

    const apiKey =
        billingMode === 'app_managed_trial'
            ? getAppManagedOpenAiApiKey()
            : aiSettings?.api_key ?? null

    return {
        aiSettings: aiSettings ?? null,
        trialAccount: trialAccount ?? null,
        billingMode,
        provider,
        model: provider === 'gemini' ? DEFAULT_GEMINI_MODEL : APP_MANAGED_OPENAI_MODEL,
        apiKey,
    }
}
