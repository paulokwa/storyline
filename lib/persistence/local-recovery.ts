import {
    LOCAL_STORE_NAMES,
    deleteLocalRecord,
    getLocalRecord,
    getLocalRecordsByProjectId,
    putLocalRecord,
} from '@/lib/persistence/local-db'
import {
    listDeletedLocalComments,
    permanentlyDeleteLocalComment,
    restoreLocalComment,
    type LocalDeletedCommentRecord,
} from '@/lib/persistence/local-comments'
import type { Database } from '@/lib/supabase/types'
import type { WritingEntityTable } from '@/lib/persistence/writing-entities'

type StructureNodeRow = Database['public']['Tables']['structure_nodes']['Row']
type SceneRow = Database['public']['Tables']['scenes']['Row']
type CharacterRow = Database['public']['Tables']['characters']['Row']
type IdeaRow = Database['public']['Tables']['ideas']['Row']
type LocationRow = Database['public']['Tables']['locations']['Row']
type ObjectRow = Database['public']['Tables']['objects']['Row']

type RecoveryTrashItem = {
    id: string
    trashType: 'structure' | 'assets' | 'ai' | 'feedback'
    typeLabel?: string
}

type RecoveryEntityRow = CharacterRow | IdeaRow | LocationRow | ObjectRow

const ENTITY_STORE_BY_TABLE = {
    characters: LOCAL_STORE_NAMES.characters,
    ideas: LOCAL_STORE_NAMES.ideas,
    locations: LOCAL_STORE_NAMES.locations,
    objects: LOCAL_STORE_NAMES.objects,
} as const

function sortDeletedRows<T extends { deleted_at: string | null }>(rows: T[]) {
    return [...rows].sort((a, b) => new Date(b.deleted_at ?? 0).getTime() - new Date(a.deleted_at ?? 0).getTime())
}

function getDescendantIds(allNodes: StructureNodeRow[], nodeId: string) {
    const descendants: string[] = []
    const visit = (targetId: string) => {
        allNodes
            .filter((node) => node.parent_id === targetId)
            .forEach((node) => {
                descendants.push(node.id)
                visit(node.id)
            })
    }

    visit(nodeId)
    return descendants
}

function resolveEntityTable(typeLabel?: string): WritingEntityTable | null {
    switch ((typeLabel ?? '').toLowerCase()) {
        case 'character':
            return 'characters'
        case 'idea':
            return 'ideas'
        case 'location':
            return 'locations'
        case 'object':
            return 'objects'
        default:
            return null
    }
}

async function restoreLocalScenesForNodes(projectId: string, nodeIds: Set<string>) {
    const scenes = await getLocalRecordsByProjectId<SceneRow>(LOCAL_STORE_NAMES.scenes, projectId)

    await Promise.all(
        scenes
            .filter((scene) => nodeIds.has(scene.node_id))
            .map((scene) =>
                putLocalRecord(LOCAL_STORE_NAMES.scenes, {
                    ...scene,
                    deleted_at: null,
                    updated_at: new Date().toISOString(),
                })
            )
    )
}

async function permanentlyDeleteStructureBranch(projectId: string, nodeId: string) {
    const allNodes = await getLocalRecordsByProjectId<StructureNodeRow>(LOCAL_STORE_NAMES.structureNodes, projectId)
    const targetIds = new Set([nodeId, ...getDescendantIds(allNodes, nodeId)])
    const scenes = await getLocalRecordsByProjectId<SceneRow>(LOCAL_STORE_NAMES.scenes, projectId)

    await Promise.all([
        ...[...targetIds].map((id) => deleteLocalRecord(LOCAL_STORE_NAMES.structureNodes, id)),
        ...scenes
            .filter((scene) => targetIds.has(scene.node_id))
            .map((scene) => deleteLocalRecord(LOCAL_STORE_NAMES.scenes, scene.id)),
    ])
}

