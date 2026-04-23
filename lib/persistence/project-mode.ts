export const LOCAL_PROJECT_ID_PREFIX = 'local_'

export type ProjectStorageMode = 'local-only' | 'cloud-enabled'

export function isLocalProjectId(projectId: string | null | undefined): projectId is string {
    return typeof projectId === 'string' && projectId.startsWith(LOCAL_PROJECT_ID_PREFIX)
}

export function getProjectStorageMode(projectId: string | null | undefined): ProjectStorageMode {
    return isLocalProjectId(projectId) ? 'local-only' : 'cloud-enabled'
}
