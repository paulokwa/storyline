'use client'

import { useEffect, useState } from 'react'
import ObjectsTab from '@/components/project/objects/ObjectsTab'
import { loadLocalObjectsWorkspaceData } from '@/lib/persistence/local-projects'

type ObjectsWorkspaceData = Awaited<ReturnType<typeof loadLocalObjectsWorkspaceData>>

export default function LocalObjectsPage({ projectId }: { projectId: string }) {
    const [data, setData] = useState<ObjectsWorkspaceData | null>(null)

    useEffect(() => {
        let cancelled = false
        void loadLocalObjectsWorkspaceData(projectId)
            .then((nextData) => {
                if (!cancelled) setData(nextData)
            })
            .catch((error) => {
                console.error('Failed to load local objects workspace:', error)
                if (!cancelled) setData(null)
            })

        return () => {
            cancelled = true
        }
    }, [projectId])

    if (!data) {
        return (
            <div className="flex flex-1 items-center justify-center bg-[#fbf9f5] px-6 py-12">
                <p className="text-sm font-medium text-slate-400">Loading local objects…</p>
            </div>
        )
    }

    return <ObjectsTab projectId={projectId} objects={data.objects} isLocalProject />
}
