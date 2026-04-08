import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RecoveryTab from '@/components/project/recovery/RecoveryTab'

export default async function RecoveryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: projectId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [
        { data: deletedNodes },
        { data: deletedCharacters },
        { data: deletedIdeas },
        { data: deletedLocations },
        { data: deletedObjects },
        { data: deletedResponses },
        { data: allNodes },
        { data: historyEntries },
        { data: snapshots }
    ] = await Promise.all([
        supabase.from('structure_nodes').select('*').eq('project_id', projectId).not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
        supabase.from('characters').select('*').eq('project_id', projectId).not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
        supabase.from('ideas').select('*').eq('project_id', projectId).not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
        supabase.from('locations').select('*').eq('project_id', projectId).not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
        supabase.from('objects').select('*').eq('project_id', projectId).not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
        supabase.from('ai_responses').select('*').eq('project_id', projectId).not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
        supabase.from('structure_nodes').select('*').eq('project_id', projectId), // Need full list for tree/descendant calculations
        supabase.from('scene_versions').select(`
            *,
            scenes!inner (
                id,
                node_id,
                structure_nodes!inner (
                    title
                )
            )
        `).eq('project_id', projectId).order('created_at', { ascending: false }).limit(100),
        supabase.from('project_snapshots').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
    ])

    return (
        <RecoveryTab 
            projectId={projectId}
            deletedNodes={deletedNodes || []}
            deletedCharacters={deletedCharacters || []}
            deletedIdeas={deletedIdeas || []}
            deletedLocations={deletedLocations || []}
            deletedObjects={deletedObjects || []}
            deletedResponses={deletedResponses || []}
            allNodes={allNodes || []}
            historyEntries={historyEntries || []}
            snapshots={snapshots || []}
        />
    )
}
