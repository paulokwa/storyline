'use client'

import { useCallback, useEffect, useState } from 'react'
import RecoveryTab from '@/components/project/recovery/RecoveryTab'
import { loadLocalRecoveryWorkspaceData } from '@/lib/persistence/local-recovery'

type LocalRecoveryWorkspaceData = Awaited<ReturnType<typeof loadLocalRecoveryWorkspaceData>>

export default function LocalRecoveryPage({ projectId }: { projectId: string }) {
    const [data, setData] = useState<LocalRecoveryWorkspaceData | null>(null)
    const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading')

    const reloadRecoveryData = useCallback(async () => {
        try {
            const nextData = await loadLocalRecoveryWorkspaceData(projectId)
            setData(nextData)
            setStatus('ready')
        } catch (error) {
            console.error('Failed to reload local recovery workspace:', error)
            setStatus('missing')
        }
    }, [projectId])

    useEffect(() => {
        let cancelled = false

        void loadLocalRecoveryWorkspaceData(projectId)
            .then((nextData) => {
                if (!cancelled) {
                    setData(nextData)
                    setStatus('ready')
                }
            })
            .catch((error) => {
                console.error('Failed to load local recovery workspace:', error)
                if (!cancelled) setStatus('missing')
            })

        return () => {
            cancelled = true
        }
    }, [projectId])

    if (status !== 'ready' || !data) {
        return (
            <div className="flex flex-1 items-center justify-center bg-[#fbf9f5] px-6 py-12">
                <p className="text-sm font-medium text-slate-400">
                    {status === 'missing' ? 'Local recovery data is unavailable.' : 'Loading recovery workspace...'}
                </p>
            </div>
        )
    }

    return (
        <RecoveryTab
            projectId={projectId}
            deletedNodes={data.deletedNodes}
            deletedCharacters={data.deletedCharacters}
            deletedIdeas={data.deletedIdeas}
            deletedLocations={data.deletedLocations}
            deletedObjects={data.deletedObjects}
            deletedResponses={data.deletedResponses}
            deletedComments={data.deletedComments}
            allNodes={data.allNodes}
            historyEntries={data.historyEntries}
            snapshots={data.snapshots}
            onLocalDataChanged={reloadRecoveryData}
        />
    )
}
