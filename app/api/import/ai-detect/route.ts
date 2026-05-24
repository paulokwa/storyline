import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
    DEFAULT_GEMINI_MODEL,
    DEFAULT_OPENAI_MODEL,
    DEFAULT_OPENROUTER_MODEL,
    extractOpenAiOutputText,
    extractOpenRouterCompletionText,
    OPENROUTER_CURATED_MODEL_IDS,
} from '@/lib/ai/providers'
import { enforceAiRateLimit } from '@/lib/ai/rate-limit'
import { getAiRuntimeState } from '@/lib/ai/runtime'
import {
    APP_MANAGED_OPENAI_MODEL,
    estimateTokensFromChars,
    estimateTrialReserveMicros,
    resolveTrialFinalization,
} from '@/lib/ai/trial'
import { getRequestContext } from '@/lib/server/request-context'
import { logUsageEvent } from '@/lib/ai/trial-server'

// Safety Caps
const MAX_CHARS = 1000000 // 1M chars ~ 180k words
const MAX_CHUNKS = 15
const CHUNK_SIZE = 150000 // ~30k words per AI pass
const OVERLAP = 15000     // 10% overlap
const RATE_LIMIT_MS = 30_000

// Output estimation for trial credit reservation.
// AI chapter-detection returns compact JSON (~100-150 chars per chapter entry).
// 8,000 chars per chunk is generous; 100,000 chars total is a hard cap.
// estimateTrialReserveMicros() has no built-in safety multiplier, so we apply 1.25x here.
const ESTIMATED_OUTPUT_CHARS_PER_CHUNK = 8_000
const MAX_ESTIMATED_OUTPUT_CHARS = 100_000
const ESTIMATE_SAFETY_MULTIPLIER = 1.25

