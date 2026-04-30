'use client'

import { createClient } from '@/lib/supabase/client'
import { generateInitialProject, type InitialProjectInput } from '@/lib/persistence/project-blueprint'
import { isRetryablePersistenceError, withPersistenceRetry } from '@/lib/persistence/retry'

export type CreateCloudProjectInput = InitialProjectInput

export async function createCloudProject(input: CreateCloudProjectInput) {
    const supabase = createClient()
    const blueprint = generateInitialProject(input)

    const { data, error } = await withPersistenceRetry(async () => {
        const result = await supabase.rpc('create_cloud_project', {
            p_blueprint: blueprint,
        })

        if (result.error && isRetryablePersistenceError(result.error)) {
            throw result.error
        }

        return result
    }, {
        label: 'cloud project creation',
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
