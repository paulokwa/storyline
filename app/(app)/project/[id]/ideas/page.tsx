import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import IdeasTab from '@/components/project/ideas/IdeasTab'
import { loadIdeasWorkspaceData } from '@/lib/persistence/project-content'

export default async function IdeasPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    const { ideas } = await loadIdeasWorkspaceData(supabase, id)

    return <IdeasTab projectId={id} ideas={ideas} />
}
