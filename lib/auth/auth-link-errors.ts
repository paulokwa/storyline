type SearchParamValue = string | string[] | null | undefined

type SearchParamSource =
    | URLSearchParams
    | Record<string, string | string[] | undefined>

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
