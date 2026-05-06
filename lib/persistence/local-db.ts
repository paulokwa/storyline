const DB_NAME = 'storyline-local-projects'
const DB_VERSION = 4

export const LOCAL_STORE_NAMES = {
    projects: 'projects',
    structureNodes: 'structure_nodes',
    scenes: 'scenes',
    characters: 'characters',
    ideas: 'ideas',
    locations: 'locations',
    objects: 'objects',
    comments: 'project_comments',
    projectAssets: 'project_assets',
    sceneAssets: 'scene_assets',
    entityAssets: 'entity_assets',
    aiResponses: 'ai_responses',
} as const

export type LocalStoreName = typeof LOCAL_STORE_NAMES[keyof typeof LOCAL_STORE_NAMES]

function ensureIndexedDb() {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
        throw new Error('IndexedDB is not available in this environment.')
    }

    return window.indexedDB
}

function requestToPromise<T>(request: IDBRequest<T>) {
    return new Promise<T>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'))
    })
}

function transactionToPromise(transaction: IDBTransaction) {
    return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'))
        transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted.'))
    })
}

function createStore(
    db: IDBDatabase,
    storeName: LocalStoreName,
    options?: {
        projectIndex?: boolean
        nodeIndex?: boolean
        sceneIndex?: boolean
        entityIndex?: boolean
        assetIndex?: boolean
    }
) {
    if (db.objectStoreNames.contains(storeName)) {
        return
    }

    const store = db.createObjectStore(storeName, { keyPath: 'id' })

    if (options?.projectIndex) {
        store.createIndex('project_id', 'project_id', { unique: false })
    }

    if (options?.nodeIndex) {
        store.createIndex('node_id', 'node_id', { unique: false })
    }

    if (options?.sceneIndex) {
        store.createIndex('scene_id', 'scene_id', { unique: false })
    }

    if (options?.entityIndex) {
        store.createIndex('entity_id', 'entity_id', { unique: false })
    }

    if (options?.assetIndex) {
        store.createIndex('asset_id', 'asset_id', { unique: false })
    }
}

export async function openLocalPersistenceDb() {
    const indexedDb = ensureIndexedDb()
    const request = indexedDb.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = request.result
        const oldVersion = event.oldVersion

        if (oldVersion < 3) {
            createStore(db, LOCAL_STORE_NAMES.projects)
            createStore(db, LOCAL_STORE_NAMES.structureNodes, { projectIndex: true })
            createStore(db, LOCAL_STORE_NAMES.scenes, { projectIndex: true, nodeIndex: true })
            createStore(db, LOCAL_STORE_NAMES.characters, { projectIndex: true })
            createStore(db, LOCAL_STORE_NAMES.ideas, { projectIndex: true })
            createStore(db, LOCAL_STORE_NAMES.locations, { projectIndex: true })
            createStore(db, LOCAL_STORE_NAMES.objects, { projectIndex: true })
            createStore(db, LOCAL_STORE_NAMES.comments, { projectIndex: true, nodeIndex: true })
            createStore(db, LOCAL_STORE_NAMES.projectAssets, { projectIndex: true })
            createStore(db, LOCAL_STORE_NAMES.sceneAssets, { projectIndex: true, sceneIndex: true, assetIndex: true })
            createStore(db, LOCAL_STORE_NAMES.entityAssets, { projectIndex: true, entityIndex: true, assetIndex: true })
            createStore(db, LOCAL_STORE_NAMES.aiResponses, { projectIndex: true })
        }

        if (oldVersion < 4) {
            // Add user_id index to projects store for per-user scoping.
            // Works for both fresh installs (store just created above) and v3→v4 upgrades
            // (existing store accessed via the versionchange transaction).
            const store = request.transaction!.objectStore(LOCAL_STORE_NAMES.projects)
            if (!store.indexNames.contains('user_id')) {
                store.createIndex('user_id', 'user_id', { unique: false })
            }
        }
    }

    return requestToPromise(request)
}

export async function getLocalRecordsByUserId<T>(userId: string) {
    const db = await openLocalPersistenceDb()
    const transaction = db.transaction(LOCAL_STORE_NAMES.projects, 'readonly')
    const store = transaction.objectStore(LOCAL_STORE_NAMES.projects)
    const index = store.index('user_id')
    const values = await requestToPromise(index.getAll(userId))
    await transactionToPromise(transaction)
    return (values as T[]) ?? []
}

