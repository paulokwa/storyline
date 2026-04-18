import { createClient } from '@/lib/supabase/server'
import { DEFAULT_OPENAI_MODEL, extractOpenAiOutputText } from '@/lib/ai/providers'

export const maxDuration = 30

const MIN_CHARS = 50
const MAX_CHARS = 12_000
const RATE_LIMIT_MS = 10_000 // 10 seconds between requests per user

// ---------------------------------------------------------------------------
// In-memory rate limit store
// Key: user.id → timestamp of last accepted request
// Note: resets on serverless cold start — acceptable for this use case.
// ---------------------------------------------------------------------------
const lastRequestAt = new Map<string, number>()

const SYSTEM_PROMPT = `You are a professional fiction editor and writing coach.
Analyze the scene excerpt provided inside the <scene> tags and return ONLY a valid JSON object with exactly these fields:
- "summary": A concise 2-3 sentence description of what happens in the scene.
- "tension": An assessment of the dramatic tension — is it building, flat, or releasing? Be specific.
- "pacing": Is the scene too slow, well-balanced, or rushed? Explain briefly why.
- "dialogue": Assess the naturalism, character voice, and subtext in the dialogue. If there is no dialogue, say "No dialogue in this scene."
- "suggestions": An array of 2-5 concrete, actionable suggestions to improve the scene.

Rules:
- Return ONLY the raw JSON object. No markdown, no code fences, no extra text.
- Every field must be present. Do not omit any key.
- "suggestions" must be an array of strings, even if there is only one item.
- Be encouraging but honest. Writers benefit most from specific, targeted feedback.`

interface AnalysisResult {
    summary: string
    tension: string
    pacing: string
    dialogue: string
    suggestions: string[]
    provider?: string
}

function isValidAnalysis(obj: unknown): obj is AnalysisResult {
    if (typeof obj !== 'object' || obj === null) return false
    const o = obj as Record<string, unknown>
    return (
        typeof o.summary === 'string' &&
        typeof o.tension === 'string' &&
        typeof o.pacing === 'string' &&
        typeof o.dialogue === 'string' &&
        Array.isArray(o.suggestions) &&
        o.suggestions.every((s: unknown) => typeof s === 'string')
    )
}

/** Truncate a value for logging — prevents verbose AI output in server logs */
function trunc(value: unknown, max = 300): string {
    const s = typeof value === 'string' ? value : JSON.stringify(value) ?? ''
    return s.length > max ? s.slice(0, max) + '…[truncated]' : s
}

