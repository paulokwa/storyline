import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import IdeasTab from '@/components/project/ideas/IdeasTab'

export default async function IdeasPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Data fetching removed for Phase 1 alignment
    return <IdeasTab projectId={id} />
}
