import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SavedResponsesTab from '@/components/project/SavedResponsesTab'

export default async function ArchivePage({ params }: { params: Promise<{ id: string }> }) {
    const { id: rawId } = await params
    const id = decodeURIComponent(rawId)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')



    return <SavedResponsesTab projectId={id} />
}