export async function getLocalRecord<T>(storeName: LocalStoreName, id: string) {
    const db = await openLocalPersistenceDb()
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const value = await requestToPromise(store.get(id))
    await transactionToPromise(transaction)
    return (value as T | undefined) ?? null
}

export async function getAllLocalRecords<T>(storeName: LocalStoreName) {
    const db = await openLocalPersistenceDb()
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const values = await requestToPromise(store.getAll())
    await transactionToPromise(transaction)
    return (values as T[]) ?? []
}

export async function getLocalRecordsByProjectId<T>(storeName: Exclude<LocalStoreName, 'projects'>, projectId: string) {
    const db = await openLocalPersistenceDb()
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const index = store.index('project_id')
    const values = await requestToPromise(index.getAll(projectId))
    await transactionToPromise(transaction)
    return (values as T[]) ?? []
}

export async function getLocalRecordsByNodeId<T>(storeName: typeof LOCAL_STORE_NAMES.scenes, nodeId: string) {
    const db = await openLocalPersistenceDb()
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const index = store.index('node_id')
    const values = await requestToPromise(index.getAll(nodeId))
    await transactionToPromise(transaction)
    return (values as T[]) ?? []
}

export async function getLocalRecordsBySceneId<T>(storeName: typeof LOCAL_STORE_NAMES.sceneAssets, sceneId: string) {
    const db = await openLocalPersistenceDb()
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const index = store.index('scene_id')
    const values = await requestToPromise(index.getAll(sceneId))
    await transactionToPromise(transaction)
    return (values as T[]) ?? []
}

export async function getLocalRecordsByEntityId<T>(storeName: typeof LOCAL_STORE_NAMES.entityAssets, entityId: string) {
    const db = await openLocalPersistenceDb()
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const index = store.index('entity_id')
    const values = await requestToPromise(index.getAll(entityId))
    await transactionToPromise(transaction)
    return (values as T[]) ?? []
}

export async function getLocalRecordsByAssetId<T>(
    storeName: typeof LOCAL_STORE_NAMES.sceneAssets | typeof LOCAL_STORE_NAMES.entityAssets,
    assetId: string
) {
    const db = await openLocalPersistenceDb()
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const index = store.index('asset_id')
    const values = await requestToPromise(index.getAll(assetId))
    await transactionToPromise(transaction)
    return (values as T[]) ?? []
}

export async function putLocalRecord<T extends { id: string }>(storeName: LocalStoreName, value: T) {
    const db = await openLocalPersistenceDb()
    const transaction = db.transaction(storeName, 'readwrite')
    transaction.objectStore(storeName).put(value)
    await transactionToPromise(transaction)
    return value
}

export async function bulkPutLocalRecords<T extends { id: string }>(storeName: LocalStoreName, values: T[]) {
    if (values.length === 0) return

    const db = await openLocalPersistenceDb()
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)

    values.forEach((value) => {
        store.put(value)
    })

    await transactionToPromise(transaction)
}

export async function deleteLocalRecord(storeName: LocalStoreName, id: string) {
    const db = await openLocalPersistenceDb()
    const transaction = db.transaction(storeName, 'readwrite')
    transaction.objectStore(storeName).delete(id)
    await transactionToPromise(transaction)
}

export async function deleteLocalRecordsByProjectId(storeName: Exclude<LocalStoreName, 'projects'>, projectId: string) {
    const records = await getLocalRecordsByProjectId<{ id: string }>(storeName, projectId)
    if (records.length === 0) return

    const db = await openLocalPersistenceDb()
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)

    records.forEach((record) => {
        store.delete(record.id)
    })

    await transactionToPromise(transaction)
}

/**
 * Update specific fields of a local record.
 */
export async function updateLocalRecord<T extends { id: string }>(
    storeName: LocalStoreName, 
    id: string, 
    updates: Partial<T>
) {
    const db = await openLocalPersistenceDb()
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    
    // Get current record
    const current = await requestToPromise(store.get(id)) as T | undefined
    if (!current) {
        throw new Error(`Cannot update record ${id} in store ${storeName}: Not found`)
    }
    
    // Merge and put
    const updated = { ...current, ...updates }
    store.put(updated)
    
    await transactionToPromise(transaction)
    return updated
}