export async function POST(req: Request) {
    // ── Auth ────────────────────────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return new Response('Unauthorized', { status: 401 })
    }

    // ── Rate limiting (must run before any expensive work) ──────────────────
    const now = Date.now()
    const last = lastRequestAt.get(user.id) ?? 0
    if (now - last < RATE_LIMIT_MS) {
        return new Response('RATE_LIMITED', { status: 429 })
    }
    // Record timestamp immediately — even if the request later fails, the
    // slot is consumed. This prevents retry-storms on bad input.
    lastRequestAt.set(user.id, now)

    // ── Parse body ───────────────────────────────────────────────────────────
    let body: { sceneText?: unknown }
    try {
        body = await req.json()
    } catch {
        return new Response('INVALID_INPUT', { status: 400 })
    }

    const { sceneText } = body

    // ── Validate input ───────────────────────────────────────────────────────
    if (typeof sceneText !== 'string' || sceneText.trim().length === 0) {
        return new Response('INVALID_INPUT', { status: 400 })
    }

    const trimmed = sceneText.trim()

    if (trimmed.length < MIN_CHARS) {
        return new Response('SCENE_TOO_SHORT', { status: 400 })
    }

    if (trimmed.length > MAX_CHARS) {
        return new Response('SCENE_TOO_LARGE', { status: 413 })
    }

    // ── Fetch user AI settings ───────────────────────────────────────────────────
    const { data: settings } = (await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', user.id)
        .single()) as { data: any | null }

    if (!settings || !settings.ai_enabled) {
        return new Response('AI_DISABLED', { status: 403 })
    }

    const { ai_provider, api_key } = settings

    if ((ai_provider !== 'gemini' && ai_provider !== 'openai') || !api_key) {
        return new Response('NO_API_KEY', { status: 403 })
    }

    // ── Wrap scene text in delimiters (prompt injection hardening) ───────────
    const delimitedScene = `<scene>\n${trimmed}\n</scene>`

    let rawText = ''
    if (ai_provider === 'gemini') {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${api_key}`

        let geminiResponse: Response
        try {
            geminiResponse = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        { role: 'user', parts: [{ text: delimitedScene }] },
                    ],
                    system_instruction: {
                        parts: [{ text: SYSTEM_PROMPT }],
                    },
                    generationConfig: {
                        maxOutputTokens: 2000,
                        responseMimeType: 'application/json',
                        thinkingConfig: {
                            thinkingBudget: 0,
                        },
                    },
                }),
            })
        } catch (err) {
            console.error('[analyze-scene] Gemini fetch failed:', err)
            return new Response('AI_SERVICE_ERROR', { status: 502 })
        }

        if (!geminiResponse.ok) {
            const errBody = await geminiResponse.text()
            console.error('[analyze-scene] Gemini error response:', geminiResponse.status, trunc(errBody))
            return new Response(`AI_SERVICE_ERROR: ${geminiResponse.status} ${trunc(errBody, 100)}`, { status: 502 })
        }

        try {
            const geminiData = await geminiResponse.json()
            const candidate = geminiData?.candidates?.[0]

            if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
                console.warn('[analyze-scene] AI finished with non-STOP reason:', candidate.finishReason)
            }

            const parts = candidate?.content?.parts || []
            rawText = parts.map((p: any) => p.text || '').join('').trim()
        } catch (err) {
            console.error('[analyze-scene] Failed to parse Gemini JSON envelope:', err)
            return new Response('INVALID_AI_RESPONSE', { status: 502 })
        }
    } else {
        let openAiResponse: Response
        try {
            openAiResponse = await fetch('https://api.openai.com/v1/responses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${api_key}`,
                },
                body: JSON.stringify({
                    model: DEFAULT_OPENAI_MODEL,
                    instructions: SYSTEM_PROMPT,
                    input: delimitedScene,
                    max_output_tokens: 1200,
                    text: {
                        format: {
                            type: 'json_schema',
                            name: 'scene_analysis',
                            strict: true,
                            schema: {
                                type: 'object',
                                additionalProperties: false,
                                required: ['summary', 'tension', 'pacing', 'dialogue', 'suggestions'],
                                properties: {
                                    summary: { type: 'string' },
                                    tension: { type: 'string' },
                                    pacing: { type: 'string' },
                                    dialogue: { type: 'string' },
                                    suggestions: {
                                        type: 'array',
                                        minItems: 2,
                                        maxItems: 5,
                                        items: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                }),
            })
        } catch (err) {
            console.error('[analyze-scene] OpenAI fetch failed:', err)
            return new Response('AI_SERVICE_ERROR', { status: 502 })
        }

        if (!openAiResponse.ok) {
            const errBody = await openAiResponse.text()
            console.error('[analyze-scene] OpenAI error response:', openAiResponse.status, trunc(errBody))
            return new Response(`AI_SERVICE_ERROR: ${openAiResponse.status} ${trunc(errBody, 100)}`, { status: 502 })
        }

        try {
            const openAiData = await openAiResponse.json()
            rawText = extractOpenAiOutputText(openAiData)
        } catch (err) {
            console.error('[analyze-scene] Failed to parse OpenAI JSON envelope:', err)
            return new Response('INVALID_AI_RESPONSE', { status: 502 })
        }
    }

    if (!rawText) {
        console.error('[analyze-scene] Gemini returned empty text')
        return new Response('INVALID_AI_RESPONSE', { status: 502 })
    }

    // Strip markdown code fences if Gemini ignores the instruction
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

    let finalAnalysis: any = null
    try {
        finalAnalysis = JSON.parse(cleaned)
    } catch (err) {
        console.error('[analyze-scene] Failed to JSON.parse AI output:', err, '\nRaw (truncated):', trunc(cleaned))
        return new Response('INVALID_AI_RESPONSE', { status: 502 })
    }

    if (!isValidAnalysis(finalAnalysis)) {
        console.error('[analyze-scene] AI response failed shape validation:', trunc(finalAnalysis))
        return new Response('INVALID_AI_RESPONSE', { status: 502 })
    }

    finalAnalysis.provider = ai_provider

    return new Response(JSON.stringify(finalAnalysis), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    })
}
