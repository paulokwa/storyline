import type { Tables } from '@/lib/supabase/types'
import { MessageSquare, Sparkles, Users, type LucideIcon } from 'lucide-react'

export type NotificationRecord = Tables<'notifications'>

export const NOTIFICATION_ICONS: Record<NotificationRecord['type'], LucideIcon> = {
    welcome: Sparkles,
    collaborator_feedback: MessageSquare,
    project_shared: Users,
    project_role_changed: Users,
}

export function getNotificationActionLabel(notification: NotificationRecord) {
    if (!notification.link_href) return 'Open'

    if (notification.type === 'welcome') {
        return 'Open welcome guide'
    }

    if (notification.link_href.includes('/project/')) {
        return 'Open project'
    }

    return 'Open'
}

export function getNotificationPreview(notification: NotificationRecord) {
    return notification.summary || notification.body || ''
}
