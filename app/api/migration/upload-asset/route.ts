import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireVerifiedUser } from '@/lib/supabase/auth'
import { NextRequest, NextResponse } from 'next/server'
import type { Json } from '@/lib/supabase/types'

/**
 * POST /api/migration/upload-asset
 *
 * Accepts a base64-encoded file and uploads it to Supabase Storage using
 * the admin client (service role key), bypassing storage RLS entirely.
 * This is only used during local-to-cloud project migration.
 *
 * Body: { projectId, assetId, base64, mimeType, fileName, extension }
 */

type StorageQuotaCheckResult = {
    within_quota: boolean
    current_usage_bytes: number
    effective_quota_bytes: number
}

function parseStorageQuotaCheckResult(value: Json | null): StorageQuotaCheckResult | null {
    const candidate = Array.isArray(value) ? value[0] : value
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null

    if (
        typeof candidate.within_quota !== 'boolean' ||
        typeof candidate.current_usage_bytes !== 'number' ||
        typeof candidate.effective_quota_bytes !== 'number'
    ) {
        return null
    }

    return {
        within_quota: candidate.within_quota,
        current_usage_bytes: candidate.current_usage_bytes,
        effective_quota_bytes: candidate.effective_quota_bytes,
    }
}

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

        // Decode base64 to binary — file size is now known
        const base64Data = base64.includes(';base64,')
            ? base64.split(';base64,')[1]
            : base64
        const binaryStr = atob(base64Data)
        const bytes = new Uint8Array(binaryStr.length)
        for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i)
        }
        const blob = new Blob([bytes], { type: mimeType })

        // Check storage quota before uploading.
        // Note: assets are inserted into project_assets only after all migration uploads
        // complete, so storage_used_bytes reflects pre-migration usage during the loop.
        // This check still prevents uploads when the user is already at or over quota,
        // and catches any single asset that would independently exceed the remaining space.
        const fileSize = bytes.length
        const { data: quotaData, error: quotaError } = await supabase.rpc('check_storage_quota', {
            p_user_id: user.id,
            p_incoming_file_size: fileSize,
        })

        if (quotaError) {
            console.error('[migration/upload-asset] Quota check error:', quotaError)
            return NextResponse.json({ error: 'Unable to verify storage quota.' }, { status: 500 })
        }

        const quota = parseStorageQuotaCheckResult(quotaData)
        if (!quota) {
            return NextResponse.json({ error: 'Unable to verify storage quota.' }, { status: 500 })
        }

        if (!quota.within_quota) {
            const usedMb = (quota.current_usage_bytes / (1024 * 1024)).toFixed(1)
            const quotaMb = (quota.effective_quota_bytes / (1024 * 1024)).toFixed(1)
            return NextResponse.json(
                {
                    error: `Storage quota exceeded (${usedMb} MB of ${quotaMb} MB used). Free up space by deleting project assets, then retry the migration.`,
                    quota,
                },
                { status: 413 }
            )
        }

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
