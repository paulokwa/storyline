import type { NextRequest } from 'next/server'

export type RequestContext = {
    ipAddress: string | null
    userAgent: string | null
    acceptLanguage: string | null
    deviceFingerprint: string | null
}

function parseForwardedFor(value: string | null) {
    if (!value) return null
    const first = value.split(',')[0]?.trim()
    return first || null
}

export function getRequestContext(
    request: Request | NextRequest,
    deviceFingerprint?: string | null
): RequestContext {
    const ipAddress =
        parseForwardedFor(request.headers.get('x-forwarded-for')) ||
        request.headers.get('x-nf-client-connection-ip') ||
        request.headers.get('x-real-ip') ||
        null

    return {
        ipAddress,
        userAgent: request.headers.get('user-agent'),
        acceptLanguage: request.headers.get('accept-language'),
        deviceFingerprint: deviceFingerprint?.trim() || request.headers.get('x-storyline-device-fingerprint'),
    }
}
