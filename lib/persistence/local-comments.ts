import {
    LOCAL_STORE_NAMES,
    bulkPutLocalRecords,
    deleteLocalRecord,
    getLocalRecord,
    getLocalRecordsByProjectId,
    putLocalRecord,
} from '@/lib/persistence/local-db'
import type { Database, Json } from '@/lib/supabase/types'

type ProjectCommentRow = Database['public']['Tables']['project_comments']['Row']

export type LocalCommentRecord = Omit<ProjectCommentRow, 'status'> & {
    author_email: string | null
    author_type: 'self'
    status: 'open' | 'resolved'
}

export type LocalDeletedCommentRecord = LocalCommentRecord & {
    can_permanently_delete: true
    can_restore: true
}

type CreateLocalCommentInput = {
    projectId: string
    nodeId?: string | null
    content: string
    parentId?: string | null
    anchorData?: Json | null
    isShared?: boolean
    authorId: string
    authorEmail: string | null
    orderIndex: number
}

function sortComments<T extends { order_index: number | null; created_at: string }>(comments: T[]) {
    return [...comments].sort((a, b) => {
        if ((a.order_index ?? 0) !== (b.order_index ?? 0)) {
            return (a.order_index ?? 0) - (b.order_index ?? 0)
        }

        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
}

export async function listLocalComments(projectId: string) {
    const comments = await getLocalRecordsByProjectId<LocalCommentRecord>(LOCAL_STORE_NAMES.comments, projectId)
    return sortComments(comments.filter((comment) => comment.deleted_at == null))
}

export async function listDeletedLocalComments(projectId: string) {
    const comments = await getLocalRecordsByProjectId<LocalCommentRecord>(LOCAL_STORE_NAMES.comments, projectId)
    return sortComments(
        comments
            .filter((comment) => comment.deleted_at != null)
            .map((comment) => ({
                ...comment,
                can_permanently_delete: true as const,
                can_restore: true as const,
            }))
    )
}

export async function createLocalComment(input: CreateLocalCommentInput) {
    const timestamp = new Date().toISOString()
    const comment: LocalCommentRecord = {
        anchor_data: input.anchorData ?? null,
        author_email: input.authorEmail,
        author_id: input.authorId,
        author_type: 'self',
        content: input.content,
        created_at: timestamp,
        deleted_at: null,
        deleted_by: null,
        id: `${input.projectId}_comment_${crypto.randomUUID()}`,
        is_shared: input.isShared ?? false,
        node_id: input.nodeId ?? null,
        order_index: input.orderIndex,
        parent_id: input.parentId ?? null,
        project_id: input.projectId,
        resolved_at: null,
        resolved_by: null,
        status: 'open',
        updated_at: timestamp,
    }

    await putLocalRecord(LOCAL_STORE_NAMES.comments, comment)
    return comment
}

export async function updateLocalComment(id: string, updates: Partial<LocalCommentRecord>) {
    const existing = await getLocalRecord<LocalCommentRecord>(LOCAL_STORE_NAMES.comments, id)
    if (!existing) throw new Error('Local comment not found.')

    const next: LocalCommentRecord = {
        ...existing,
        ...updates,
        updated_at: new Date().toISOString(),
    }

    await putLocalRecord(LOCAL_STORE_NAMES.comments, next)
    return next
}

export async function reorderLocalComments(projectId: string, orderedIds: string[]) {
    const comments = await getLocalRecordsByProjectId<LocalCommentRecord>(LOCAL_STORE_NAMES.comments, projectId)
    const orderById = new Map(orderedIds.map((id, index) => [id, index]))
    const nextComments = comments.map((comment) => ({
        ...comment,
        order_index: orderById.has(comment.id) ? orderById.get(comment.id)! : comment.order_index,
        updated_at: new Date().toISOString(),
    }))

    await bulkPutLocalRecords(LOCAL_STORE_NAMES.comments, nextComments)
}

function collectCommentTreeIds(comments: LocalCommentRecord[], rootId: string) {
    const ids = new Set<string>([rootId])
    let changed = true

    while (changed) {
        changed = false
        comments.forEach((comment) => {
            if (comment.parent_id && ids.has(comment.parent_id) && !ids.has(comment.id)) {
                ids.add(comment.id)
                changed = true
            }
        })
    }

    return ids
}

export async function softDeleteLocalCommentTree(projectId: string, commentId: string, deletedBy: string | null) {
    const comments = await getLocalRecordsByProjectId<LocalCommentRecord>(LOCAL_STORE_NAMES.comments, projectId)
    const target = comments.find((comment) => comment.id === commentId)
    if (!target) return []

    const targetIds = target.parent_id ? new Set([commentId]) : collectCommentTreeIds(comments, commentId)
    const timestamp = new Date().toISOString()

    await bulkPutLocalRecords(
        LOCAL_STORE_NAMES.comments,
        comments.map((comment) =>
            targetIds.has(comment.id)
                ? {
                    ...comment,
                    deleted_at: timestamp,
                    deleted_by: deletedBy,
                    updated_at: timestamp,
                }
                : comment
        )
    )

    return [...targetIds]
}

export async function restoreLocalComment(id: string) {
    const comment = await getLocalRecord<LocalCommentRecord>(LOCAL_STORE_NAMES.comments, id)
    if (!comment) return

    await putLocalRecord(LOCAL_STORE_NAMES.comments, {
        ...comment,
        deleted_at: null,
        deleted_by: null,
        updated_at: new Date().toISOString(),
    })
}

export async function permanentlyDeleteLocalComment(id: string) {
    await deleteLocalRecord(LOCAL_STORE_NAMES.comments, id)
}
