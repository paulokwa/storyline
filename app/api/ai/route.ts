import { createClient } from '@/lib/supabase/server'

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
        linkedCharacters?: any[]
        linkedIdeas?: any[]
        linkedLocations?: any[]
        linkedObjects?: any[]
        storyContext?: any[]
    }

    if (action === 'heartbeat') {
        const { data: keyRecord } = (await supabase
            .from('user_api_keys')
            .select('api_key')
            .eq('user_id', user.id)
            .single()) as { data: { api_key: string } | null }

        const apiKey = keyRecord?.api_key
        if (!apiKey) return new Response(JSON.stringify({ ok: false, error: 'NO_API_KEY' }), { status: 200 })
        
        try {
            const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, { method: 'GET' })
            const data = await resp.json()
            return new Response(JSON.stringify({ 
                ok: resp.ok, 
                status: resp.status,
                error: !resp.ok ? data?.error?.message : null
            }), { status: 200 })
        } catch (e) {
            return new Response(JSON.stringify({ ok: false, error: 'FETCH_FAILED' }), { status: 200 })
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

    const { data: keyRecord } = (await supabase
        .from('user_api_keys')
        .select('api_key')
        .eq('user_id', user.id)
        .single()) as { data: { api_key: string } | null }

    const apiKey = keyRecord?.api_key
    if (!apiKey) {
        return new Response('NO_API_KEY', { status: 403 })
    }

    // Direct call to Gemini API — bypasses AI SDK compatibility issues
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`

    const geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [
                { role: 'user', parts: [{ text: userMessage }] },
            ],
            system_instruction: {
                parts: [{ text: systemPrompt + projectContext }],
            },
            generationConfig: {
                maxOutputTokens: 1000,
                thinkingConfig: {
                    thinkingBudget: 0,
                },
            },
        }),
    })

    if (!geminiResponse.ok) {
        const errBody = await geminiResponse.text()
        console.error('Gemini API error:', errBody)
        return new Response(`AI service error: ${geminiResponse.status} ${errBody.slice(0, 100)}`, { status: 502 })
    }

    // Transform the Gemini SSE stream into a plain text stream for useCompletion
    const reader = geminiResponse.body!.getReader()
    const decoder = new TextDecoder()

    const stream = new ReadableStream({
        async start(controller) {
            try {
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    const chunk = decoder.decode(value, { stream: true })
                    // Gemini SSE format: lines starting with "data: " contain JSON
                    const lines = chunk.split('\n')
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6))
                                const parts = data?.candidates?.[0]?.content?.parts
                                if (parts) {
                                    for (const part of parts) {
                                        if (part.text) {
                                            controller.enqueue(new TextEncoder().encode(part.text))
                                        }
                                    }
                                }
                            } catch {
                                // Skip malformed JSON chunks
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('Stream processing error:', err)
            } finally {
                controller.close()
            }
        },
    })

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
        },
    })
}
