import { createAdminClient } from '@/lib/supabase/admin'

export type AbuseReportItem = {
    user_id: string
    ip_address: string | null
    device_fingerprint: string | null
    block_count: number
    latest_block_at: string
    reasons: string[]
}

/**
 * Utility to identify suspicious activity clusters in AI usage.
 * Useful for admin dashboards to identify multi-accounting or botting.
 */
export async function getRecentAbuseSignals(limit = 50): Promise<AbuseReportItem[]> {
    const admin = createAdminClient()
    if (!admin) return []

    // Fetch blocked events from the last 24 hours
    const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await admin
        .from('ai_usage_events')
        .select('user_id, ip_address, device_fingerprint, error_code, started_at, metadata')
        .eq('status', 'blocked')
        .gte('started_at', windowStart)
        .order('started_at', { ascending: false })

    if (error || !data) {
        console.error('[abuse-report] Failed to fetch blocked events:', error)
        return []
    }

    // Aggregate by User ID (basic)
    const reportMap = new Map<string, AbuseReportItem>()

    data.forEach(event => {
        const key = event.user_id
        const existing = reportMap.get(key)
        
        const metadata = (event.metadata as any) || {}
        const reason = event.error_code || metadata.rateLimitType || 'unknown'

        if (existing) {
            existing.block_count++
            if (!existing.reasons.includes(reason)) {
                existing.reasons.push(reason)
            }
            if (new Date(event.started_at) > new Date(existing.latest_block_at)) {
                existing.latest_block_at = event.started_at
            }
        } else {
            reportMap.set(key, {
                user_id: event.user_id,
                ip_address: event.ip_address,
                device_fingerprint: event.device_fingerprint,
                block_count: 1,
                latest_block_at: event.started_at,
                reasons: [reason]
            })
        }
    })

    return Array.from(reportMap.values())
        .sort((a, b) => b.block_count - a.block_count)
        .slice(0, limit)
}

/**
 * Detects clusters where multiple different user IDs share an IP or Fingerprint.
 */
export async function getSuspiciousClusters(limit = 10) {
    const admin = createAdminClient()
    if (!admin) return []

    const windowStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days

    // This is best done via RPC in production for performance, 
    // but here we provide a logical helper.
    const { data, error } = await admin
        .from('ai_usage_events')
        .select('user_id, ip_address, device_fingerprint')
        .gte('started_at', windowStart)

    if (error || !data) return []

    const ipClusters = new Map<string, Set<string>>()
    const fpClusters = new Map<string, Set<string>>()

    data.forEach(event => {
        if (event.ip_address) {
            if (!ipClusters.has(event.ip_address)) ipClusters.set(event.ip_address, new Set())
            ipClusters.get(event.ip_address)!.add(event.user_id)
        }
        if (event.device_fingerprint) {
            if (!fpClusters.has(event.device_fingerprint)) fpClusters.set(event.device_fingerprint, new Set())
            fpClusters.get(event.device_fingerprint)!.add(event.user_id)
        }
    })

    const results: any[] = []

    ipClusters.forEach((users, ip) => {
        if (users.size > 1) {
            results.push({ type: 'ip', identifier: ip, userCount: users.size, userIds: Array.from(users) })
        }
    })

    fpClusters.forEach((users, fp) => {
        if (users.size > 1) {
            results.push({ type: 'fingerprint', identifier: fp, userCount: users.size, userIds: Array.from(users) })
        }
    })

    return results
        .sort((a, b) => b.userCount - a.userCount)
        .slice(0, limit)
}
