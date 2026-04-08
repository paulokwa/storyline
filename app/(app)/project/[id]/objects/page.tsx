import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ObjectsTab from '@/components/project/objects/ObjectsTab'

export default async function ObjectsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [{ data: objects }, { data: projectData }] = await Promise.all([
        supabase.from('objects').select('*').eq('project_id', id).is('deleted_at', null).order('order_index', { ascending: true }),
        supabase.from('projects').select('type').eq('id', id).single()
    ])

    return <ObjectsTab projectId={id} objects={objects || []} />
}
