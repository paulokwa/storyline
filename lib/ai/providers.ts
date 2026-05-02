import type { ProviderUsage } from '@/lib/ai/trial'

export type CloudAiProvider = 'gemini' | 'openai'
export type SupportedAiProvider = CloudAiProvider | 'ollama'

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash'
export const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini'

export function isAbortLikeError(error: unknown) {
    if (!error || typeof error !== 'object') return false

    const maybeError = error as { name?: string, code?: string, message?: string }
    return (
        maybeError.name === 'AbortError' ||
        maybeError.name === 'ResponseAborted' ||
        maybeError.code === 'ECONNRESET' ||
        maybeError.message === 'aborted'
    )
}

export function getAiProviderLabel(provider: string | null | undefined) {
    switch (provider) {
        case 'gemini':
            return 'Gemini'
        case 'openai':
            return 'OpenAI'
        case 'ollama':
            return 'Ollama'
        default:
            return 'AI'
    }
}

export function getCloudProviderErrorMessage(
    provider: CloudAiProvider,
    status: number,
    rawError?: string | null
) {
    const providerLabel = getAiProviderLabel(provider)
    const detail = rawError?.toLowerCase() ?? ''

    if (status === 401) {
        return `We couldn't verify your ${providerLabel} API key. Check the key in Settings and try again.`
    }

    if (
        detail.includes('insufficient_quota') ||
        detail.includes('quota') ||
        detail.includes('billing') ||
        detail.includes('credit')
    ) {
        return `${providerLabel} needs available billing or usage credits before Storyline can use it.`
    }

    if (status === 403) {
        return `${providerLabel} denied this request. Check that your account and API key have the right access, then try again.`
    }

    if (status === 429 || detail.includes('rate limit') || detail.includes('too many requests')) {
        return `${providerLabel} is busy right now. Please wait a moment and try again.`
    }

    if (status >= 500) {
        return `${providerLabel} is having a temporary problem right now. Please try again in a moment.`
    }

    return `Storyline couldn't get a response from ${providerLabel}. Please try again.`
}

export function maskApiKey(raw: string | null | undefined) {
    if (!raw) return null
    const suffix = raw.slice(-4)
    return raw.length > 8 ? `••••••••••••${suffix}` : '••••'
}

export async function testCloudProviderKey(provider: CloudAiProvider, apiKey: string) {
    if (provider === 'gemini') {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
            method: 'GET',
        })
        const data = await response.json().catch(() => null)
        const rawError = data?.error?.message ?? null

        return {
            ok: response.ok,
            status: response.status,
            error: !response.ok ? getCloudProviderErrorMessage(provider, response.status, rawError) : null,
        }
    }

    const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${apiKey}`,
        },
    })
    const data = await response.json().catch(() => null)
    const rawError = data?.error?.message ?? null

    return {
        ok: response.ok,
        status: response.status,
        error: !response.ok ? getCloudProviderErrorMessage(provider, response.status, rawError) : null,
    }
}

export async function createCloudTextStream({
    provider,
    apiKey,
    systemPrompt,
    userMessage,
    maxOutputTokens = 1000,
    abortSignal,
}: {
    provider: CloudAiProvider
    apiKey: string
    systemPrompt: string
    userMessage: string
    maxOutputTokens?: number
    abortSignal?: AbortSignal
}) {
    if (provider === 'gemini') {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`

        return fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: abortSignal,
            body: JSON.stringify({
                contents: [
                    { role: 'user', parts: [{ text: userMessage }] },
                ],
                system_instruction: {
                    parts: [{ text: systemPrompt }],
                },
                generationConfig: {
                    maxOutputTokens,
                    thinkingConfig: {
                        thinkingBudget: 0,
                    },
                },
            }),
        })
    }

    return fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        signal: abortSignal,
        body: JSON.stringify({
            model: DEFAULT_OPENAI_MODEL,
            instructions: systemPrompt,
            input: userMessage,
            max_output_tokens: maxOutputTokens,
            stream: true,
        }),
    })
}

function asPositiveInteger(value: unknown) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? Math.round(value)
        : 0
}

export function extractOpenAiUsage(payload: unknown): ProviderUsage | null {
    if (!payload || typeof payload !== 'object') return null

    const usage = (payload as {
        usage?: {
            input_tokens?: number
            output_tokens?: number
            total_tokens?: number
        }
    }).usage

    if (!usage) return null

    const inputTokens = asPositiveInteger(usage.input_tokens)
    const outputTokens = asPositiveInteger(usage.output_tokens)
    const totalTokens = asPositiveInteger(usage.total_tokens)

    if (inputTokens === 0 && outputTokens === 0 && totalTokens === 0) {
        return null
    }

    return {
        inputTokens,
        outputTokens,
        totalTokens: totalTokens || null,
        source: 'provider_reported',
    }
}

