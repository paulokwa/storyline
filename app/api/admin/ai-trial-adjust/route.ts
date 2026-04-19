import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminEmail } from '@/lib/admin'

type AdjustTrialBody = {
  targetUserId?: string
  deltaUsd?: string
  status?: 'active' | 'exhausted' | 'blocked' | 'abuse_review' | 'disabled' | ''
  note?: string
}

function parseUsdToMicros(value: string | undefined) {
  const trimmed = value?.trim()
  if (!trimmed) return 0

  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) {
    return null
  }

  return Math.round(parsed * 1_000_000)
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
    return NextResponse.json({ error: 'Admin service role is not configured.' }, { status: 500 })
  }

  let body: AdjustTrialBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const targetUserId = body.targetUserId?.trim()
  if (!targetUserId) {
    return NextResponse.json({ error: 'Target user ID is required.' }, { status: 400 })
  }

  const deltaMicros = parseUsdToMicros(body.deltaUsd)
  if (deltaMicros === null) {
    return NextResponse.json({ error: 'Delta USD must be a valid number.' }, { status: 400 })
  }

  const status = body.status?.trim() || null
  if (status && !['active', 'exhausted', 'blocked', 'abuse_review', 'disabled'].includes(status)) {
    return NextResponse.json({ error: 'Unsupported trial status.' }, { status: 400 })
  }

  const { data, error } = await admin.rpc('admin_adjust_ai_trial', {
    p_target_user_id: targetUserId,
    p_admin_user_id: user.id,
    p_delta_micros: deltaMicros,
    p_status: status,
    p_note: body.note?.trim() || null,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const result = (data ?? null) as { ok?: boolean; reason?: string } | null
  if (!result?.ok) {
    return NextResponse.json({ error: result?.reason || 'Manual trial adjustment failed.' }, { status: 400 })
  }

  return NextResponse.json({ ok: true, result })
}
