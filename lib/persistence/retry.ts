type RetryOptions = {
    label: string
    attempts?: number
    baseDelayMs?: number
    maxDelayMs?: number
    shouldRetry?: (error: unknown, attempt: number) => boolean
}

type MaybeErrorLike = {
    message?: unknown
    details?: unknown
    hint?: unknown
    code?: unknown
    status?: unknown
    statusCode?: unknown
    name?: unknown
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

function getErrorMessage(error: unknown) {
    if (error instanceof Error && error.message) return error.message
    if (typeof error === 'object' && error !== null) {
        const candidate = error as MaybeErrorLike
        const parts = [candidate.message, candidate.details, candidate.hint]
            .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        if (parts.length > 0) return parts.join(' | ')
    }

    return String(error)
}

function getErrorStatus(error: unknown) {
    if (typeof error !== 'object' || error === null) return null
    const candidate = error as MaybeErrorLike
    const status = typeof candidate.status === 'number'
        ? candidate.status
        : typeof candidate.statusCode === 'number'
            ? candidate.statusCode
            : null
    return status
}

export function isRetryablePersistenceError(error: unknown) {
    const status = getErrorStatus(error)
    if (status !== null) {
        if (status === 408 || status === 425 || status === 429) return true
        if (status >= 500) return true
    }

    if (typeof error !== 'object' || error === null) {
        return false
    }

    const candidate = error as MaybeErrorLike
    const code = typeof candidate.code === 'string' ? candidate.code : ''
    if (code === '57014') return false

    const message = getErrorMessage(error).toLowerCase()
    if (message.includes('failed to fetch')) return true
    if (message.includes('fetch failed')) return true
    if (message.includes('network')) return true
    if (message.includes('timed out')) return true
    if (message.includes('timeout')) return true
    if (message.includes('gateway')) return true
    if (message.includes('service unavailable')) return true
    if (message.includes('temporarily unavailable')) return true
    if (message.includes('connection')) return true

    return false
}

export async function withPersistenceRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions
): Promise<T> {
    const attempts = options.attempts ?? 3
    const baseDelayMs = options.baseDelayMs ?? 250
    const maxDelayMs = options.maxDelayMs ?? 1500

    let lastError: unknown

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            return await operation()
        } catch (error) {
            lastError = error
            const shouldRetry = attempt < attempts && (options.shouldRetry?.(error, attempt) ?? isRetryablePersistenceError(error))
            if (!shouldRetry) {
                throw error
            }

            const delayMs = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs)
            console.warn(`[persistence-retry] ${options.label} failed on attempt ${attempt}; retrying in ${delayMs}ms`, error)
            await sleep(delayMs)
        }
    }

    throw lastError
}
