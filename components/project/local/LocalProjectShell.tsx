'use client'

import { useEffect, useState } from 'react'
import RouteLoadingScreen from '@/components/app/RouteLoadingScreen'
import ProjectShell from '@/components/project/ProjectShell'
import BackupBanner from '@/components/project/local/BackupBanner'
import MigratedBanner from '@/components/project/local/MigratedBanner'
import LocalTransferGuidance from '@/components/project/local/LocalTransferGuidance'
import { getLocalProject, touchLocalProject, type LocalProjectRow } from '@/lib/persistence/local-projects'

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
    const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'forbidden'>('loading')
    const [showTransferGuidance, setShowTransferGuidance] = useState(false)

    useEffect(() => {
        let cancelled = false

        void (async () => {
            try {
                const localProject = await getLocalProject(projectId)
                if (!localProject) {
                    if (!cancelled) setStatus('missing')
                    return
                }

                if (localProject.user_id !== currentUserId) {
                    if (!cancelled) setStatus('forbidden')
                    return
                }

                await touchLocalProject(projectId)

                if (!cancelled) {
                    setProject(localProject)
                    setStatus('ready')
                    const dismissKey = `storyline-transfer-guidance-dismissed-${projectId}`
                    if (!localStorage.getItem(dismissKey)) {
                        setShowTransferGuidance(true)
                    }
                }
            } catch (error) {
                console.error('Failed to load local project shell:', error)
                if (!cancelled) setStatus('missing')
            }
        })()

        return () => {
            cancelled = true
        }
    }, [projectId, currentUserId])

    if (status === 'loading') {
        return (
            <RouteLoadingScreen
                variant="workspace"
                title="Opening your local project..."
                description="Loading the draft from this device and rebuilding your writing workspace."
                reassurance="Your work stays on this device unless you choose cloud sync."
            />
        )
    }

    if (status === 'forbidden') {
        return (
            <div className="flex min-h-0 flex-1 items-center justify-center bg-[#fbf9f5] px-6 py-12">
                <div className="max-w-md text-center">
                    <h2 className="font-serif text-2xl text-slate-800">Local project belongs to another account</h2>
                    <p className="mt-3 text-sm text-slate-500">
                        This draft is still stored on this device, but Storyline will not open it while you are signed into a different account. Sign into the account that created it, or open a .storyline backup if you have one.
                    </p>
                </div>
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
            {project.migrated_to_cloud_project_id ? (
                <MigratedBanner
                    projectId={projectId}
                    cloudProjectId={project.migrated_to_cloud_project_id}
                />
            ) : (
                <BackupBanner projectId={projectId} />
            )}
            {showTransferGuidance && !project.migrated_to_cloud_project_id && (
                <div className="px-4 pt-3 pb-1">
                    <LocalTransferGuidance
                        compact
                        cloudSyncHref="/help?q=cloud%20sync"
                        onDismiss={() => {
                            setShowTransferGuidance(false)
                            localStorage.setItem(`storyline-transfer-guidance-dismissed-${projectId}`, 'true')
                        }}
                    />
                </div>
            )}
            {children}
        </ProjectShell>
    )
}
