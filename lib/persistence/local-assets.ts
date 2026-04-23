import {
    LOCAL_STORE_NAMES,
    deleteLocalRecord,
    getLocalRecord,
    getLocalRecordsByAssetId,
    getLocalRecordsByEntityId,
    getLocalRecordsByProjectId,
    getLocalRecordsBySceneId,
    putLocalRecord,
} from '@/lib/persistence/local-db'
import type { Database } from '@/lib/supabase/types'

type ProjectAssetRow = Database['public']['Tables']['project_assets']['Row']
type SceneAssetRow = Database['public']['Tables']['scene_assets']['Row']
type EntityAssetRow = Database['public']['Tables']['entity_assets']['Row']

export type LocalEntityAssetType = 'character' | 'location' | 'object' | 'idea'

export type LocalSceneAssetWithAsset = {
    id: string
    asset_id: string
    asset: Pick<ProjectAssetRow, 'id' | 'storage_path' | 'file_name' | 'mime_type'>
}

function sortAssets<T extends { created_at: string | null }>(assets: T[]) {
    return [...assets].sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
}

function readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
        reader.onerror = () => reject(reader.error ?? new Error('Failed to read file.'))
        reader.readAsDataURL(file)
    })
}

function getImageDimensions(dataUrl: string) {
    return new Promise<{ width: number | null; height: number | null }>((resolve) => {
        const img = new Image()
        img.onload = () => resolve({ width: img.width, height: img.height })
        img.onerror = () => resolve({ width: null, height: null })
        img.src = dataUrl
    })
}

export function getLocalAssetUrl(asset: Pick<ProjectAssetRow, 'storage_path'>) {
    return asset.storage_path
}

export async function listLocalProjectAssets(projectId: string) {
    const assets = await getLocalRecordsByProjectId<ProjectAssetRow>(LOCAL_STORE_NAMES.projectAssets, projectId)
    return sortAssets(assets)
}

export async function createLocalProjectAsset(projectId: string, file: File, uploadedBy: string | null) {
    const assetId = `${projectId}_asset_${crypto.randomUUID()}`
    const timestamp = new Date().toISOString()
    const dataUrl = await readFileAsDataUrl(file)
    const dimensions = file.type.startsWith('image/') ? await getImageDimensions(dataUrl) : { width: null, height: null }

    const asset: ProjectAssetRow = {
        alt_text: null,
        asset_type: file.type.startsWith('image/') ? 'image' : 'file',
        caption: null,
        created_at: timestamp,
        file_name: file.name,
        file_size: file.size,
        height: dimensions.height,
        id: assetId,
        mime_type: file.type,
        project_id: projectId,
        storage_path: dataUrl,
        updated_at: timestamp,
        uploaded_by: uploadedBy,
        width: dimensions.width,
    }

    await putLocalRecord(LOCAL_STORE_NAMES.projectAssets, asset)
    return asset
}

export async function deleteLocalProjectAsset(assetId: string) {
    const [sceneLinks, entityLinks] = await Promise.all([
        getLocalRecordsByAssetId<SceneAssetRow>(LOCAL_STORE_NAMES.sceneAssets, assetId),
        getLocalRecordsByAssetId<EntityAssetRow>(LOCAL_STORE_NAMES.entityAssets, assetId),
    ])

    await Promise.all([
        deleteLocalRecord(LOCAL_STORE_NAMES.projectAssets, assetId),
        ...sceneLinks.map((link) => deleteLocalRecord(LOCAL_STORE_NAMES.sceneAssets, link.id)),
        ...entityLinks.map((link) => deleteLocalRecord(LOCAL_STORE_NAMES.entityAssets, link.id)),
    ])
}

export async function getLocalPrimaryEntityAsset(entityId: string) {
    const links = await getLocalRecordsByEntityId<EntityAssetRow>(LOCAL_STORE_NAMES.entityAssets, entityId)
    const primary = links.find((link) => link.is_primary)
    if (!primary) return null
    return getLocalRecord<ProjectAssetRow>(LOCAL_STORE_NAMES.projectAssets, primary.asset_id)
}

export async function setLocalPrimaryEntityAsset(
    projectId: string,
    entityId: string,
    entityType: LocalEntityAssetType,
    assetId: string
) {
    const links = await getLocalRecordsByEntityId<EntityAssetRow>(LOCAL_STORE_NAMES.entityAssets, entityId)

    await Promise.all(
        links.map((link) =>
            putLocalRecord(LOCAL_STORE_NAMES.entityAssets, {
                ...link,
                is_primary: link.asset_id === assetId,
            })
        )
    )

    const existing = links.find((link) => link.asset_id === assetId)
    if (existing) {
        await putLocalRecord(LOCAL_STORE_NAMES.entityAssets, {
            ...existing,
            is_primary: true,
        })
        return
    }

    const link: EntityAssetRow = {
        asset_id: assetId,
        created_at: new Date().toISOString(),
        entity_id: entityId,
        entity_type: entityType,
        id: `${projectId}_entity_asset_${crypto.randomUUID()}`,
        is_primary: true,
        project_id: projectId,
    }

    await putLocalRecord(LOCAL_STORE_NAMES.entityAssets, link)
}

export async function removeLocalPrimaryEntityAsset(entityId: string) {
    const links = await getLocalRecordsByEntityId<EntityAssetRow>(LOCAL_STORE_NAMES.entityAssets, entityId)
    const primary = links.find((link) => link.is_primary)
    if (!primary) return
    await deleteLocalRecord(LOCAL_STORE_NAMES.entityAssets, primary.id)
}

export async function listLocalSceneAssets(sceneId: string) {
    const sceneLinks = await getLocalRecordsBySceneId<SceneAssetRow>(LOCAL_STORE_NAMES.sceneAssets, sceneId)
    const sortedLinks = [...sceneLinks].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    const assets = await Promise.all(
        sortedLinks.map(async (link) => ({
            id: link.id,
            asset_id: link.asset_id,
            asset: await getLocalRecord<ProjectAssetRow>(LOCAL_STORE_NAMES.projectAssets, link.asset_id),
        }))
    )

    return assets
        .filter((item): item is LocalSceneAssetWithAsset & { asset: ProjectAssetRow } => !!item.asset)
        .map((item) => ({
            id: item.id,
            asset_id: item.asset_id,
            asset: {
                id: item.asset.id,
                storage_path: item.asset.storage_path,
                file_name: item.asset.file_name,
                mime_type: item.asset.mime_type,
            },
        }))
}

export async function toggleLocalSceneAsset(projectId: string, sceneId: string, assetId: string) {
    const sceneLinks = await getLocalRecordsBySceneId<SceneAssetRow>(LOCAL_STORE_NAMES.sceneAssets, sceneId)
    const existing = sceneLinks.find((link) => link.asset_id === assetId)

    if (existing) {
        await deleteLocalRecord(LOCAL_STORE_NAMES.sceneAssets, existing.id)
        return { attached: false }
    }

    const link: SceneAssetRow = {
        asset_id: assetId,
        created_at: new Date().toISOString(),
        id: `${projectId}_scene_asset_${crypto.randomUUID()}`,
        project_id: projectId,
        scene_id: sceneId,
        sort_order: sceneLinks.length,
    }

    await putLocalRecord(LOCAL_STORE_NAMES.sceneAssets, link)
    return { attached: true }
}
