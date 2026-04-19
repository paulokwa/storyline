export type CloudAiProvider = 'gemini' | 'openai'
export type SupportedAiProvider = CloudAiProvider | 'ollama'

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash'
export const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini'

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

        return {
            ok: response.ok,
            status: response.status,
            error: !response.ok ? data?.error?.message ?? 'Gemini request failed' : null,
        }
    }

    const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${apiKey}`,
        },
    })
    const data = await response.json().catch(() => null)

    return {
        ok: response.ok,
        status: response.status,
        error: !response.ok ? data?.error?.message ?? 'OpenAI request failed' : null,
    }
}

export async function createCloudTextStream({
    provider,
    apiKey,
    systemPrompt,
    userMessage,
    maxOutputTokens = 1000,
}: {
    provider: CloudAiProvider
    apiKey: string
    systemPrompt: string
    userMessage: string
    maxOutputTokens?: number
}) {
    if (provider === 'gemini') {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`

        return fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        body: JSON.stringify({
            model: DEFAULT_OPENAI_MODEL,
            instructions: systemPrompt,
            input: userMessage,
            max_output_tokens: maxOutputTokens,
            stream: true,
        }),
    })
}

export function createPlainTextStreamFromProviderResponse(
    provider: CloudAiProvider,
    response: Response,
    options?: {
        onChunk?: (text: string) => void
        onComplete?: (fullText: string) => void | Promise<void>
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
                    await options?.onComplete?.(fullText)
                } catch (error) {
                    await options?.onError?.(error)
                    throw error
                } finally {
                    controller.close()
                }
            },
        })
    }

    return new ReadableStream({
        async start(controller) {
            let buffer = ''
            let fullText = ''

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
                await options?.onComplete?.(fullText)
            } catch (error) {
                await options?.onError?.(error)
                throw error
            } finally {
                controller.close()
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
