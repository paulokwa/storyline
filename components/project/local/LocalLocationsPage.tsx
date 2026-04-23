'use client'

import { useEffect, useState } from 'react'
import LocationsTab from '@/components/project/locations/LocationsTab'
import { loadLocalLocationsWorkspaceData } from '@/lib/persistence/local-projects'

type LocationsWorkspaceData = Awaited<ReturnType<typeof loadLocalLocationsWorkspaceData>>

export default function LocalLocationsPage({ projectId }: { projectId: string }) {
    const [data, setData] = useState<LocationsWorkspaceData | null>(null)

    useEffect(() => {
        let cancelled = false
        void loadLocalLocationsWorkspaceData(projectId)
            .then((nextData) => {
                if (!cancelled) setData(nextData)
            })
            .catch((error) => {
                console.error('Failed to load local locations workspace:', error)
                if (!cancelled) setData(null)
            })

        return () => {
            cancelled = true
        }
    }, [projectId])

    if (!data) {
        return (
            <div className="flex flex-1 items-center justify-center bg-[#fbf9f5] px-6 py-12">
                <p className="text-sm font-medium text-slate-400">Loading local locations…</p>
            </div>
        )
    }

    return <LocationsTab projectId={projectId} locations={data.locations} isLocalProject />
}
