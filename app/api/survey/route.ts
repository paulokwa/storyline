import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type SurveyBody = {
    use_case?: string
    satisfaction?: string
    feedback_text?: string
    page_path?: string
    project_count?: number
    app_version?: string
}

const VALID_USE_CASES = ['book', 'screenplay', 'both', 'exploring']
const VALID_SATISFACTION = ['great', 'ok', 'not_great']

export async function POST(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({})) as SurveyBody

    const use_case = VALID_USE_CASES.includes(body.use_case ?? '') ? body.use_case : null
    const satisfaction = VALID_SATISFACTION.includes(body.satisfaction ?? '') ? body.satisfaction : null
    const feedback_text = typeof body.feedback_text === 'string' ? body.feedback_text.slice(0, 2000) : null
    const page_path = typeof body.page_path === 'string' ? body.page_path.slice(0, 200) : null
    const project_count = typeof body.project_count === 'number' ? body.project_count : null
    const app_version = typeof body.app_version === 'string' ? body.app_version.slice(0, 50) : null
    const user_agent = request.headers.get('user-agent')?.slice(0, 500) ?? null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('feedback_responses').insert({
        user_id: user.id,
        use_case,
        satisfaction,
        feedback_text,
        page_path,
        project_count,
        app_version,
        user_agent,
    })

    if (error) {
        console.error('Failed to save survey response:', error.message)
        return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
}
