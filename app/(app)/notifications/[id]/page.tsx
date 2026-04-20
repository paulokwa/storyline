import { notFound } from 'next/navigation'
import NotificationDetailClient from '@/components/notifications/NotificationDetailClient'
import type { NotificationRecord } from '@/lib/notifications'
import { requireVerifiedUser } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'

export default async function NotificationDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ returnTo?: string }>
}) {
    const [{ id }, { returnTo }] = await Promise.all([params, searchParams])
    const user = await requireVerifiedUser()
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle()

    if (error) {
        console.error('Failed to load notification detail:', error)
    }

    if (!data) {
        notFound()
    }

    return (
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
            <NotificationDetailClient
                notification={data as NotificationRecord}
                returnTo={typeof returnTo === 'string' ? returnTo : null}
            />
        </div>
    )
}
