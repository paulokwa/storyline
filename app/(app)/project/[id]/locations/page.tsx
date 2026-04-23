import { createClient } from '@/lib/supabase/server'
import LocalLocationsPage from '@/components/project/local/LocalLocationsPage'
import { redirect } from 'next/navigation'
import LocationsTab from '@/components/project/locations/LocationsTab'
import { loadLocationsWorkspaceData } from '@/lib/persistence/project-content'
import { isLocalProjectId } from '@/lib/persistence/project-mode'

export default async function LocationsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (isLocalProjectId(id)) return <LocalLocationsPage projectId={id} />
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    const { locations } = await loadLocationsWorkspaceData(supabase, id)

    return <LocationsTab projectId={id} locations={locations} />
}
