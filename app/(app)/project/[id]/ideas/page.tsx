import { createClient } from '@/lib/supabase/server'
import LocalIdeasPage from '@/components/project/local/LocalIdeasPage'
import { redirect } from 'next/navigation'
import IdeasTab from '@/components/project/ideas/IdeasTab'
import { loadIdeasWorkspaceData } from '@/lib/persistence/project-content'
import { isLocalProjectId } from '@/lib/persistence/project-mode'

export default async function IdeasPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (isLocalProjectId(id)) return <LocalIdeasPage projectId={id} />
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    const { ideas } = await loadIdeasWorkspaceData(supabase, id)

    return <IdeasTab projectId={id} ideas={ideas} />
}
