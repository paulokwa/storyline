type SearchParamValue = string | string[] | null | undefined

type SearchParamSource =
    | URLSearchParams
    | Record<string, string | string[] | undefined>

const LOGIN_ALREADY_USED_PATH = '/login?verification=already-used'
const INVALID_AUTH_LINK_ERRORS = new Set([
    'access_denied',
    'invalid_or_expired_token',
])

const INVALID_AUTH_LINK_ERROR_CODES = new Set([
    'otp_expired',
])

const INVALID_AUTH_LINK_DESCRIPTION_PATTERNS = [
    'email link is invalid or has expired',
    'email link has expired',
    'email link is invalid',
    'invalid or expired',
    'invalid or has expired',
]

function readParam(source: SearchParamSource, key: string): string {
    const value = source instanceof URLSearchParams ? source.get(key) : source[key]
    return getFirstParamValue(value).trim()
}

function getFirstParamValue(value: SearchParamValue): string {
    if (Array.isArray(value)) {
        return value[0] ?? ''
    }

    return value ?? ''
}

export function getHashSearchParams(hash: string) {
    return new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
}

function getConfiguredSiteUrl() {
    const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()

    if (!configuredUrl) {
        return null
    }

    try {
        return new URL(configuredUrl.includes('http') ? configuredUrl : `https://${configuredUrl}`)
    } catch {
        return null
    }
}

function isLocalhost(hostname: string) {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

function isNetlifyHost(hostname: string) {
    return hostname.endsWith('.netlify.app')
}

export function getAlreadyUsedVerificationHref(currentOrigin?: string) {
    const configuredSiteUrl = getConfiguredSiteUrl()
    const currentUrl = currentOrigin ? new URL(currentOrigin) : null

    if (currentUrl && isLocalhost(currentUrl.hostname)) {
        return new URL(LOGIN_ALREADY_USED_PATH, currentUrl.origin).toString()
    }

    if (
        configuredSiteUrl &&
        currentUrl &&
        isNetlifyHost(currentUrl.hostname) &&
        currentUrl.hostname !== configuredSiteUrl.hostname
    ) {
        return new URL(LOGIN_ALREADY_USED_PATH, configuredSiteUrl.origin).toString()
    }

    if (configuredSiteUrl && !currentUrl) {
        return new URL(LOGIN_ALREADY_USED_PATH, configuredSiteUrl.origin).toString()
    }

    if (currentUrl) {
        return new URL(LOGIN_ALREADY_USED_PATH, currentUrl.origin).toString()
    }

    if (configuredSiteUrl) {
        return new URL(LOGIN_ALREADY_USED_PATH, configuredSiteUrl.origin).toString()
    }

    return LOGIN_ALREADY_USED_PATH
}

export function hasInvalidAuthLinkError(source: SearchParamSource) {
    const error = readParam(source, 'error').toLowerCase()
    const errorCode = readParam(source, 'error_code').toLowerCase()
    const errorDescription = readParam(source, 'error_description').toLowerCase()

    return (
        INVALID_AUTH_LINK_ERRORS.has(error) ||
        INVALID_AUTH_LINK_ERROR_CODES.has(errorCode) ||
        INVALID_AUTH_LINK_DESCRIPTION_PATTERNS.some((pattern) => errorDescription.includes(pattern))
    )
}