export function extractGeminiUsage(payload: unknown): ProviderUsage | null {
    if (!payload || typeof payload !== 'object') return null

    const usage = (payload as {
        usageMetadata?: {
            promptTokenCount?: number
            candidatesTokenCount?: number
            totalTokenCount?: number
        }
    }).usageMetadata

    if (!usage) return null

    const inputTokens = asPositiveInteger(usage.promptTokenCount)
    const outputTokens = asPositiveInteger(usage.candidatesTokenCount)
    const totalTokens = asPositiveInteger(usage.totalTokenCount)

    if (inputTokens === 0 && outputTokens === 0 && totalTokens === 0) {
        return null
    }

    return {
        inputTokens,
        outputTokens,
        totalTokens: totalTokens || null,
        source: 'provider_reported',
    }
}

export function createPlainTextStreamFromProviderResponse(
    provider: CloudAiProvider,
    response: Response,
    options?: {
        onChunk?: (text: string) => void
        onComplete?: (result: { fullText: string, usage: ProviderUsage | null }) => void | Promise<void>
        onAbort?: () => void | Promise<void>
        onError?: (error: unknown) => void | Promise<void>
    }
) {
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    const encoder = new TextEncoder()

    if (provider === 'gemini') {
        return new ReadableStream({
            async start(controller) {
                let buffer = ''
                let fullText = ''
                let usage: ProviderUsage | null = null

                try {
                    while (true) {
                        const { done, value } = await reader.read()
                        if (done) break

                        buffer += decoder.decode(value, { stream: true })
                        const lines = buffer.split('\n')
                        buffer = lines.pop() ?? ''

                        for (const line of lines) {
                            if (!line.startsWith('data: ')) continue

                            try {
                                const data = JSON.parse(line.slice(6))
                                const chunkUsage = extractGeminiUsage(data)
                                if (chunkUsage) usage = chunkUsage
                                const parts = data?.candidates?.[0]?.content?.parts
                                if (!parts) continue

                                for (const part of parts) {
                                    if (part.text) {
                                        fullText += part.text
                                        options?.onChunk?.(part.text)
                                        controller.enqueue(encoder.encode(part.text))
                                    }
                                }
                            } catch {
                                // Ignore malformed Gemini chunks.
                            }
                        }
                    }
                    await options?.onComplete?.({ fullText, usage })
                } catch (error) {
                    if (isAbortLikeError(error)) {
                        await options?.onAbort?.()
                        return
                    }
                    await options?.onError?.(error)
                    throw error
                } finally {
                    try {
                        controller.close()
                    } catch {
                        // Stream may already be closed after an abort.
                    }
                }
            },
        })
    }

    return new ReadableStream({
        async start(controller) {
            let buffer = ''
            let fullText = ''
            let usage: ProviderUsage | null = null

            try {
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    buffer += decoder.decode(value, { stream: true })
                    const events = buffer.split('\n\n')
                    buffer = events.pop() ?? ''

                    for (const eventBlock of events) {
                        const dataLines = eventBlock
                            .split('\n')
                            .filter((line) => line.startsWith('data: '))
                            .map((line) => line.slice(6))

                        if (!dataLines.length) continue

                        const payload = dataLines.join('\n').trim()
                        if (!payload || payload === '[DONE]') continue

                        try {
                            const event = JSON.parse(payload)
                            const eventUsage = extractOpenAiUsage(event?.response ?? event)
                            if (eventUsage) usage = eventUsage

                            if (event.type === 'response.output_text.delta' && event.delta) {
                                fullText += event.delta
                                options?.onChunk?.(event.delta)
                                controller.enqueue(encoder.encode(event.delta))
                            } else if (event.type === 'response.refusal.delta' && event.delta) {
                                fullText += event.delta
                                options?.onChunk?.(event.delta)
                                controller.enqueue(encoder.encode(event.delta))
                            }
                        } catch {
                            // Ignore malformed OpenAI chunks.
                        }
                    }
                }
                await options?.onComplete?.({ fullText, usage })
            } catch (error) {
                if (isAbortLikeError(error)) {
                    await options?.onAbort?.()
                    return
                }
                await options?.onError?.(error)
                throw error
            } finally {
                try {
                    controller.close()
                } catch {
                    // Stream may already be closed after an abort.
                }
            }
        },
    })
}

type OpenAiOutputTextContent = {
    type?: string
    text?: string
}

type OpenAiOutputItem = {
    content?: OpenAiOutputTextContent[]
}

type OpenAiResponsePayload = {
    output_text?: string
    output?: OpenAiOutputItem[]
}

export function extractOpenAiOutputText(payload: OpenAiResponsePayload) {
    if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
        return payload.output_text.trim()
    }

    const outputs = Array.isArray(payload?.output) ? payload.output : []
    const text = outputs
        .flatMap((item) => Array.isArray(item?.content) ? item.content : [])
        .filter((content) => content?.type === 'output_text' && typeof content?.text === 'string')
        .map((content) => content.text as string)
        .join('')
        .trim()

    return text
}
