import 'server-only'

import type { BillingMode } from '@/lib/ai/modes'
import { createAdminClient } from '@/lib/supabase/admin'
import { logUsageEvent, type TrialEndpoint } from '@/lib/ai/trial-server'

type EnforceAiRateLimitParams = {
    userId: string
    requestKey: string
    endpoint: TrialEndpoint
    billingMode: BillingMode
    provider: 'openai' | 'gemini' | 'openrouter' | 'ollama'
    model?: string | null
    inputChars?: number
    normalizedEmail?: string | null
    ipAddress?: string | null
    deviceFingerprint?: string | null
    userAgent?: string | null
    metadata?: Record<string, unknown>
    minIntervalMs: number
    recordAcceptedRequest?: boolean
}

type EnforceAiRateLimitResult =
    | { ok: true }
    | { ok: false, retryAfterSeconds: number }

export async function enforceAiRateLimit(
    params: EnforceAiRateLimitParams
): Promise<EnforceAiRateLimitResult> {
    const admin = createAdminClient()
    if (!admin) {
        return { ok: true }
    }

    // 1. Standard User-Specific Check
    const { data: recentUserEvents, error: userError } = await admin
        .from('ai_usage_events')
        .select('started_at')
        .eq('user_id', params.userId)
        .eq('endpoint', params.endpoint)
        .order('started_at', { ascending: false })
        .limit(1)

    if (userError) {
        console.error('[ai-rate-limit] Failed to load recent user usage event:', userError)
        return { ok: true }
    }

    const latestUserStartedAt = recentUserEvents?.[0]?.started_at
    if (latestUserStartedAt) {
        const elapsedMs = Date.now() - new Date(latestUserStartedAt).getTime()
        if (elapsedMs < params.minIntervalMs) {
            const retryAfterSeconds = Math.max(1, Math.ceil((params.minIntervalMs - elapsedMs) / 1000))

            await logUsageEvent({
                userId: params.userId,
                requestKey: params.requestKey,
                endpoint: params.endpoint,
                billingMode: params.billingMode,
                provider: params.provider,
                model: params.model,
                status: 'blocked',
                inputChars: params.inputChars ?? 0,
                errorCode: 'rate_limited',
                httpStatus: 429,
                ipAddress: params.ipAddress,
                deviceFingerprint: params.deviceFingerprint,
                normalizedEmail: params.normalizedEmail,
                userAgent: params.userAgent,
                metadata: {
                    ...(params.metadata ?? {}),
                    rateLimitType: 'user',
                    rateLimitMs: params.minIntervalMs,
                    retryAfterSeconds,
                    limitedByStartedAt: latestUserStartedAt,
                },
            })

            return { ok: false, retryAfterSeconds }
        }
    }

    // 2. Cluster Check (Trial Only)
    // If multiple different user IDs share an IP or Fingerprint and hit the trial endpoints, 
    // we apply a shared throttle to prevent bypass via multi-accounting.
    if (params.billingMode === 'app_managed_trial' && (params.ipAddress || params.deviceFingerprint)) {
        let clusterQuery = admin
            .from('ai_usage_events')
            .select('user_id, started_at')
            .neq('user_id', params.userId) // Only check OTHER users in the cluster
            .eq('endpoint', params.endpoint)
            // Only care about recently active clusters
            .order('started_at', { ascending: false })
            .limit(1)

        if (params.ipAddress && params.deviceFingerprint) {
            clusterQuery = clusterQuery.or(`ip_address.eq.${params.ipAddress},device_fingerprint.eq.${params.deviceFingerprint}`)
        } else if (params.ipAddress) {
            clusterQuery = clusterQuery.eq('ip_address', params.ipAddress)
        } else if (params.deviceFingerprint) {
            clusterQuery = clusterQuery.eq('device_fingerprint', params.deviceFingerprint)
        }

        const { data: clusterEvents, error: clusterError } = await clusterQuery

        if (clusterError) {
            console.error('[ai-rate-limit] Failed to load cluster usage events:', clusterError)
        } else {
            const latestClusterStartedAt = clusterEvents?.[0]?.started_at
            if (latestClusterStartedAt) {
                const elapsedMs = Date.now() - new Date(latestClusterStartedAt).getTime()
                // Shared clusters are throttled slightly more aggressively (1.5x) if many accounts appear
                const clusterMinInterval = params.minIntervalMs * 1.5

                if (elapsedMs < clusterMinInterval) {
                    const retryAfterSeconds = Math.max(1, Math.ceil((clusterMinInterval - elapsedMs) / 1000))

                    await logUsageEvent({
                        userId: params.userId,
                        requestKey: params.requestKey,
                        endpoint: params.endpoint,
                        billingMode: params.billingMode,
                        provider: params.provider,
                        model: params.model,
                        status: 'blocked',
                        inputChars: params.inputChars ?? 0,
                        errorCode: 'rate_limited_cluster',
                        httpStatus: 429,
                        ipAddress: params.ipAddress,
                        deviceFingerprint: params.deviceFingerprint,
                        normalizedEmail: params.normalizedEmail,
                        userAgent: params.userAgent,
                        metadata: {
                            ...(params.metadata ?? {}),
                            rateLimitType: 'cluster',
                            rateLimitMs: clusterMinInterval,
                            retryAfterSeconds,
                            limitedByUserId: clusterEvents[0].user_id,
                            limitedByStartedAt: latestClusterStartedAt,
                        },
                    })

                    return { ok: false, retryAfterSeconds }
                }
            }
        }
    }

    if (params.recordAcceptedRequest) {
        await logUsageEvent({
            userId: params.userId,
            requestKey: params.requestKey,
            endpoint: params.endpoint,
            billingMode: params.billingMode,
            provider: params.provider,
            model: params.model,
            status: 'bypassed',
            inputChars: params.inputChars ?? 0,
            ipAddress: params.ipAddress,
            deviceFingerprint: params.deviceFingerprint,
            normalizedEmail: params.normalizedEmail,
            userAgent: params.userAgent,
            metadata: {
                ...(params.metadata ?? {}),
                rateLimitMs: params.minIntervalMs,
                rateLimitRecordedAt: new Date().toISOString(),
            },
        })
    }

    return { ok: true }
}

