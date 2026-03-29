import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'
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
}

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return new Response('Unauthorized', { status: 401 })
    }

    const { action, input, format, projectId } = await req.json() as {
        action: string
        input: string
        format?: string
        projectId: string
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

    const userMessage = action === 'bridge' && format
        ? `Format requested: ${format}\n\n${input}`
        : input

    const result = streamText({
        model: openai('gpt-4o-mini'),
        system: systemPrompt + projectContext,
        messages: [{ role: 'user', content: userMessage }],
        maxTokens: 1000,
    } as any)

    return result.toTextStreamResponse()
}
