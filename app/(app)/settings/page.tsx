import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsView from '@/components/app/SettingsView'

export default async function SettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: aiSettings } = (await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', user.id)
        .single()) as { data: any | null }
        
    let maskedApiKey: string | null = null
    if (aiSettings?.api_key) {
        const raw = aiSettings.api_key
        maskedApiKey = raw.length > 8 ? `sk-••••••••••••${raw.slice(-4)}` : 'sk-••••'
    }

    return <SettingsView 
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
}
