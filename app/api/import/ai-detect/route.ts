import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Safety Caps
const MAX_CHARS = 1000000 // 1M chars ~ 180k words
const MAX_CHUNKS = 15
const CHUNK_SIZE = 150000 // ~30k words per AI pass
const OVERLAP = 15000     // 10% overlap

export async function POST(req: NextRequest) {
    try {
        const { text, projectType } = await req.json()

        if (!text || text.length === 0) {
            return NextResponse.json({ error: 'No text provided' }, { status: 400 })
        }

        if (text.length > MAX_CHARS) {
            return NextResponse.json({ error: 'Manuscript too large (over 1M characters). Please use manual markers.' }, { status: 413 })
        }

        // Fetch User API Key Securely (same pattern as /api/ai/route.ts)
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: keyRecord } = (await supabase
            .from('user_api_keys')
            .select('api_key')
            .eq('user_id', user.id)
            .single()) as { data: { api_key: string } | null }

        const apiKey = keyRecord?.api_key
        if (!apiKey) {
            return NextResponse.json({ error: 'No AI API Key found in Settings. Please save your Gemini key first.' }, { status: 400 })
        }

        // Partitioning
        const totalLen = text.length
        const chunks: string[] = []
        let pos = 0
        while (pos < totalLen) {
            const end = Math.min(pos + CHUNK_SIZE, totalLen)
            chunks.push(text.substring(pos, end))
            if (chunks.length >= MAX_CHUNKS) break
            pos += (CHUNK_SIZE - OVERLAP)
        }

        const allChapters: any[] = []

        // Direct Gemini API call — same pattern as /api/ai/route.ts
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

        for (const chunk of chunks) {
            const geminiResponse = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [{
                                text: `Analyze the following manuscript segment and identify logical major chapter start points.

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
                            }]
                        }
                    ],
                    generationConfig: {
                        maxOutputTokens: 4096,
                        thinkingConfig: {
                            thinkingBudget: 0,
                        },
                    },
                }),
            })

            if (!geminiResponse.ok) {
                const errBody = await geminiResponse.text()
                console.error('Gemini API error (chunk):', errBody)
                // Continue to next chunk rather than aborting entirely
                continue
            }

            const geminiData = await geminiResponse.json()
            const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

            try {
                // Strip markdown code fences if present
                const clean = rawText.replace(/```json/gi, '').replace(/```/g, '').trim()
                const parsed = JSON.parse(clean)
                if (Array.isArray(parsed)) {
                    allChapters.push(...parsed)
                }
            } catch (e) {
                console.error('AI Detect: Failed to parse chunk JSON:', e, '\nRaw:', rawText)
                // Skip malformed chunks
            }
        }

        // De-duplicate by markerSnippet
        const uniqueChapters = Array.from(new Map(allChapters.map(c => [c.markerSnippet, c])).values())

        if (uniqueChapters.length > 100) {
            return NextResponse.json({
                error: 'AI identified an implausible number of chapters (>100). Please use manual markers or refine your manuscript structure.'
            }, { status: 422 })
        }

        return NextResponse.json({ chapters: uniqueChapters })

    } catch (error: any) {
        console.error('AI Detect Error:', error)
        return NextResponse.json({ error: error.message || 'AI detection failed' }, { status: 500 })
    }
}
