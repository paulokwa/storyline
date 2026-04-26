import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireVerifiedUser } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'
import type { Database, Json } from '@/lib/supabase/types'

type StorageQuotaCheckResult = {
    within_quota: boolean
    current_usage_bytes: number
    effective_quota_bytes: number
}

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error)
}

function parseOptionalInteger(value: FormDataEntryValue | null) {
    if (typeof value !== 'string' || value.trim() === '') return null
    const parsed = Number.parseInt(value, 10)
    return Number.isFinite(parsed) ? parsed : null
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

async function userCanEditProject(
    supabase: SupabaseClient<Database>,
    projectId: string,
    userId: string
) {
    const { data, error } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .maybeSingle()

    if (error) throw error
    return data?.role === 'owner' || data?.role === 'editor'
}

export async function POST(req: NextRequest) {
    try {
        const user = await requireVerifiedUser()
        const supabase = await createClient()
        const adminClient = createAdminClient()

        if (!adminClient) {
            return NextResponse.json(
                { error: 'Server misconfiguration: admin client unavailable.' },
                { status: 500 }
            )
        }

        const formData = await req.formData()
        const projectId = formData.get('projectId')
        const fileEntry = formData.get('file')

        if (typeof projectId !== 'string' || projectId.length === 0 || !(fileEntry instanceof File)) {
            return NextResponse.json({ error: 'Missing required upload fields.' }, { status: 400 })
        }

        if (!fileEntry.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Only image files are allowed.' }, { status: 400 })
        }

        if (fileEntry.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'File size must be less than 5MB.' }, { status: 400 })
        }

        if (!(await userCanEditProject(supabase, projectId, user.id))) {
            return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
        }

        const { data: quota, error: quotaError } = await supabase.rpc('check_storage_quota', {
            p_user_id: user.id,
            p_incoming_file_size: fileEntry.size,
        })

        if (quotaError) throw quotaError

        const storageQuota = parseStorageQuotaCheckResult(quota)
        if (!storageQuota) {
            return NextResponse.json({ error: 'Unable to verify storage quota.' }, { status: 500 })
        }

        if (!storageQuota.within_quota) {
            return NextResponse.json(
                {
                    error: 'Storage quota exceeded.',
                    quota: storageQuota,
                },
                { status: 413 }
            )
        }

        const assetId = crypto.randomUUID()
        const fallbackExtension = fileEntry.type.split('/')[1] || 'bin'
        const extension = fileEntry.name.split('.').pop() || fallbackExtension
        const storagePath = `projects/${projectId}/images/${assetId}.${extension}`

        const { error: uploadError } = await adminClient.storage
            .from('project-assets')
            .upload(storagePath, fileEntry, {
                contentType: fileEntry.type,
                upsert: false,
            })

        if (uploadError) {
            console.error('[project-assets/upload] Storage upload error:', uploadError)
            return NextResponse.json({ error: uploadError.message }, { status: 500 })
        }

        const asset = {
            id: assetId,
            project_id: projectId,
            storage_path: storagePath,
            file_name: fileEntry.name,
            mime_type: fileEntry.type,
            file_size: fileEntry.size,
            width: parseOptionalInteger(formData.get('width')),
            height: parseOptionalInteger(formData.get('height')),
            uploaded_by: user.id,
            asset_type: 'image',
        }

        const { data: insertedAsset, error: dbError } = await adminClient
            .from('project_assets')
            .insert(asset)
            .select('*')
            .single()

        if (dbError) {
            await adminClient.storage.from('project-assets').remove([storagePath])
            throw dbError
        }

        return NextResponse.json({ asset: insertedAsset })
    } catch (error: unknown) {
        console.error('[project-assets/upload] Unexpected error:', error)
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
    }
}
