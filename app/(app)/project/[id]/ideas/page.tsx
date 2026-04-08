import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import IdeasTab from '@/components/project/ideas/IdeasTab'

export default async function IdeasPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: ideas } = await supabase
        .from('ideas')
        .select('*')
        .eq('project_id', id)
        .is('deleted_at', null)
        .order('order_index', { ascending: true })

    return <IdeasTab projectId={id} ideas={ideas ?? []} />
}
