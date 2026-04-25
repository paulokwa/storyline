'use client'

import { createCloudProject } from '@/lib/persistence/cloud-projects'
import { createLocalProject, type CreateLocalProjectInput } from '@/lib/persistence/local-projects'
import type { InitialProjectInput } from '@/lib/persistence/project-blueprint'

export type PreferredStorageMode = 'local' | 'cloud'

export type CreateProjectInput = InitialProjectInput & {
    userId: string
    storageMode: PreferredStorageMode
}

export async function createProject(input: CreateProjectInput) {
    if (input.storageMode === 'cloud') {
        return createCloudProject(input)
    }

    const localInput: CreateLocalProjectInput = {
        ...input,
        userId: input.userId,
    }

    return createLocalProject(localInput)
}