export async function POST(req: NextRequest) {
    // Captured after a successful trial reservation so the outer catch can release it
    let trialCleanup: (() => Promise<void>) | null = null

    try {
        const { text, projectType, requestId, deviceFingerprint, useFallback } = await req.json()
        const requestKey = typeof requestId === 'string' && requestId ? requestId : crypto.randomUUID()
        const requestContext = getRequestContext(req, typeof deviceFingerprint === 'string' ? deviceFingerprint : null)

        if (!text || text.length === 0) {
            return NextResponse.json({ error: 'No text provided' }, { status: 400 })
        }

        if (text.length > MAX_CHARS) {
            return NextResponse.json({ error: 'Manuscript too large (over 1M characters). Please use manual markers.' }, { status: 413 })
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const runtime = await getAiRuntimeState(supabase, user.id)
        const metadata = { endpoint: 'import_ai_detect', textLength: text.length }

        // --- AI Partner enabled gate ---
        // Trial users always have access regardless of the ai_enabled toggle — their credits are
        // the gate. Only block BYOK users who have explicitly turned AI Partner off.
        if (runtime.aiSettings && !runtime.aiSettings.ai_enabled && runtime.billingMode !== 'app_managed_trial') {
            return NextResponse.json({ error: 'AI_PARTNER_DISABLED' }, { status: 403 })
        }

        // --- Resolve effective provider/key/model (Ollama with explicit fallback consent) ---
        let effectiveProvider: 'gemini' | 'openai' | 'openrouter' | 'ollama' = runtime.provider
        let effectiveApiKey: string | null = runtime.apiKey
        let effectiveModel: string = runtime.model

        if (useFallback === true && runtime.billingMode === 'ollama') {
            const fbProv = runtime.aiSettings?.ai_fallback_enabled
                ? (runtime.aiSettings?.ai_fallback_provider as 'gemini' | 'openai' | 'openrouter' | null)
                : null
            const fbKey = fbProv === 'gemini'
                ? (runtime.aiSettings?.gemini_api_key ?? null)
                : fbProv === 'openrouter'
                    ? (runtime.aiSettings?.openrouter_api_key ?? null)
                    : fbProv === 'openai'
                        ? (runtime.aiSettings?.openai_api_key ?? null)
                        : null
            if (fbProv && fbKey) {
                effectiveProvider = fbProv
                effectiveApiKey = fbKey
                const storedOrModel = runtime.aiSettings?.openrouter_model ?? null
                effectiveModel = fbProv === 'gemini'
                    ? DEFAULT_GEMINI_MODEL
                    : fbProv === 'openrouter'
                        ? (storedOrModel && OPENROUTER_CURATED_MODEL_IDS.has(storedOrModel) ? storedOrModel : DEFAULT_OPENROUTER_MODEL)
                        : DEFAULT_OPENAI_MODEL
            }
        }

        // --- API key check (billing-mode-aware message) ---
        if (!effectiveApiKey) {
            return NextResponse.json({
                error: runtime.billingMode === 'app_managed_trial'
                    ? 'AI import is temporarily unavailable. Please try again or use manual import.'
                    : 'No cloud AI API key found in Settings. Please save your Gemini, OpenAI, or OpenRouter key first.',
            }, { status: 400 })
        }

        if (effectiveProvider !== 'gemini' && effectiveProvider !== 'openai' && effectiveProvider !== 'openrouter') {
            return NextResponse.json({ error: 'Magic Detect does not support local Ollama yet. Ollama runs on your device, while Magic Detect runs through a cloud AI route. Please add a cloud API key in Account Settings, or configure a cloud fallback provider for Ollama.' }, { status: 400 })
        }

        // --- Partitioning (runs before billing gate so trial reservation uses actual chunk sizes) ---
        const totalLen = text.length
        const chunks: string[] = []
        let pos = 0
        while (pos < totalLen) {
            const end = Math.min(pos + CHUNK_SIZE, totalLen)
            chunks.push(text.substring(pos, end))
            if (chunks.length >= MAX_CHUNKS) break
            pos += (CHUNK_SIZE - OVERLAP)
        }

        // --- Billing-mode-specific gates ---
        if (runtime.billingMode === 'app_managed_trial') {
            // Check trial account status
            if (runtime.trialAccount?.status !== 'active') {
                return NextResponse.json({
                    error: runtime.trialAccount?.status === 'exhausted'
                        ? 'Your AI trial credits have been used up. Add your own API key in Settings to continue using AI features, or use manual import.'
                        : 'AI trial is not available right now. You can still use manual import.',
                }, { status: runtime.trialAccount?.status === 'exhausted' ? 402 : 403 })
            }

            // Rate limit (without recordAcceptedRequest — reserve_ai_trial_usage handles recording)
            const rateLimit = await enforceAiRateLimit({
                userId: user.id,
                requestKey,
                endpoint: 'import_ai_detect',
                billingMode: runtime.billingMode,
                provider: runtime.provider,
                model: runtime.model,
                inputChars: text.length,
                normalizedEmail: runtime.trialAccount?.normalized_email ?? null,
                ipAddress: requestContext.ipAddress,
                deviceFingerprint: requestContext.deviceFingerprint,
                userAgent: requestContext.userAgent,
                metadata,
                minIntervalMs: RATE_LIMIT_MS,
            })

            if (!rateLimit.ok) {
                return NextResponse.json({ error: 'RATE_LIMITED' }, {
                    status: 429,
                    headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
                })
            }

            // Reserve using actual chunk sizes. estimateTrialReserveMicros() has no built-in
            // safety margin, so we apply ESTIMATE_SAFETY_MULTIPLIER (1.25x) explicitly.
            const estimatedInputChars = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
            const estimatedOutputChars = Math.min(
                chunks.length * ESTIMATED_OUTPUT_CHARS_PER_CHUNK,
                MAX_ESTIMATED_OUTPUT_CHARS
            )
            const estimatedOutputTokens = estimateTokensFromChars(estimatedOutputChars)
            const reservedMicros = Math.ceil(
                estimateTrialReserveMicros({
                    endpoint: 'import_ai_detect',
                    inputChars: estimatedInputChars,
                    outputTokensCap: estimatedOutputTokens,
                }) * ESTIMATE_SAFETY_MULTIPLIER
            )

            const reserveResult = await supabase.rpc('reserve_ai_trial_usage', {
                p_user_id: user.id,
                p_request_key: requestKey,
                p_endpoint: 'import_ai_detect',
                p_provider: runtime.provider,
                p_model: APP_MANAGED_OPENAI_MODEL,
                p_reserved_micros: reservedMicros,
                p_input_chars: text.length,
                p_estimated_input_tokens: estimateTokensFromChars(estimatedInputChars),
                p_estimated_output_tokens: estimatedOutputTokens,
                p_ip_address: requestContext.ipAddress ?? '',
                p_device_fingerprint: requestContext.deviceFingerprint ?? '',
                p_user_agent: requestContext.userAgent ?? '',
                p_metadata: metadata,
            })

            if (reserveResult.error) {
                return NextResponse.json({ error: 'Unable to reserve AI credits. Please try again or use manual import.' }, { status: 500 })
            }

            const reserveData = reserveResult.data as { ok?: boolean, status?: string, reason?: string } | null
            if (!reserveData?.ok) {
                return NextResponse.json({
                    error: reserveData?.status === 'exhausted'
                        ? 'Not enough AI credits for this import. Try a shorter section, or add your own API key in Settings.'
                        : 'AI trial is not available right now. You can still use manual import.',
                }, { status: reserveData?.status === 'exhausted' ? 402 : 403 })
            }

            // Register cleanup for unexpected errors after this point
            trialCleanup = async () => {
                try {
                    await supabase.rpc('fail_ai_trial_usage', {
                        p_user_id: user.id,
                        p_request_key: requestKey,
                        p_error_code: 'unexpected_error',
                        p_http_status: 500,
                        p_metadata: metadata,
                    })
                } catch {}
            }
        } else {
            // BYOK / Ollama-fallback path: rate-limit with usage recording
            const rateLimit = await enforceAiRateLimit({
                userId: user.id,
                requestKey,
                endpoint: 'import_ai_detect',
                billingMode: runtime.billingMode,
                provider: effectiveProvider,
                model: effectiveModel,
                inputChars: text.length,
                normalizedEmail: runtime.trialAccount?.normalized_email ?? null,
                ipAddress: requestContext.ipAddress,
                deviceFingerprint: requestContext.deviceFingerprint,
                userAgent: requestContext.userAgent,
                metadata,
                minIntervalMs: RATE_LIMIT_MS,
                recordAcceptedRequest: true,
            })

            if (!rateLimit.ok) {
                return NextResponse.json({ error: 'RATE_LIMITED' }, {
                    status: 429,
                    headers: {
                        'Retry-After': String(rateLimit.retryAfterSeconds),
                    },
                })
            }
        }

        const processChunk = async (chunk: string): Promise<{ chapters: any[], outputChars: number }> => {
            const promptText = `Analyze the following manuscript segment and identify logical major chapter start points.

PRIORITY:
- Look for explicit headings (e.g. Chapter 1, PART II).
- Look for major POV shifts, significant time jumps, or location changes.
- AVOID over-segmenting. Do NOT split on ordinary paragraph breaks or minor scenes.
- Focus on STRUCTURAL shifts only.

PROJECT TYPE: ${projectType}

OUTPUT FORMAT:
Return ONLY a valid JSON array. No markdown, no explanation, no code blocks.
[
  {
    "title": "Chapter Title",
    "markerSnippet": "The first 40-60 characters of the chapter text, copied EXACTLY from the input.",
    "splitType": "Heading/POV/Time/Location"
  }
]

MANUSCRIPT SEGMENT:
${chunk}`

            let providerResponse: Response
            if (effectiveProvider === 'gemini') {
                providerResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${effectiveApiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [
                            {
                                role: 'user',
                                parts: [{ text: promptText }],
                            },
                        ],
                        generationConfig: {
                            maxOutputTokens: 4096,
                            thinkingConfig: {
                                thinkingBudget: 0,
                            },
                        },
                    }),
                })
            } else if (effectiveProvider === 'openrouter') {
                providerResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${effectiveApiKey}`,
                        'HTTP-Referer': 'https://storyline-paulokwa-v2.netlify.app',
                        'X-Title': 'Storyline',
                    },
                    body: JSON.stringify({
                        model: effectiveModel,
                        messages: [
                            { role: 'system', content: 'Return valid JSON only. Do not wrap output in markdown.' },
                            { role: 'user', content: promptText },
                        ],
                        max_tokens: 2500,
                        // response_format is intentionally omitted: the prompt requests a root JSON
                        // array, and json_object mode on many models wraps it as {"chapters":[...]},
                        // breaking the Array.isArray() check. Parsing handles both shapes below.
                    }),
                })
            } else {
                providerResponse = await fetch('https://api.openai.com/v1/responses', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${effectiveApiKey}`,
                    },
                    body: JSON.stringify({
                        model: DEFAULT_OPENAI_MODEL,
                        instructions: 'Return valid JSON only.',
                        input: promptText,
                        max_output_tokens: 2500,
                        text: {
                            format: {
                                type: 'json_object',
                            },
                        },
                    }),
                })
            }

            if (!providerResponse.ok) {
                const errBody = await providerResponse.text()
                console.error(`${effectiveProvider} API error (chunk):`, errBody)
                return { chapters: [], outputChars: 0 }
            }

            const responseData = await providerResponse.json()
            const rawText =
                effectiveProvider === 'gemini'
                    ? responseData?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
                    : effectiveProvider === 'openrouter'
                        ? extractOpenRouterCompletionText(responseData)
                        : extractOpenAiOutputText(responseData)

            try {
                // Strip markdown code fences if present
                const clean = rawText.replace(/```json/gi, '').replace(/```/g, '').trim()
                const parsed = JSON.parse(clean)
                if (Array.isArray(parsed)) {
                    return { chapters: parsed, outputChars: rawText.length }
                } else if (parsed && typeof parsed === 'object') {
                    // Some models (especially under json_object mode) wrap the array:
                    // { "chapters": [...] } or { "result": [...] } etc.
                    const nested = parsed.chapters ?? parsed.result ?? parsed.data ?? parsed.items
                    if (Array.isArray(nested)) {
                        return { chapters: nested, outputChars: rawText.length }
                    } else {
                        console.error('AI Detect: Unexpected JSON shape from OpenRouter chunk:', JSON.stringify(parsed).slice(0, 200))
                    }
                }
            } catch (e) {
                console.error('AI Detect: Failed to parse chunk JSON:', e, '\nRaw:', rawText.slice(0, 300))
            }
            return { chapters: [], outputChars: rawText.length }
        }

        // Process all chunks in parallel — reduces wall-clock time from N×latency to max(latency)
        const chunkResults = await Promise.all(chunks.map(processChunk))

        const allChapters: any[] = []
        let totalOutputChars = 0
        for (const result of chunkResults) {
            allChapters.push(...result.chapters)
            totalOutputChars += result.outputChars
        }

        // De-duplicate by markerSnippet
        const uniqueChapters = Array.from(new Map(allChapters.map(c => [c.markerSnippet, c])).values())

        if (uniqueChapters.length > 100) {
            if (runtime.billingMode === 'app_managed_trial') {
                trialCleanup = null
                await supabase.rpc('fail_ai_trial_usage', {
                    p_user_id: user.id,
                    p_request_key: requestKey,
                    p_error_code: 'implausible_chapter_count',
                    p_http_status: 422,
                    p_metadata: metadata,
                })
            } else {
                await logUsageEvent({
                    userId: user.id,
                    requestKey,
                    endpoint: 'import_ai_detect',
                    billingMode: runtime.billingMode,
                    provider: effectiveProvider,
                    model: effectiveModel,
                    status: 'failed',
                    inputChars: text.length,
                    errorCode: 'implausible_chapter_count',
                    httpStatus: 422,
                    ipAddress: requestContext.ipAddress,
                    deviceFingerprint: requestContext.deviceFingerprint,
                    normalizedEmail: runtime.trialAccount?.normalized_email ?? null,
                    userAgent: requestContext.userAgent,
                    metadata,
                })
            }
            return NextResponse.json({
                error: 'AI identified an implausible number of chapters (>100). Please use manual markers or refine your manuscript structure.'
            }, { status: 422 })
        }

        // --- Finalize usage tracking ---
        trialCleanup = null // Clear cleanup before clean exit

        if (runtime.billingMode === 'app_managed_trial') {
            const finalization = resolveTrialFinalization({
                endpoint: 'import_ai_detect',
                inputChars: text.length,
                outputChars: totalOutputChars,
                providerUsage: null, // multi-chunk; use estimated costing
            })
            await supabase.rpc('finalize_ai_trial_usage', {
                p_user_id: user.id,
                p_request_key: requestKey,
                p_final_micros: finalization.finalMicros,
                p_output_chars: totalOutputChars,
                p_http_status: 200,
                p_metadata: { ...metadata, chunkCount: chunks.length, chapterCount: uniqueChapters.length },
            })
        } else {
            await logUsageEvent({
                userId: user.id,
                requestKey,
                endpoint: 'import_ai_detect',
                billingMode: runtime.billingMode,
                provider: effectiveProvider,
                model: effectiveModel,
                status: 'completed',
                inputChars: text.length,
                httpStatus: 200,
                ipAddress: requestContext.ipAddress,
                deviceFingerprint: requestContext.deviceFingerprint,
                normalizedEmail: runtime.trialAccount?.normalized_email ?? null,
                userAgent: requestContext.userAgent,
                metadata: { ...metadata, chunkCount: chunks.length, chapterCount: uniqueChapters.length },
            })
        }

        return NextResponse.json({ chapters: uniqueChapters })

    } catch (error: any) {
        console.error('AI Detect Error:', error)
        if (trialCleanup) await trialCleanup()
        return NextResponse.json({ error: error.message || 'AI detection failed' }, { status: 500 })
    }
}
