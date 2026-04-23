'use client'

import { useEffect, useState } from 'react'
import IdeasTab from '@/components/project/ideas/IdeasTab'
import { loadLocalIdeasWorkspaceData } from '@/lib/persistence/local-projects'

type IdeasWorkspaceData = Awaited<ReturnType<typeof loadLocalIdeasWorkspaceData>>

export default function LocalIdeasPage({ projectId }: { projectId: string }) {
    const [data, setData] = useState<IdeasWorkspaceData | null>(null)

    useEffect(() => {
        let cancelled = false
        void loadLocalIdeasWorkspaceData(projectId)
            .then((nextData) => {
                if (!cancelled) setData(nextData)
            })
            .catch((error) => {
                console.error('Failed to load local ideas workspace:', error)
                if (!cancelled) setData(null)
            })

        return () => {
            cancelled = true
        }
    }, [projectId])

    if (!data) {
        return (
            <div className="flex flex-1 items-center justify-center bg-[#fbf9f5] px-6 py-12">
                <p className="text-sm font-medium text-slate-400">Loading local ideas…</p>
            </div>
        )
    }

    return <IdeasTab projectId={projectId} ideas={data.ideas} isLocalProject />
}
