import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireVerifiedUser } from '@/lib/supabase/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/migration/upload-asset
 *
 * Accepts a base64-encoded file and uploads it to Supabase Storage using
 * the admin client (service role key), bypassing storage RLS entirely.
 * This is only used during local-to-cloud project migration.
 *
 * Body: { projectId, assetId, base64, mimeType, fileName, extension }
 */
export async function POST(req: NextRequest) {
    try {
        const user = await requireVerifiedUser()

        const { projectId, assetId, base64, mimeType, fileName, extension } = await req.json()

        if (!projectId || !assetId || !base64 || !mimeType || !extension) {
            return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
        }

        // Verify the caller owns the project using the regular (authed) client
        const supabase = await createClient()
        const { data: project } = await supabase
            .from('projects')
            .select('id, user_id')
            .eq('id', projectId)
            .single()

        if (!project || project.user_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
        }

        // Decode base64 to binary
        const base64Data = base64.includes(';base64,')
            ? base64.split(';base64,')[1]
            : base64
        const binaryStr = atob(base64Data)
        const bytes = new Uint8Array(binaryStr.length)
        for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i)
        }
        const blob = new Blob([bytes], { type: mimeType })

        // Use the admin client (service role key) — bypasses storage RLS entirely
        const adminClient = createAdminClient()
        if (!adminClient) {
            return NextResponse.json(
                { error: 'Server misconfiguration: admin client unavailable.' },
                { status: 500 }
            )
        }

        const storagePath = `projects/${projectId}/${assetId}.${extension}`
        const { error: uploadError } = await adminClient.storage
            .from('project-assets')
            .upload(storagePath, blob, {
                contentType: mimeType,
                upsert: false,
            })

        if (uploadError) {
            console.error('[migration/upload-asset] Upload error:', uploadError)
            return NextResponse.json({ error: uploadError.message }, { status: 500 })
        }

        return NextResponse.json({ storagePath })
    } catch (err: any) {
        console.error('[migration/upload-asset] Unexpected error:', err)
        return NextResponse.json({ error: err.message ?? 'Internal server error.' }, { status: 500 })
    }
}
