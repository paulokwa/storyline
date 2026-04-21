'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { NotificationRecord } from '@/lib/notifications'
import {
    getNotificationActionLabel,
    getNotificationDisplayTitle,
    getNotificationTargetHref,
    NOTIFICATION_ICONS,
} from '@/lib/notifications'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/providers/ThemeProvider'

export default function NotificationDetailClient({
    notification,
    returnTo,
}: {
    notification: NotificationRecord
    returnTo: string | null
}) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const { theme } = useTheme()
    const isMidnight = theme === 'midnight'
    const targetHref = searchParams?.get('target') || getNotificationTargetHref(notification, pathname)

    useEffect(() => {
        if (notification.read_at) return

        const supabase = createClient()
        void supabase
            .from('notifications')
            .update({ read_at: new Date().toISOString() })
            .eq('id', notification.id)
            .is('read_at', null)
    }, [notification.id, notification.read_at])

    const Icon = NOTIFICATION_ICONS[notification.type] ?? Bell

    const handleBack = () => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back()
            return
        }

        router.push(returnTo || targetHref || notification.link_href || '/library')
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Button variant="ghost" onClick={handleBack} className="rounded-full px-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>

                {targetHref && (
                    <Button onClick={() => router.push(targetHref)} className="rounded-full px-5">
                        {getNotificationActionLabel(notification, pathname)}
                    </Button>
                )}
            </div>

            <div className={cn(
                'rounded-[2rem] border p-6 shadow-sm sm:p-8',
                isMidnight
                    ? 'border-slate-700/60 bg-[#10192b] text-slate-100'
                    : 'border-slate-200 bg-white text-slate-900'
            )}>
                <div className="flex items-start gap-4">
                    <div className={cn(
                        'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border',
                        isMidnight
                            ? 'border-slate-600/50 bg-slate-900/70 text-slate-200'
                            : 'border-slate-200 bg-slate-50 text-slate-700'
                    )}>
                        <Icon className="h-6 w-6" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-3">
                        <div>
                            <p className={cn('text-xs font-bold uppercase tracking-[0.18em]', isMidnight ? 'text-slate-500' : 'text-slate-400')}>
                                Notification
                            </p>
                            <h1 className="mt-2 font-serif text-3xl leading-tight">{getNotificationDisplayTitle(notification, pathname)}</h1>
                        </div>

                        {notification.summary && (
                            <p className={cn('text-base leading-7', isMidnight ? 'text-slate-300' : 'text-slate-600')}>
                                {notification.summary}
                            </p>
                        )}

                        {notification.body && (
                            <div className={cn(
                                'rounded-[1.5rem] border px-5 py-4 text-sm leading-7 whitespace-pre-line',
                                isMidnight
                                    ? 'border-slate-700/60 bg-slate-950/40 text-slate-200'
                                    : 'border-slate-200 bg-slate-50 text-slate-700'
                            )}>
                                {notification.body}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
