'use client'

import { useEffect, useState } from 'react'
import ProjectShell from '@/components/project/ProjectShell'
import { getLocalProject, touchLocalProject, type LocalProjectRow } from '@/lib/persistence/local-projects'
import BackupBanner from '@/components/project/local/BackupBanner'

export default function LocalProjectShell({
    projectId,
    currentUserId,
    currentUserDisplayName,
    currentUserAvatarUrl,
    children,
}: {
    projectId: string
    currentUserId: string
    currentUserDisplayName: string | null
    currentUserAvatarUrl: string | null
    children: React.ReactNode
}) {
    const [project, setProject] = useState<LocalProjectRow | null>(null)
    const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading')

    useEffect(() => {
        let cancelled = false

        void (async () => {
            try {
                const localProject = await getLocalProject(projectId)
                if (!localProject) {
                    if (!cancelled) setStatus('missing')
                    return
                }

                await touchLocalProject(projectId)

                if (!cancelled) {
                    setProject(localProject)
                    setStatus('ready')
                }
            } catch (error) {
                console.error('Failed to load local project shell:', error)
                if (!cancelled) setStatus('missing')
            }
        })()

        return () => {
            cancelled = true
        }
    }, [projectId])

    if (status === 'loading') {
        return (
            <div className="flex min-h-0 flex-1 items-center justify-center bg-[#fbf9f5] px-6 py-12">
                <p className="text-sm font-medium text-slate-400">Opening local project…</p>
            </div>
        )
    }

    if (status === 'missing' || !project) {
        return (
            <div className="flex min-h-0 flex-1 items-center justify-center bg-[#fbf9f5] px-6 py-12">
                <div className="max-w-md text-center">
                    <h2 className="font-serif text-2xl text-slate-800">Local project unavailable</h2>
                    <p className="mt-3 text-sm text-slate-500">
                        This local-only project could not be loaded from your device storage.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <ProjectShell
            project={project}
            currentUserId={currentUserId}
            role="owner"
            owner={{
                user_id: currentUserId,
                display_name: currentUserDisplayName,
                avatar_url: currentUserAvatarUrl,
            }}
            members={[]}
            storageMode="local-only"
        >
            <BackupBanner projectId={projectId} />
            {children}
        </ProjectShell>
    )
}
