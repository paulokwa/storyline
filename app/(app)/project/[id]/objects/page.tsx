import { createClient } from '@/lib/supabase/server'
import LocalObjectsPage from '@/components/project/local/LocalObjectsPage'
import { redirect } from 'next/navigation'
import ObjectsTab from '@/components/project/objects/ObjectsTab'
import { loadObjectsWorkspaceData } from '@/lib/persistence/project-content'
import { isLocalProjectId } from '@/lib/persistence/project-mode'

export default async function ObjectsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (isLocalProjectId(id)) return <LocalObjectsPage projectId={id} />
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    const { objects } = await loadObjectsWorkspaceData(supabase, id)

    return <ObjectsTab projectId={id} objects={objects} />
}
