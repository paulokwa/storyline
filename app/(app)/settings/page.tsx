import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsView from '@/components/app/SettingsView'

export default async function SettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: keyRecord } = (await supabase
        .from('user_api_keys')
        .select('api_key')
        .eq('user_id', user.id)
        .single()) as { data: { api_key: string } | null }
        
    let maskedApiKey: string | null = null
    if (keyRecord?.api_key) {
        const raw = keyRecord.api_key
        maskedApiKey = raw.length > 8 ? `sk-••••••••••••${raw.slice(-4)}` : 'sk-••••'
    }

    return <SettingsView user={user} maskedApiKey={maskedApiKey} />
}
