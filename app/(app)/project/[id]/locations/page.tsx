import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LocationsTab from '@/components/project/locations/LocationsTab'

export default async function LocationsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [{ data: locations }, { data: projectData }] = await Promise.all([
        supabase.from('locations').select('*').eq('project_id', id).is('deleted_at', null).order('order_index', { ascending: true }),
        supabase.from('projects').select('type').eq('id', id).single()
    ])

    return <LocationsTab projectId={id} locations={locations || []} />
}
