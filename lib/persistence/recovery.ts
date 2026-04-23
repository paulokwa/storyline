import { createClient } from '@/lib/supabase/client'
import {
    createProjectSnapshot,
    permanentlyDeleteComment,
    permanentlyDeleteHistoryVersion,
    permanentlyDeleteTrashItem,
    restoreDeletedComment,
    restoreEntity,
    restoreProjectSnapshot,
    restoreStructureNode,
} from '@/lib/supabase/recovery'
import { restoreSceneVersion } from '@/lib/persistence/scenes'

type RecoveryTrashItem = {
    id: string
    trashType: 'structure' | 'assets' | 'ai' | 'feedback'
    typeLabel?: string
    can_permanently_delete?: boolean
}

type RecoveryEntityTable = 'characters' | 'ideas' | 'locations' | 'objects' | 'ai_responses'

export async function restoreRecoveryNode(nodeId: string, descendantIds: string[]) {
    const supabase = createClient()
    await restoreStructureNode(supabase, nodeId, descendantIds)
}

export async function restoreRecoveryEntity(table: RecoveryEntityTable, id: string) {
    const supabase = createClient()
    await restoreEntity(supabase, table, id)
}

export async function restoreRecoveryComment(id: string) {
    const supabase = createClient()
    await restoreDeletedComment(supabase as never, id)
}

export async function restoreRecoverySceneVersion(projectId: string, version: { scene_id: string; content: unknown }) {
    await restoreSceneVersion(projectId, version.scene_id, version.content)
}

export async function createRecoverySnapshot(projectId: string, name: string, description?: string) {
    const supabase = createClient()
    await createProjectSnapshot(supabase, projectId, name, description)
}

export async function restoreRecoverySnapshot(snapshotId: string) {
    const supabase = createClient()
    await restoreProjectSnapshot(supabase, snapshotId)
}

export async function deleteRecoverySnapshot(snapshotId: string) {
    const supabase = createClient()
    const { error } = await supabase.from('project_snapshots').delete().eq('id', snapshotId)
    if (error) throw error
}

export async function permanentlyDeleteRecoveryTrashItem(item: RecoveryTrashItem) {
    const supabase = createClient()
    await permanentlyDeleteTrashItem(supabase, item.trashType, item.id, item.typeLabel)
}

export async function permanentlyDeleteRecoveryHistoryVersion(versionId: string) {
    const supabase = createClient()
    await permanentlyDeleteHistoryVersion(supabase, versionId)
}

export async function clearRecoveryTrash(input: {
    deletedNodes: Array<{ id: string }>
    deletedCharacters: Array<{ id: string }>
    deletedIdeas: Array<{ id: string }>
    deletedLocations: Array<{ id: string }>
    deletedObjects: Array<{ id: string }>
    deletedResponses: Array<{ id: string }>
    deletedComments: Array<{ id: string; can_permanently_delete?: boolean }>
}) {
    const supabase = createClient()
    const nodesToDelete = input.deletedNodes.map((node) => node.id)
    if (nodesToDelete.length > 0) {
        await supabase.from('scenes').delete().in('node_id', nodesToDelete)
        await supabase.from('structure_nodes').delete().in('id', nodesToDelete)
    }

    const entities: Array<{ table: RecoveryEntityTable; list: Array<{ id: string }> }> = [
        { table: 'characters', list: input.deletedCharacters },
        { table: 'ideas', list: input.deletedIdeas },
        { table: 'locations', list: input.deletedLocations },
        { table: 'objects', list: input.deletedObjects },
        { table: 'ai_responses', list: input.deletedResponses },
    ]

    for (const entity of entities) {
        const ids = entity.list.map((item) => item.id)
        if (ids.length > 0) {
            await supabase.from(entity.table).delete().in('id', ids)
        }
    }

    const commentIds = input.deletedComments
        .filter((comment) => comment.can_permanently_delete)
        .map((comment) => comment.id)

    for (const commentId of commentIds) {
        await permanentlyDeleteComment(supabase as never, commentId)
    }
}
