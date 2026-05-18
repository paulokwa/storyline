import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsView from '@/components/app/SettingsView'
import { maskApiKey, DEFAULT_OPENROUTER_MODEL } from '@/lib/ai/providers'
import { getAiRuntimeState } from '@/lib/ai/runtime'

export default async function SettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')
    const runtime = await getAiRuntimeState(supabase, user.id)

    const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, bio')
        .eq('id', user.id)
        .maybeSingle()
        
    const maskedApiKey = maskApiKey(runtime.aiSettings?.api_key)
    const maskedGeminiKey = maskApiKey(runtime.aiSettings?.gemini_api_key ?? runtime.aiSettings?.api_key)
    const maskedOpenaiKey = maskApiKey(runtime.aiSettings?.openai_api_key)
    const maskedOpenrouterKey = maskApiKey(runtime.aiSettings?.openrouter_api_key)
    const maskedFallbackApiKey = maskApiKey(runtime.aiSettings?.fallback_api_key)

    return (
        <div className="settings-page-shell flex-1 overflow-y-auto min-h-0 bg-slate-50/50">
            <SettingsView 
                user={user} 
                profile={{
                    display_name: profile?.display_name ?? null,
                    avatar_url: profile?.avatar_url ?? null,
                    bio: profile?.bio ?? null,
                }}
                maskedApiKey={maskedApiKey}
                maskedGeminiKey={maskedGeminiKey}
                maskedOpenaiKey={maskedOpenaiKey}
                maskedOpenrouterKey={maskedOpenrouterKey}
                maskedFallbackApiKey={maskedFallbackApiKey}
                aiSettings={{
                    ai_enabled: runtime.aiSettings?.ai_enabled ?? false,
                    billing_mode: runtime.aiSettings?.billing_mode ?? 'app_managed_trial',
                    ai_provider: runtime.aiSettings?.ai_provider ?? 'gemini',
                    ai_context_mode: runtime.contextMode,
                    ai_fallback_enabled: runtime.aiSettings?.ai_fallback_enabled ?? false,
                    ai_fallback_provider: runtime.aiSettings?.ai_fallback_provider ?? null,
                    ollama_model: runtime.aiSettings?.ollama_model ?? 'llama3',
                    ollama_url: runtime.aiSettings?.ollama_url ?? 'http://127.0.0.1:11434',
                    openrouter_model: runtime.aiSettings?.openrouter_model ?? DEFAULT_OPENROUTER_MODEL,
                    trial: runtime.trialAccount,
                }} 
            />
        </div>
    )
}
