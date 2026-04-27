import 'server-only'

import type { BillingMode } from '@/lib/ai/modes'
import { createAdminClient } from '@/lib/supabase/admin'
import { logUsageEvent, type TrialEndpoint } from '@/lib/ai/trial-server'

type EnforceAiRateLimitParams = {
    userId: string
    requestKey: string
    endpoint: TrialEndpoint
    billingMode: BillingMode
    provider: 'openai' | 'gemini' | 'ollama'
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

    const { data: recentEvents, error } = await admin
        .from('ai_usage_events')
        .select('started_at')
        .eq('user_id', params.userId)
        .eq('endpoint', params.endpoint)
        .order('started_at', { ascending: false })
        .limit(1)

    if (error) {
        console.error('[ai-rate-limit] Failed to load recent usage event:', error)
        return { ok: true }
    }

    const latestStartedAt = recentEvents?.[0]?.started_at
    if (latestStartedAt) {
        const elapsedMs = Date.now() - new Date(latestStartedAt).getTime()
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
                    rateLimitMs: params.minIntervalMs,
                    retryAfterSeconds,
                    limitedByStartedAt: latestStartedAt,
                },
            })

            return { ok: false, retryAfterSeconds }
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
