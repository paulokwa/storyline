const LAST_SCENE_STORAGE_PREFIX = 'storyline-last-scene'

function getLastSceneStorageKey(projectId: string) {
    return `${LAST_SCENE_STORAGE_PREFIX}:${projectId}`
}

export function readStoredSceneNodeId(projectId: string): string | null {
    if (typeof window === 'undefined') return null
    const storedNodeId = window.localStorage.getItem(getLastSceneStorageKey(projectId))
    return storedNodeId || null
}

export function writeStoredSceneNodeId(projectId: string, nodeId: string | null | undefined) {
    if (typeof window === 'undefined') return

    if (!nodeId) {
        window.localStorage.removeItem(getLastSceneStorageKey(projectId))
        return
    }

    window.localStorage.setItem(getLastSceneStorageKey(projectId), nodeId)
}

export function resolveSceneNodeId(
    candidateIds: Array<string | null | undefined>,
    validSceneNodeIds: Set<string>
) {
    for (const candidateId of candidateIds) {
        if (candidateId && validSceneNodeIds.has(candidateId)) {
            return candidateId
        }
    }

    return null
}
