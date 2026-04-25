'use client'

import { createClient } from '@/lib/supabase/client'
import { generateInitialProject, type InitialProjectInput } from '@/lib/persistence/project-blueprint'

export type CreateCloudProjectInput = InitialProjectInput

export async function createCloudProject(input: CreateCloudProjectInput) {
    const supabase = createClient()
    const blueprint = generateInitialProject(input)

    const { data, error } = await supabase.rpc('create_cloud_project', {
        p_blueprint: blueprint,
    })

    if (error) {
        throw new Error(error.message)
    }

    if (!data) {
        throw new Error('Cloud project creation did not return a project ID.')
    }

    return {
        id: data,
        storage_mode: 'cloud-enabled' as const,
    }
}
