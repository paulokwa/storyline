import type { Tables } from '@/lib/supabase/types'
import { MessageSquare, Sparkles, Users, HardDrive, type LucideIcon } from 'lucide-react'

export type NotificationRecord = Tables<'notifications'>

type NotificationMetadata = Record<string, unknown> | null

export function getProjectIdFromPathname(pathname?: string | null) {
    if (!pathname) return null
    const match = pathname.match(/^\/project\/([^/]+)\/[^/]+/)
    return match?.[1] ?? null
}

export function isProjectWorkspacePath(pathname?: string | null) {
    return getProjectIdFromPathname(pathname) !== null
}

function getNotificationMetadata(notification: NotificationRecord): NotificationMetadata {
    if (!notification.metadata || typeof notification.metadata !== 'object' || Array.isArray(notification.metadata)) {
        return null
    }

    return notification.metadata as NotificationMetadata
}

function isViewingNotificationProject(notification: NotificationRecord, pathname?: string | null) {
    if (!notification.project_id) return false
    return getProjectIdFromPathname(pathname) === notification.project_id
}

function getFeedbackLocationLabel(notification: NotificationRecord) {
    const metadata = getNotificationMetadata(notification)
    const locationLabel = metadata?.location_label
    if (typeof locationLabel === 'string' && locationLabel.trim()) return locationLabel.trim()

    const nodeType = metadata?.node_type
    const nodeTitle = metadata?.node_title
    const parentType = metadata?.parent_type
    const parentTitle = metadata?.parent_title

    if (nodeType === 'scene' && (parentType === 'chapter' || parentType === 'act')) {
        return `${parentType === 'chapter' ? 'Chapter' : 'Act'}${typeof parentTitle === 'string' && parentTitle.trim() ? `: ${parentTitle.trim()}` : ''} / Scene${typeof nodeTitle === 'string' && nodeTitle.trim() ? `: ${nodeTitle.trim()}` : ''}`
    }

    if (nodeType === 'scene') {
        return `Scene${typeof nodeTitle === 'string' && nodeTitle.trim() ? `: ${nodeTitle.trim()}` : ''}`
    }

    if (nodeType === 'chapter' || nodeType === 'act') {
        return `${nodeType === 'chapter' ? 'Chapter' : 'Act'}${typeof nodeTitle === 'string' && nodeTitle.trim() ? `: ${nodeTitle.trim()}` : ''}`
    }

    return null
}

export function getNotificationNodeId(notification: NotificationRecord) {
    const metadata = getNotificationMetadata(notification)
    const nodeId = metadata?.node_id
    return typeof nodeId === 'string' && nodeId ? nodeId : null
}

export const NOTIFICATION_ICONS: Record<NotificationRecord['type'], LucideIcon> = {
    welcome: Sparkles,
    collaborator_feedback: MessageSquare,
    project_shared: Users,
    project_role_changed: Users,
    local_transfer_guidance: HardDrive,
}

export function getNotificationDisplayTitle(notification: NotificationRecord, pathname?: string | null, resolvedLocationLabel?: string | null) {
    if (
        notification.type === 'collaborator_feedback' &&
        isViewingNotificationProject(notification, pathname)
    ) {
        const locationLabel = resolvedLocationLabel || getFeedbackLocationLabel(notification)
        if (locationLabel) {
            return `New feedback in ${locationLabel}`
        }
    }

    return notification.title
}

export function getNotificationTargetHref(notification: NotificationRecord, pathname?: string | null) {
    if (notification.type === 'collaborator_feedback' && notification.project_id) {
        const metadata = getNotificationMetadata(notification)
        const params = new URLSearchParams()

        if (typeof metadata?.node_id === 'string' && metadata.node_id) {
            params.set('nodeId', metadata.node_id)
        }

        params.set('feedback', '1')

        if (notification.comment_id) {
            params.set('commentId', notification.comment_id)
        }

        if (isViewingNotificationProject(notification, pathname)) {
            params.set('focus', 'feedback')
        }

        return `/project/${notification.project_id}/story?${params.toString()}`
    }

    if (notification.type === 'local_transfer_guidance') {
        return '/notifications/' + notification.id
    }

    return notification.link_href || null
}

export function getNotificationActionLabel(notification: NotificationRecord, pathname?: string | null) {
    const targetHref = getNotificationTargetHref(notification, pathname)

    if (!targetHref) return 'Open'

    if (notification.type === 'welcome') {
        return 'Open welcome guide'
    }

    if (notification.type === 'local_transfer_guidance') {
        return 'Read guidance'
    }

    if (notification.type === 'collaborator_feedback' && isViewingNotificationProject(notification, pathname)) {
        return 'Open feedback section'
    }

    if (targetHref.includes('/project/')) {
        return 'Open project'
    }

    return 'Open'
}

export function getNotificationPreview(notification: NotificationRecord) {
    return notification.summary || notification.body || ''
}
