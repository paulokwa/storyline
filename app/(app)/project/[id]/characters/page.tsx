import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CharactersTab from '@/components/project/characters/CharactersTab'

export default async function CharactersPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Data fetching removed for Phase 1 alignment
    return <CharactersTab projectId={id} />
}
