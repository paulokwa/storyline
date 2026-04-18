import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsView from '@/components/app/SettingsView'
import { maskApiKey } from '@/lib/ai/providers'

export default async function SettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: aiSettings } = (await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', user.id)
        .single()) as { data: any | null }
        
    const maskedApiKey = maskApiKey(aiSettings?.api_key)

    return (
        <div className="settings-page-shell flex-1 overflow-y-auto min-h-0 bg-slate-50/50">
            <SettingsView 
                user={user} 
                maskedApiKey={maskedApiKey} 
                aiSettings={{
                    ai_enabled: aiSettings?.ai_enabled ?? true,
                    ai_provider: aiSettings?.ai_provider ?? 'gemini',
                    ai_fallback_enabled: aiSettings?.ai_fallback_enabled ?? false,
                    ollama_model: aiSettings?.ollama_model ?? 'llama3',
                    ollama_url: aiSettings?.ollama_url ?? 'http://127.0.0.1:11434'
                }} 
            />
        </div>
    )
}
