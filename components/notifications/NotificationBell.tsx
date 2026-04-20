'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { NotificationRecord } from '@/lib/notifications'
import { getNotificationActionLabel, getNotificationPreview, NOTIFICATION_ICONS } from '@/lib/notifications'
import { formatDistanceToNow } from '@/lib/time'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/providers/ThemeProvider'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

const MAX_VISIBLE = 8

export default function NotificationBell() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const { theme } = useTheme()
    const isMidnight = theme === 'midnight'
    const supabase = useMemo(() => createClient(), [])

    const [userId, setUserId] = useState<string | null>(null)
    const [notifications, setNotifications] = useState<NotificationRecord[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isMarkingAll, setIsMarkingAll] = useState(false)

    const fetchNotifications = useCallback(async (targetUserId?: string | null) => {
        const resolvedUserId = targetUserId ?? userId

        if (!resolvedUserId) {
            setNotifications([])
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', resolvedUserId)
            .order('created_at', { ascending: false })
            .limit(20)

        if (error) {
            console.error('Failed to fetch notifications:', error)
        } else {
            setNotifications((data ?? []) as NotificationRecord[])
        }

        setIsLoading(false)
    }, [supabase, userId])

    useEffect(() => {
        let isMounted = true

        supabase.auth.getUser().then(({ data, error }) => {
            if (!isMounted) return

            if (error) {
                console.error('Failed to load notification user:', error)
                setIsLoading(false)
                return
            }

            const nextUserId = data.user?.id ?? null
            setUserId(nextUserId)
            void fetchNotifications(nextUserId)
        })

        return () => {
            isMounted = false
        }
    }, [fetchNotifications, supabase])

    useEffect(() => {
        if (!userId) return

        const channel = supabase
            .channel(`notifications:${userId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`,
            }, () => {
                void fetchNotifications(userId)
            })
            .subscribe()

        return () => {
            void channel.unsubscribe()
        }
    }, [fetchNotifications, supabase, userId])

    const unreadCount = notifications.filter((notification) => !notification.read_at).length
    const currentPath = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')

    const markAsRead = useCallback(async (notificationId: string) => {
        const timestamp = new Date().toISOString()

        setNotifications((current) => current.map((notification) =>
            notification.id === notificationId
                ? { ...notification, read_at: notification.read_at ?? timestamp }
                : notification
        ))

        const { error } = await supabase
            .from('notifications')
            .update({ read_at: timestamp })
            .eq('id', notificationId)
            .is('read_at', null)

        if (error) {
            console.error('Failed to mark notification as read:', error)
            void fetchNotifications()
        }
    }, [fetchNotifications, supabase])

    const handleMarkAllRead = useCallback(async () => {
        if (!userId || unreadCount === 0) return

        setIsMarkingAll(true)
        const timestamp = new Date().toISOString()

        setNotifications((current) => current.map((notification) => ({
            ...notification,
            read_at: notification.read_at ?? timestamp,
        })))

        const { error } = await supabase
            .from('notifications')
            .update({ read_at: timestamp })
            .eq('user_id', userId)
            .is('read_at', null)

        if (error) {
            console.error('Failed to mark all notifications as read:', error)
            void fetchNotifications()
        }

        setIsMarkingAll(false)
    }, [fetchNotifications, supabase, unreadCount, userId])

    const handleOpenNotification = useCallback(async (notification: NotificationRecord) => {
        if (!notification.read_at) {
            void markAsRead(notification.id)
        }

        router.push(`/notifications/${notification.id}?returnTo=${encodeURIComponent(currentPath)}`)
    }, [currentPath, markAsRead, router])

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                className={cn(
                    'relative inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors',
                    isMidnight ? 'hover:bg-white/6' : 'hover:bg-black/5'
                )}
                aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
            >
                <Bell className={cn('h-4 w-4', isMidnight ? 'text-slate-200' : 'text-slate-600')} />
                {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                className={cn(
                    'mt-2 w-[min(92vw,26rem)] rounded-3xl border p-0 shadow-2xl',
                    isMidnight
                        ? 'border-slate-600/30 bg-[#10192b]/98 text-slate-100 shadow-[0_24px_60px_rgba(2,6,23,0.55)]'
                        : 'border-slate-200 bg-white'
                )}
            >
                <div className={cn(
                    'flex items-center justify-between px-5 py-4',
                    isMidnight ? 'border-b border-slate-700/60' : 'border-b border-slate-100'
                )}>
                    <div>
                        <p className="text-sm font-semibold">Notifications</p>
                        <p className={cn('text-xs', isMidnight ? 'text-slate-400' : 'text-slate-500')}>
                            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMarkAllRead}
                        disabled={unreadCount === 0 || isMarkingAll}
                        className="rounded-full px-3 text-xs font-semibold"
                    >
                        {isMarkingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                        <span className="ml-1.5">Mark all read</span>
                    </Button>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center px-5 py-10 text-sm text-slate-500">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading notifications...
                    </div>
                ) : notifications.length === 0 ? (
                    <div className={cn('px-5 py-10 text-center text-sm', isMidnight ? 'text-slate-400' : 'text-slate-500')}>
                        New activity will show up here.
                    </div>
                ) : (
                    <div className="max-h-[26rem] overflow-y-auto py-2">
                        {notifications.slice(0, MAX_VISIBLE).map((notification, index) => {
                            const Icon = NOTIFICATION_ICONS[notification.type] ?? Bell
                            const preview = getNotificationPreview(notification)

                            return (
                                <div key={notification.id}>
                                    <button
                                        type="button"
                                        onClick={() => handleOpenNotification(notification)}
                                        className={cn(
                                            'flex w-full items-start gap-3 px-5 py-3 text-left transition-colors',
                                            isMidnight ? 'hover:bg-white/6' : 'hover:bg-slate-50'
                                        )}
                                    >
                                        <div className={cn(
                                            'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border',
                                            !notification.read_at
                                                ? (isMidnight
                                                    ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'
                                                    : 'border-emerald-100 bg-emerald-50 text-emerald-600')
                                                : (isMidnight
                                                    ? 'border-slate-700 bg-slate-900/70 text-slate-300'
                                                    : 'border-slate-200 bg-slate-100 text-slate-500')
                                        )}>
                                            <Icon className="h-4 w-4" />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-3">
                                                <p className={cn(
                                                    'text-sm font-semibold leading-5',
                                                    !notification.read_at && (isMidnight ? 'text-white' : 'text-slate-900')
                                                )}>
                                                    {notification.title}
                                                </p>
                                                <span className={cn('shrink-0 text-[11px]', isMidnight ? 'text-slate-500' : 'text-slate-400')}>
                                                    {formatDistanceToNow(notification.created_at)}
                                                </span>
                                            </div>

                                            {preview && (
                                                <p className={cn(
                                                    'mt-1 line-clamp-2 text-xs leading-5',
                                                    isMidnight ? 'text-slate-400' : 'text-slate-500'
                                                )}>
                                                    {preview}
                                                </p>
                                            )}

                                            <p className={cn('mt-2 text-[11px] font-semibold uppercase tracking-[0.14em]', isMidnight ? 'text-slate-500' : 'text-slate-400')}>
                                                {getNotificationActionLabel(notification)}
                                            </p>
                                        </div>
                                    </button>

                                    {index < Math.min(notifications.length, MAX_VISIBLE) - 1 && (
                                        <DropdownMenuSeparator className={cn('mx-5', isMidnight ? 'bg-slate-800' : 'bg-slate-100')} />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
