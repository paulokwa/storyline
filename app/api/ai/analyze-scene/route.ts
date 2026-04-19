import { createClient } from '@/lib/supabase/server'
import { DEFAULT_OPENAI_MODEL, extractOpenAiOutputText } from '@/lib/ai/providers'
import { getAiRuntimeState } from '@/lib/ai/runtime'
import {
    APP_MANAGED_OPENAI_MODEL,
    estimateTokensFromChars,
    estimateTrialReserveMicros,
} from '@/lib/ai/trial'
import { logUsageEvent } from '@/lib/ai/trial-server'
import { getRequestContext } from '@/lib/server/request-context'

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
    let body: { sceneText?: unknown, requestId?: unknown, deviceFingerprint?: unknown }
    try {
        body = await req.json()
    } catch {
        return new Response('INVALID_INPUT', { status: 400 })
    }

    const { sceneText, requestId, deviceFingerprint } = body
    const requestKey = typeof requestId === 'string' && requestId ? requestId : crypto.randomUUID()
    const requestContext = getRequestContext(req, typeof deviceFingerprint === 'string' ? deviceFingerprint : null)

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

    const runtime = await getAiRuntimeState(supabase, user.id)
    const metadata = { endpoint: 'analyze_scene' }

    if (runtime.aiSettings && !runtime.aiSettings.ai_enabled) {
        return new Response('AI_DISABLED', { status: 403 })
    }

    if (runtime.billingMode === 'ollama') {
        return new Response('OLLAMA_NOT_SUPPORTED_FOR_SCENE_ANALYSIS', { status: 400 })
    }

    const ai_provider = runtime.provider
    const api_key = runtime.apiKey

    if ((ai_provider !== 'gemini' && ai_provider !== 'openai') || !api_key) {
        return new Response(runtime.billingMode === 'app_managed_trial' ? 'TRIAL_UNAVAILABLE' : 'NO_API_KEY', { status: 403 })
    }

    if (runtime.billingMode === 'app_managed_trial') {
        if (runtime.trialAccount?.status !== 'active') {
            return new Response(runtime.trialAccount?.status === 'exhausted' ? 'TRIAL_EXHAUSTED' : 'TRIAL_UNAVAILABLE', {
                status: runtime.trialAccount?.status === 'exhausted' ? 402 : 403,
            })
        }

        const reserveResult = await supabase.rpc('reserve_ai_trial_usage', {
            p_user_id: user.id,
            p_request_key: requestKey,
            p_endpoint: 'analyze_scene',
            p_provider: ai_provider,
            p_model: APP_MANAGED_OPENAI_MODEL,
            p_reserved_micros: estimateTrialReserveMicros({
                endpoint: 'analyze_scene',
                inputChars: trimmed.length,
                outputTokensCap: 1200,
            }),
            p_input_chars: trimmed.length,
            p_estimated_input_tokens: estimateTokensFromChars(trimmed),
            p_estimated_output_tokens: 1200,
            p_ip_address: requestContext.ipAddress,
            p_device_fingerprint: requestContext.deviceFingerprint,
            p_user_agent: requestContext.userAgent,
            p_metadata: metadata,
        })

        if (reserveResult.error) {
            return new Response('TRIAL_RESERVE_FAILED', { status: 500 })
        }

        const reserveData = reserveResult.data as { ok?: boolean, status?: string, reason?: string } | null
        if (!reserveData?.ok) {
            return new Response(
                reserveData?.status === 'exhausted' ? 'TRIAL_EXHAUSTED' : (reserveData?.reason || 'TRIAL_UNAVAILABLE'),
                { status: reserveData?.status === 'exhausted' ? 402 : 403 }
            )
        }
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
            if (runtime.billingMode === 'app_managed_trial') {
                await supabase.rpc('fail_ai_trial_usage', {
                    p_user_id: user.id,
                    p_request_key: requestKey,
                    p_error_code: 'gemini_fetch_failed',
                    p_http_status: 502,
                    p_metadata: metadata,
                })
            }
            return new Response('AI_SERVICE_ERROR', { status: 502 })
        }

        if (!geminiResponse.ok) {
            const errBody = await geminiResponse.text()
            console.error('[analyze-scene] Gemini error response:', geminiResponse.status, trunc(errBody))
            if (runtime.billingMode === 'app_managed_trial') {
                await supabase.rpc('fail_ai_trial_usage', {
                    p_user_id: user.id,
                    p_request_key: requestKey,
                    p_error_code: `provider_${geminiResponse.status}`,
                    p_http_status: geminiResponse.status,
                    p_metadata: metadata,
                })
            } else {
                await logUsageEvent({
                    userId: user.id,
                    requestKey,
                    endpoint: 'analyze_scene',
                    billingMode: runtime.billingMode,
                    provider: ai_provider,
                    model: runtime.model,
                    status: 'failed',
                    inputChars: trimmed.length,
                    errorCode: `provider_${geminiResponse.status}`,
                    httpStatus: geminiResponse.status,
                    ipAddress: requestContext.ipAddress,
                    deviceFingerprint: requestContext.deviceFingerprint,
                    normalizedEmail: runtime.trialAccount?.normalized_email ?? null,
                    userAgent: requestContext.userAgent,
                    metadata,
                })
            }
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
            if (runtime.billingMode === 'app_managed_trial') {
                await supabase.rpc('fail_ai_trial_usage', {
                    p_user_id: user.id,
                    p_request_key: requestKey,
                    p_error_code: 'invalid_gemini_response',
                    p_http_status: 502,
                    p_metadata: metadata,
                })
            }
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
            if (runtime.billingMode === 'app_managed_trial') {
                await supabase.rpc('fail_ai_trial_usage', {
                    p_user_id: user.id,
                    p_request_key: requestKey,
                    p_error_code: 'openai_fetch_failed',
                    p_http_status: 502,
                    p_metadata: metadata,
                })
            }
            return new Response('AI_SERVICE_ERROR', { status: 502 })
        }

        if (!openAiResponse.ok) {
            const errBody = await openAiResponse.text()
            console.error('[analyze-scene] OpenAI error response:', openAiResponse.status, trunc(errBody))
            if (runtime.billingMode === 'app_managed_trial') {
                await supabase.rpc('fail_ai_trial_usage', {
                    p_user_id: user.id,
                    p_request_key: requestKey,
                    p_error_code: `provider_${openAiResponse.status}`,
                    p_http_status: openAiResponse.status,
                    p_metadata: metadata,
                })
            } else {
                await logUsageEvent({
                    userId: user.id,
                    requestKey,
                    endpoint: 'analyze_scene',
                    billingMode: runtime.billingMode,
                    provider: ai_provider,
                    model: runtime.model,
                    status: 'failed',
                    inputChars: trimmed.length,
                    errorCode: `provider_${openAiResponse.status}`,
                    httpStatus: openAiResponse.status,
                    ipAddress: requestContext.ipAddress,
                    deviceFingerprint: requestContext.deviceFingerprint,
                    normalizedEmail: runtime.trialAccount?.normalized_email ?? null,
                    userAgent: requestContext.userAgent,
                    metadata,
                })
            }
            return new Response(`AI_SERVICE_ERROR: ${openAiResponse.status} ${trunc(errBody, 100)}`, { status: 502 })
        }

        try {
            const openAiData = await openAiResponse.json()
            rawText = extractOpenAiOutputText(openAiData)
        } catch (err) {
            console.error('[analyze-scene] Failed to parse OpenAI JSON envelope:', err)
            if (runtime.billingMode === 'app_managed_trial') {
                await supabase.rpc('fail_ai_trial_usage', {
                    p_user_id: user.id,
                    p_request_key: requestKey,
                    p_error_code: 'invalid_openai_response',
                    p_http_status: 502,
                    p_metadata: metadata,
                })
            }
            return new Response('INVALID_AI_RESPONSE', { status: 502 })
        }
    }

    if (!rawText) {
        console.error('[analyze-scene] Gemini returned empty text')
        if (runtime.billingMode === 'app_managed_trial') {
            await supabase.rpc('fail_ai_trial_usage', {
                p_user_id: user.id,
                p_request_key: requestKey,
                p_error_code: 'empty_ai_response',
                p_http_status: 502,
                p_metadata: metadata,
            })
        }
        return new Response('INVALID_AI_RESPONSE', { status: 502 })
    }

    // Strip markdown code fences if Gemini ignores the instruction
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

    let finalAnalysis: any = null
    try {
        finalAnalysis = JSON.parse(cleaned)
    } catch (err) {
        console.error('[analyze-scene] Failed to JSON.parse AI output:', err, '\nRaw (truncated):', trunc(cleaned))
        if (runtime.billingMode === 'app_managed_trial') {
            await supabase.rpc('fail_ai_trial_usage', {
                p_user_id: user.id,
                p_request_key: requestKey,
                p_error_code: 'json_parse_failed',
                p_http_status: 502,
                p_metadata: metadata,
            })
        }
        return new Response('INVALID_AI_RESPONSE', { status: 502 })
    }

    if (!isValidAnalysis(finalAnalysis)) {
        console.error('[analyze-scene] AI response failed shape validation:', trunc(finalAnalysis))
        if (runtime.billingMode === 'app_managed_trial') {
            await supabase.rpc('fail_ai_trial_usage', {
                p_user_id: user.id,
                p_request_key: requestKey,
                p_error_code: 'invalid_analysis_shape',
                p_http_status: 502,
                p_metadata: metadata,
            })
        }
        return new Response('INVALID_AI_RESPONSE', { status: 502 })
    }

    finalAnalysis.provider = ai_provider

    if (runtime.billingMode === 'app_managed_trial') {
        await supabase.rpc('finalize_ai_trial_usage', {
            p_user_id: user.id,
            p_request_key: requestKey,
            p_final_micros: estimateTrialReserveMicros({
                endpoint: 'analyze_scene',
                inputChars: trimmed.length,
                outputChars: cleaned.length,
            }),
            p_output_chars: cleaned.length,
            p_http_status: 200,
            p_metadata: metadata,
        })
    } else {
        await logUsageEvent({
            userId: user.id,
            requestKey,
            endpoint: 'analyze_scene',
            billingMode: runtime.billingMode,
            provider: ai_provider,
            model: runtime.model,
            status: 'completed',
            inputChars: trimmed.length,
            outputChars: cleaned.length,
            httpStatus: 200,
            ipAddress: requestContext.ipAddress,
            deviceFingerprint: requestContext.deviceFingerprint,
            normalizedEmail: runtime.trialAccount?.normalized_email ?? null,
            userAgent: requestContext.userAgent,
            metadata,
        })
    }

    return new Response(JSON.stringify(finalAnalysis), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    })
}
