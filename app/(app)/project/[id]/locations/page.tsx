import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LocationsTab from '@/components/project/locations/LocationsTab'
import { loadLocationsWorkspaceData } from '@/lib/persistence/project-content'

export default async function LocationsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    const { locations } = await loadLocationsWorkspaceData(supabase, id)

    return <LocationsTab projectId={id} locations={locations} />
}