export async function loadLocalRecoveryWorkspaceData(projectId: string) {
    const [
        allNodes,
        deletedCharacters,
        deletedIdeas,
        deletedLocations,
        deletedObjects,
        deletedComments,
    ] = await Promise.all([
        getLocalRecordsByProjectId<StructureNodeRow>(LOCAL_STORE_NAMES.structureNodes, projectId),
        getLocalRecordsByProjectId<CharacterRow>(LOCAL_STORE_NAMES.characters, projectId),
        getLocalRecordsByProjectId<IdeaRow>(LOCAL_STORE_NAMES.ideas, projectId),
        getLocalRecordsByProjectId<LocationRow>(LOCAL_STORE_NAMES.locations, projectId),
        getLocalRecordsByProjectId<ObjectRow>(LOCAL_STORE_NAMES.objects, projectId),
        listDeletedLocalComments(projectId),
    ])

    return {
        deletedNodes: sortDeletedRows(allNodes.filter((node) => node.deleted_at != null)),
        deletedCharacters: sortDeletedRows(deletedCharacters.filter((item) => item.deleted_at != null)),
        deletedIdeas: sortDeletedRows(deletedIdeas.filter((item) => item.deleted_at != null)),
        deletedLocations: sortDeletedRows(deletedLocations.filter((item) => item.deleted_at != null)),
        deletedObjects: sortDeletedRows(deletedObjects.filter((item) => item.deleted_at != null)),
        deletedResponses: [],
        deletedComments,
        allNodes,
        historyEntries: [],
        snapshots: [],
    }
}

export async function restoreLocalRecoveryNode(nodeId: string, descendantIds: string[]) {
    const node = await getLocalRecord<StructureNodeRow>(LOCAL_STORE_NAMES.structureNodes, nodeId)
    if (!node) return

    const targetIds = new Set([nodeId, ...descendantIds])
    const targetNodes = await Promise.all(
        [...targetIds].map((id) => getLocalRecord<StructureNodeRow>(LOCAL_STORE_NAMES.structureNodes, id))
    )

    await Promise.all(
        targetNodes
            .filter((item): item is StructureNodeRow => !!item)
            .map((item) =>
                putLocalRecord(LOCAL_STORE_NAMES.structureNodes, {
                    ...item,
                    deleted_at: null,
                })
            )
    )

    await restoreLocalScenesForNodes(node.project_id, targetIds)
}

export async function restoreLocalRecoveryEntity(table: WritingEntityTable, id: string) {
    const store = ENTITY_STORE_BY_TABLE[table]
    const entity = await getLocalRecord<RecoveryEntityRow>(store, id)
    if (!entity) return

    await putLocalRecord(store, {
        ...entity,
        deleted_at: null,
        updated_at: 'updated_at' in entity ? new Date().toISOString() : undefined,
    })
}

export async function restoreLocalRecoveryComment(id: string) {
    await restoreLocalComment(id)
}

export async function permanentlyDeleteLocalRecoveryTrashItem(item: RecoveryTrashItem) {
    if (item.trashType === 'feedback') {
        await permanentlyDeleteLocalComment(item.id)
        return
    }

    if (item.trashType === 'structure') {
        const node = await getLocalRecord<StructureNodeRow>(LOCAL_STORE_NAMES.structureNodes, item.id)
        if (!node) return
        await permanentlyDeleteStructureBranch(node.project_id, item.id)
        return
    }

    if (item.trashType === 'assets') {
        const table = resolveEntityTable(item.typeLabel)
        if (!table) return
        const store = ENTITY_STORE_BY_TABLE[table]
        await deleteLocalRecord(store, item.id)
    }
}

export async function clearLocalRecoveryTrash(projectId: string) {
    const data = await loadLocalRecoveryWorkspaceData(projectId)

    await Promise.all([
        ...data.deletedNodes.map((node) => deleteLocalRecord(LOCAL_STORE_NAMES.structureNodes, node.id)),
        ...data.deletedCharacters.map((item) => deleteLocalRecord(LOCAL_STORE_NAMES.characters, item.id)),
        ...data.deletedIdeas.map((item) => deleteLocalRecord(LOCAL_STORE_NAMES.ideas, item.id)),
        ...data.deletedLocations.map((item) => deleteLocalRecord(LOCAL_STORE_NAMES.locations, item.id)),
        ...data.deletedObjects.map((item) => deleteLocalRecord(LOCAL_STORE_NAMES.objects, item.id)),
        ...data.deletedComments.map((item: LocalDeletedCommentRecord) => permanentlyDeleteLocalComment(item.id)),
    ])

    const scenes = await getLocalRecordsByProjectId<SceneRow>(LOCAL_STORE_NAMES.scenes, projectId)
    await Promise.all(
        scenes
            .filter((scene) => scene.deleted_at != null)
            .map((scene) => deleteLocalRecord(LOCAL_STORE_NAMES.scenes, scene.id))
    )
}
