'use client'

let fingerprintPromise: Promise<string | null> | null = null

async function hashText(input: string) {
    const encoded = new TextEncoder().encode(input)
    const digest = await crypto.subtle.digest('SHA-256', encoded)
    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')
}

export async function getDeviceFingerprint() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined' || !globalThis.crypto?.subtle) {
        return null
    }

    if (!fingerprintPromise) {
        fingerprintPromise = (async () => {
            const parts = [
                navigator.userAgent,
                navigator.language,
                navigator.languages?.join(',') ?? '',
                navigator.platform,
                String(navigator.hardwareConcurrency ?? ''),
                String((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? ''),
                Intl.DateTimeFormat().resolvedOptions().timeZone,
                String(screen.width),
                String(screen.height),
                String(screen.colorDepth),
                String(navigator.maxTouchPoints ?? 0),
            ]

            return hashText(parts.join('|'))
        })()
    }

    return fingerprintPromise
}
