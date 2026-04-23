import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LocalRecoveryPage from '@/components/project/local/LocalRecoveryPage'
import RecoveryTab from '@/components/project/recovery/RecoveryTab'
import { loadRecoveryWorkspaceData } from '@/lib/persistence/project-content'
import { isLocalProjectId } from '@/lib/persistence/project-mode'

export default async function RecoveryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: projectId } = await params

    if (isLocalProjectId(projectId)) {
        return <LocalRecoveryPage projectId={projectId} />
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    const {
        deletedNodes,
        deletedCharacters,
        deletedIdeas,
        deletedLocations,
        deletedObjects,
        deletedResponses,
        deletedComments,
        allNodes,
        historyEntries,
        snapshots,
    } = await loadRecoveryWorkspaceData(supabase, projectId)

    return (
        <RecoveryTab 
            projectId={projectId}
            deletedNodes={deletedNodes}
            deletedCharacters={deletedCharacters}
            deletedIdeas={deletedIdeas}
            deletedLocations={deletedLocations}
            deletedObjects={deletedObjects}
            deletedResponses={deletedResponses}
            deletedComments={deletedComments}
            allNodes={allNodes}
            historyEntries={historyEntries}
            snapshots={snapshots}
        />
    )
}
