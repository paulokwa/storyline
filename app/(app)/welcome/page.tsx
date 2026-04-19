import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FirstRunAiSetup from '@/components/app/FirstRunAiSetup'

type WelcomePageProps = {
    searchParams: Promise<{ preview?: string | string[] }>
}

export default async function WelcomePage({ searchParams }: WelcomePageProps) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const resolvedSearchParams = await searchParams
    const previewParam = resolvedSearchParams.preview
    const previewValue = Array.isArray(previewParam) ? previewParam[0] : previewParam
    const isPreviewMode = process.env.NODE_ENV === 'development' && previewValue === '1'

    const [{ data: profile }, { data: aiSettings }, { data: trialAccount }] = await Promise.all([
        supabase
            .from('profiles')
            .select('display_name, ai_onboarding_completed')
            .eq('id', user.id)
            .maybeSingle(),
        supabase
            .from('user_api_keys')
            .select('ai_enabled, billing_mode, ai_provider, ollama_model, ollama_url')
            .eq('user_id', user.id)
            .maybeSingle(),
        supabase
            .from('ai_trial_accounts')
            .select('status')
            .eq('user_id', user.id)
            .maybeSingle(),
    ])

    if (profile?.ai_onboarding_completed && !isPreviewMode) {
        redirect('/library')
    }

    return (
        <div className="flex min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,#eef4ed_0%,#f5f4ef_35%,#fbf9f5_100%)]">
            <FirstRunAiSetup
                displayName={profile?.display_name ?? ''}
                initialAiSettings={{
                    ai_enabled: aiSettings?.ai_enabled ?? true,
                    billing_mode: aiSettings?.billing_mode ?? 'app_managed_trial',
                    ai_provider: aiSettings?.ai_provider ?? 'openai',
                    ollama_model: aiSettings?.ollama_model ?? 'llama3',
                    ollama_url: aiSettings?.ollama_url ?? 'http://127.0.0.1:11434',
                }}
                trialStatus={trialAccount?.status ?? 'active'}
            />
        </div>
    )
}
