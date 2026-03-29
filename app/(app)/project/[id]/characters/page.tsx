import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CharactersTab from '@/components/project/characters/CharactersTab'

export default async function CharactersPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: characters } = await supabase
        .from('characters')
        .select('*')
        .eq('project_id', id)
        .order('order_index', { ascending: true })

    return <CharactersTab projectId={id} characters={characters || []} />
}
