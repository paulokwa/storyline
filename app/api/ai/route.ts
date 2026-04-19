import { createClient } from '@/lib/supabase/server'
import {
    createCloudTextStream,
    createPlainTextStreamFromProviderResponse,
    testCloudProviderKey,
} from '@/lib/ai/providers'
import { getAiRuntimeState } from '@/lib/ai/runtime'
import {
    APP_MANAGED_OPENAI_MODEL,
    estimateTokensFromChars,
    estimateTrialReserveMicros,
    getTrialStatusMessage,
} from '@/lib/ai/trial'
import { logUsageEvent } from '@/lib/ai/trial-server'
import { getRequestContext } from '@/lib/server/request-context'

export const maxDuration = 30

const SYSTEM_PROMPTS: Record<string, string> = {
    ideas: `You are a creative writing assistant helping a beginner writer. 
The user is working on a script (film, TV, or stage) or a novel. Give them 5 fresh, specific story ideas, plot directions, or unexpected twists based on what they share. 
Be encouraging, concrete, and imaginative. Format as a numbered list.`,

    bridge: `You are a creative writing assistant helping a beginner fill the gap between two scenes.
Based on the user's description and chosen format (ideas / outline / draft), help them connect the scenes.
- Ideas: Give 4-5 possible approaches for what could happen between the scenes
- Outline: Write a concise scene-by-scene outline for the transition
- Draft: Write a full draft of the bridging scene(s), ready to work from
Be vivid and write in a way that matches the tone they describe.`,

    questions: `You are a thoughtful creative writing coach. 
Ask the writer 8-10 thought-provoking questions about their story to help them discover deeper character motivation, theme, plot, or world details.
Don't answer the questions — just ask them. Format as a numbered list. 
Make the questions feel warm and curious, not like a test.`,

    dialogue: `You are a dialogue coach for writers. 
The user will share a dialogue exchange. Give 3 specific suggestions to improve it — making it more natural, revealing character, and avoiding "on the nose" writing.
Then optionally rewrite the exchange applying your suggestions.
Be constructive and encouraging.`,

    draft: `You are a skilled ghostwriter helping a beginner get words on the page.
Write a vivid, engaging first draft of the scene the user describes. 
Aim for 300-500 words. Match the tone and style implied by their description.
End with a one-line note about what they could explore or change.`,

    helper: `You are a creative writing partner.
The user is working on a story scene. Use the provided scene context and the user's specific request to:
- Answer questions about their plot or characters
- Suggest how to start or end the scene
- Brainstorm sensory details or dialogue
- Offer quick critiques
Keep responses concise, encouraging, and focused. Do not rewrite the entire scene unless asked.`,
}

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return new Response('Unauthorized', { status: 401 })
    }

    const { 
        action, 
        input, 
        format, 
        projectId, 
        prompt, 
        provider,
        apiKeyOverride,
        requestId,
        deviceFingerprint,
        linkedCharacters, 
        linkedIdeas, 
        linkedLocations, 
        linkedObjects, 
        storyContext 
    } = await req.json() as {
        action: string
        input: string
        format?: string
        projectId: string
        prompt?: string
        provider?: 'gemini' | 'openai'
        apiKeyOverride?: string
        requestId?: string
        deviceFingerprint?: string | null
        linkedCharacters?: any[]
        linkedIdeas?: any[]
        linkedLocations?: any[]
        linkedObjects?: any[]
        storyContext?: any[]
    }

    const requestContext = getRequestContext(req, deviceFingerprint)
    const runtime = await getAiRuntimeState(supabase, user.id)

    if (action === 'heartbeat') {
        if (apiKeyOverride && (provider === 'gemini' || provider === 'openai')) {
            try {
                const data = await testCloudProviderKey(provider, apiKeyOverride)
                return new Response(JSON.stringify({
                    ok: data.ok,
                    status: data.status,
                    error: data.error,
                    billingMode: 'byok',
                    provider,
                }), { status: 200 })
            } catch {
                return new Response(JSON.stringify({ ok: false, error: 'FETCH_FAILED', billingMode: 'byok', provider }), { status: 200 })
            }
        }

        if (runtime.billingMode === 'app_managed_trial') {
            const hasProviderKey = !!runtime.apiKey
            const isActive = runtime.trialAccount?.status === 'active'

            return new Response(JSON.stringify({
                ok: hasProviderKey && isActive,
                billingMode: runtime.billingMode,
                provider: runtime.provider,
                error: !hasProviderKey
                    ? 'APP_MANAGED_AI_UNAVAILABLE'
                    : !isActive
                        ? runtime.trialAccount?.status ?? 'TRIAL_UNAVAILABLE'
                        : null,
                trialStatus: runtime.trialAccount?.status ?? 'disabled',
                remainingMicros: runtime.trialAccount?.remaining_micros ?? 0,
                message: getTrialStatusMessage(runtime.trialAccount),
            }), { status: 200 })
        }

        if (!runtime.apiKey) {
            return new Response(JSON.stringify({ ok: false, error: 'NO_API_KEY', billingMode: runtime.billingMode }), { status: 200 })
        }

        if (runtime.provider !== 'gemini' && runtime.provider !== 'openai') {
            return new Response(JSON.stringify({ ok: false, error: 'UNSUPPORTED_PROVIDER', billingMode: runtime.billingMode }), { status: 200 })
        }

        try {
            const data = await testCloudProviderKey(runtime.provider, runtime.apiKey)
            return new Response(JSON.stringify({
                ok: data.ok,
                status: data.status,
                error: data.error,
                billingMode: runtime.billingMode,
                provider: runtime.provider,
            }), { status: 200 })
        } catch {
            return new Response(JSON.stringify({ ok: false, error: 'FETCH_FAILED', billingMode: runtime.billingMode }), { status: 200 })
        }
    }

    const systemPrompt = SYSTEM_PROMPTS[action]
    if (!systemPrompt || typeof action !== 'string') {
        return new Response('Unknown or invalid action', { status: 400 })
    }

    // Security Hardening: Apply reasonable payload size limits
    if ((input && input.length > 50000) || (prompt && prompt.length > 10000)) {
        return new Response('Payload too large', { status: 413 })
    }

    // Optionally fetch project context for richer prompts
    const { data: project } = (await supabase
        .from('projects')
        .select('title, type, premise, tone')
        .eq('id', projectId)
        .single()) as { data: any }

    const projectContext = project
        ? `\n\nProject context: "${project.title}" — ${project.type === 'tv_script' ? 'Screenplay' : 'Book'}. ${project.premise ? `Premise: ${project.premise}.` : ''} ${project.tone ? `Tone: ${project.tone}.` : ''}`
        : ''

    let userMessage = input
    if (action === 'bridge' && format) {
        userMessage = `Format requested: ${format}\n\n${input}`
    } else if (action === 'helper' && prompt) {
        // Collect all linked entity IDs to filter for relevant relationships
        const relevantEntityIds = [
            ...(linkedCharacters || []).map((c: any) => c.id),
            ...(linkedLocations || []).map((l: any) => l.id),
            ...(linkedObjects || []).map((o: any) => o.id)
        ]

        // Fetch relationships for this project
        const { data: allRelationships } = await supabase
            .from('entity_relationships')
            .select('*')
            .eq('project_id', projectId)

        // Filter for relationships where BOTH source and target are relevant to the current scene
        const sceneRelationships = (allRelationships || [])
            .filter((rel: any) => 
                relevantEntityIds.includes(rel.source_id) && 
                relevantEntityIds.includes(rel.target_id)
            )
            .slice(0, 10)

        // Helper to get name from linked lists
        const getEntityName = (id: string) => {
            const match = [
                ...(linkedCharacters || []),
                ...(linkedLocations || []),
                ...(linkedObjects || [])
            ].find((e: any) => e.id === id)
            return match?.name || 'Unknown'
        }

        console.log('--- AI BACKEND DEBUG ---')
        console.log('Project ID:', projectId)
        console.log('Input Length:', input.length)
        console.log('Characters linked:', (linkedCharacters || []).length)
        console.log('Ideas linked:', (linkedIdeas || []).length)

        let contextBlock = `CURRENT SCENE:\n${input}\n\n`
        
        if (linkedCharacters && linkedCharacters.length > 0) {
            contextBlock += `LINKED CHARACTERS:\n`
            linkedCharacters.forEach(c => {
                contextBlock += `- ${c.name || 'Unnamed'}\n`
                if (c.description) contextBlock += `  Description: ${c.description}\n`
                if (c.notes) contextBlock += `  Notes: ${c.notes}\n`
            })
            contextBlock += '\n'
        }

        if (linkedIdeas && linkedIdeas.length > 0) {
            contextBlock += `IMPORTANT STORY CONTEXT:\nThe following ideas are critical narrative elements and should strongly influence the response.\n\nLINKED IDEAS:\n`
            linkedIdeas.forEach(i => {
                contextBlock += `- ${i.title || 'Untitled'}\n`
                if (i.content) contextBlock += `  Content: ${i.content}\n`
            })
            contextBlock += '\n'
        }

        if (linkedLocations && linkedLocations.length > 0) {
            contextBlock += `LINKED LOCATIONS:\n`
            linkedLocations.forEach(l => {
                contextBlock += `- ${l.name || 'Unnamed Location'}\n`
                if (l.atmosphere) contextBlock += `  Atmosphere: ${l.atmosphere}\n`
                if (l.description) contextBlock += `  Description: ${l.description}\n`
            })
            contextBlock += '\n'
        }

        if (linkedObjects && linkedObjects.length > 0) {
            contextBlock += `LINKED OBJECTS/ITEMS:\n`
            linkedObjects.forEach(o => {
                contextBlock += `- ${o.name || 'Unnamed Object'}\n`
                if (o.significance) contextBlock += `  Significance: ${o.significance}\n`
                if (o.description) contextBlock += `  Description: ${o.description}\n`
            })
            contextBlock += '\n'
        }

        if (sceneRelationships.length > 0) {
            contextBlock += `ESTABLISHED WORLD TIES (Scene-linked entities only):\n`
            sceneRelationships.forEach((rel: any) => {
                const sName = getEntityName(rel.source_id)
                const tName = getEntityName(rel.target_id)
                if (rel.is_symmetrical) {
                    contextBlock += `- ${sName} and ${tName} are ${rel.relation_label}\n`
                } else {
                    contextBlock += `- ${sName} is ${rel.relation_label} to ${tName}\n`
                }
            })
            contextBlock += '\n'
        }

        if (storyContext && storyContext.length > 0) {
            contextBlock += `STORY CONTEXT (OTHER SCENES/CHAPTERS):\n`
            storyContext.forEach(s => {
                contextBlock += `[${s.title}]\n${s.content}\n\n`
            })
        }

        userMessage = `${contextBlock}USER REQUEST: ${prompt}`
        console.log('Final userMessage Length:', userMessage.length)
        console.log('Final userMessage Preview:', userMessage.substring(0, 500))
    }

    const requestKey = requestId || crypto.randomUUID()
    const providerName = runtime.provider

    if (runtime.billingMode === 'ollama') {
        return new Response('UNSUPPORTED_PROVIDER', { status: 400 })
    }

    const apiKey = runtime.apiKey
    if (!apiKey) {
        return new Response(
            runtime.billingMode === 'app_managed_trial' ? 'APP_MANAGED_AI_UNAVAILABLE' : 'NO_API_KEY',
            { status: 403 }
        )
    }

    if (providerName !== 'gemini' && providerName !== 'openai') {
        return new Response('UNSUPPORTED_PROVIDER', { status: 400 })
    }

    const metadata = {
        action,
        projectId,
    }

    if (runtime.billingMode === 'app_managed_trial') {
        if (runtime.trialAccount?.status !== 'active') {
            return new Response(runtime.trialAccount?.status === 'exhausted' ? 'TRIAL_EXHAUSTED' : 'TRIAL_UNAVAILABLE', {
                status: runtime.trialAccount?.status === 'exhausted' ? 402 : 403,
            })
        }

        const reservedMicros = estimateTrialReserveMicros({
            endpoint: 'ai_helper',
            inputChars: userMessage.length,
            outputTokensCap: 1000,
        })

        const reserveResult = await supabase.rpc('reserve_ai_trial_usage', {
            p_user_id: user.id,
            p_request_key: requestKey,
            p_endpoint: 'ai_helper',
            p_provider: providerName,
            p_model: APP_MANAGED_OPENAI_MODEL,
            p_reserved_micros: reservedMicros,
            p_input_chars: userMessage.length,
            p_estimated_input_tokens: estimateTokensFromChars(userMessage),
            p_estimated_output_tokens: 1000,
            p_ip_address: requestContext.ipAddress ?? '',
            p_device_fingerprint: requestContext.deviceFingerprint ?? '',
            p_user_agent: requestContext.userAgent ?? '',
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

    const providerResponse = await createCloudTextStream({
        provider: providerName,
        apiKey,
        systemPrompt: systemPrompt + projectContext,
        userMessage,
        maxOutputTokens: 1000,
    })

    if (!providerResponse.ok) {
        if (runtime.billingMode === 'app_managed_trial') {
            await supabase.rpc('fail_ai_trial_usage', {
                p_user_id: user.id,
                p_request_key: requestKey,
                p_error_code: `provider_${providerResponse.status}`,
                p_http_status: providerResponse.status,
                p_metadata: metadata,
            })
        } else {
            await logUsageEvent({
                userId: user.id,
                requestKey,
                endpoint: 'ai_helper',
                billingMode: runtime.billingMode,
                provider: providerName,
                model: runtime.model,
                status: 'failed',
                inputChars: userMessage.length,
                errorCode: `provider_${providerResponse.status}`,
                httpStatus: providerResponse.status,
                ipAddress: requestContext.ipAddress,
                deviceFingerprint: requestContext.deviceFingerprint,
                normalizedEmail: runtime.trialAccount?.normalized_email ?? null,
                userAgent: requestContext.userAgent,
                metadata,
            })
        }
        const errBody = await providerResponse.text()
        console.error(`${providerName} API error:`, errBody)
        return new Response(`AI service error: ${providerResponse.status} ${errBody.slice(0, 100)}`, { status: 502 })
    }

    const stream = createPlainTextStreamFromProviderResponse(providerName, providerResponse, {
        onComplete: async (fullText) => {
            if (runtime.billingMode === 'app_managed_trial') {
                await supabase.rpc('finalize_ai_trial_usage', {
                    p_user_id: user.id,
                    p_request_key: requestKey,
                    p_final_micros: estimateTrialReserveMicros({
                        endpoint: 'ai_helper',
                        inputChars: userMessage.length,
                        outputChars: fullText.length,
                    }),
                    p_output_chars: fullText.length,
                    p_http_status: 200,
                    p_metadata: metadata,
                })
                return
            }

            await logUsageEvent({
                userId: user.id,
                requestKey,
                endpoint: 'ai_helper',
                billingMode: runtime.billingMode,
                provider: providerName,
                model: runtime.model,
                status: 'completed',
                inputChars: userMessage.length,
                outputChars: fullText.length,
                httpStatus: 200,
                ipAddress: requestContext.ipAddress,
                deviceFingerprint: requestContext.deviceFingerprint,
                normalizedEmail: runtime.trialAccount?.normalized_email ?? null,
                userAgent: requestContext.userAgent,
                metadata,
            })
        },
        onError: async () => {
            if (runtime.billingMode === 'app_managed_trial') {
                await supabase.rpc('fail_ai_trial_usage', {
                    p_user_id: user.id,
                    p_request_key: requestKey,
                    p_error_code: 'stream_error',
                    p_http_status: 502,
                    p_metadata: metadata,
                })
                return
            }

            await logUsageEvent({
                userId: user.id,
                requestKey,
                endpoint: 'ai_helper',
                billingMode: runtime.billingMode,
                provider: providerName,
                model: runtime.model,
                status: 'failed',
                inputChars: userMessage.length,
                errorCode: 'stream_error',
                httpStatus: 502,
                ipAddress: requestContext.ipAddress,
                deviceFingerprint: requestContext.deviceFingerprint,
                normalizedEmail: runtime.trialAccount?.normalized_email ?? null,
                userAgent: requestContext.userAgent,
                metadata,
            })
        },
    })

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
        },
    })
}
