import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, getAdminClientConfigStatus } from '@/lib/supabase/admin'
import { isAdminEmail } from '@/lib/admin'

type RecalculateTrialBody = {
  targetUserId?: string
  note?: string
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  if (!admin) {
    const reason = getAdminClientConfigStatus()
    return NextResponse.json({
      error: reason === 'missing_supabase_url'
        ? 'Admin Supabase URL is not configured on the server.'
        : 'Admin service role key is not configured on the server.',
    }, { status: 500 })
  }

  let body: RecalculateTrialBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const targetUserId = body.targetUserId?.trim()
  if (!targetUserId) {
    return NextResponse.json({ error: 'Target user ID is required.' }, { status: 400 })
  }

  const { data, error } = await admin.rpc('admin_recalculate_ai_trial_usage', {
    p_target_user_id: targetUserId,
    p_admin_user_id: user.id,
    p_note: body.note?.trim() || null,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const result = (data ?? null) as { ok?: boolean; reason?: string } | null
  if (!result?.ok) {
    return NextResponse.json({ error: result?.reason || 'Trial recalculation failed.' }, { status: 400 })
  }

  return NextResponse.json({ ok: true, result })
}
