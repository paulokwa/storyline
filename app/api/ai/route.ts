import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

const SYSTEM_PROMPTS: Record<string, string> = {
    ideas: `You are a creative writing assistant helping a beginner writer. 
The user is working on a TV script or novel. Give them 5 fresh, specific story ideas, plot directions, or unexpected twists based on what they share. 
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

    const { action, input, format, projectId, prompt } = await req.json() as {
        action: string
        input: string
        format?: string
        projectId: string
        prompt?: string
    }

    const systemPrompt = SYSTEM_PROMPTS[action]
    if (!systemPrompt) {
        return new Response('Unknown action', { status: 400 })
    }

    // Optionally fetch project context for richer prompts
    const { data: project } = (await supabase
        .from('projects')
        .select('title, type, premise, tone')
        .eq('id', projectId)
        .single()) as { data: any }

    const projectContext = project
        ? `\n\nProject context: "${project.title}" — ${project.type === 'tv_script' ? 'TV Script' : 'Novel'}. ${project.premise ? `Premise: ${project.premise}.` : ''} ${project.tone ? `Tone: ${project.tone}.` : ''}`
        : ''

    let userMessage = input
    if (action === 'bridge' && format) {
        userMessage = `Format requested: ${format}\n\n${input}`
    } else if (action === 'helper' && prompt) {
        userMessage = `User Request: ${prompt}\n\nScene Context:\n${input}`
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
        return new Response('API key not configured', { status: 500 })
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
            systemInstruction: {
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
        return new Response(`AI service error: ${geminiResponse.status}`, { status: 502 })
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
