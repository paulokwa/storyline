import { createClient } from '@/lib/supabase/client'
import { getUserSafely } from '@/lib/supabase/client-auth'
import {
    loadLocalStoryWorkspaceData,
    getLocalProject,
    updateLocalProject,
    LocalProjectRow,
} from '@/lib/persistence/local-projects'
import { getLocalRecordsByProjectId, LOCAL_STORE_NAMES } from '@/lib/persistence/local-db'
import type { Database } from '@/lib/supabase/types'

type ProjectRow = Database['public']['Tables']['projects']['Row']
type StructureNodeRow = Database['public']['Tables']['structure_nodes']['Row']
type SceneRow = Database['public']['Tables']['scenes']['Row']
type CharacterRow = Database['public']['Tables']['characters']['Row']
type IdeaRow = Database['public']['Tables']['ideas']['Row']
type LocationRow = Database['public']['Tables']['locations']['Row']
type ObjectRow = Database['public']['Tables']['objects']['Row']
type ProjectCommentRow = Database['public']['Tables']['project_comments']['Row']
type ProjectAssetRow = Database['public']['Tables']['project_assets']['Row']
type SceneAssetRow = Database['public']['Tables']['scene_assets']['Row']
type EntityAssetRow = Database['public']['Tables']['entity_assets']['Row']
type AiResponseRow = Database['public']['Tables']['ai_responses']['Row']

async function fetchBase64AsBlob(base64: string): Promise<Blob> {
    const res = await fetch(base64)
    return res.blob()
}

export async function migrateLocalProjectToCloud(localProjectId: string, onProgress?: (msg: string) => void) {
    const supabase = createClient()
    const { user } = await getUserSafely(supabase)
    
    if (!user) {
        throw new Error('You must be logged in to enable cloud sync.')
    }

    onProgress?.('Preparing project...')
    
    const localProject = await getLocalProject(localProjectId)
    if (!localProject) throw new Error('Local project not found.')
    
    if (localProject.migrated_to_cloud_project_id) {
        throw new Error('This project has already been migrated to cloud.')
    }

    // 1. Data Extraction
    const [
        workspaceData,
        comments,
        projectAssets,
        sceneAssets,
        entityAssets,
        aiResponses
    ] = await Promise.all([
        loadLocalStoryWorkspaceData(localProjectId),
        getLocalRecordsByProjectId<ProjectCommentRow>(LOCAL_STORE_NAMES.comments, localProjectId),
        getLocalRecordsByProjectId<ProjectAssetRow>(LOCAL_STORE_NAMES.projectAssets, localProjectId),
        getLocalRecordsByProjectId<SceneAssetRow>(LOCAL_STORE_NAMES.sceneAssets, localProjectId),
        getLocalRecordsByProjectId<EntityAssetRow>(LOCAL_STORE_NAMES.entityAssets, localProjectId),
        getLocalRecordsByProjectId<AiResponseRow>(LOCAL_STORE_NAMES.aiResponses, localProjectId),
    ])

    const { nodes, projectCharacters, projectIdeas, projectLocations, projectObjects, allScenes } = workspaceData

    // 2. ID Remapping Dictionary
    const idMap = new Map<string, string>()
    const getNewId = (oldId: string | null) => {
        if (!oldId) return null
        if (!idMap.has(oldId)) {
            idMap.set(oldId, crypto.randomUUID())
        }
        return idMap.get(oldId)!
    }

    // Pre-generate UUIDs for primary entities to ensure stable mapping
    getNewId(localProject.id)
    nodes.forEach(n => getNewId(n.id))
    allScenes.forEach(s => getNewId(s.id))
    projectCharacters.forEach(c => getNewId(c.id))
    projectIdeas.forEach(i => getNewId(i.id))
    projectLocations.forEach(l => getNewId(l.id))
    projectObjects.forEach(o => getNewId(o.id))
    comments.forEach(c => getNewId(c.id))
    projectAssets.forEach(a => getNewId(a.id))
    sceneAssets.forEach(a => getNewId(a.id))
    entityAssets.forEach(a => getNewId(a.id))
    aiResponses.forEach(r => getNewId(r.id))

    const newProjectId = getNewId(localProject.id)!

    // 3. Dry-Run Validation Rule
    // Map Project — explicitly map only columns that exist in the Supabase schema.
    // Never spread localProject directly: local rows may have extra fields that will
    // cause PostgREST "column not found in schema cache" errors.
    const isBlobOrLocalUrl = (url: string | null | undefined) =>
        url?.startsWith('data:') || url?.startsWith('blob:') || url?.startsWith('local_')

    const cloudProject: ProjectRow = {
        id: newProjectId,
        user_id: user.id,
        title: localProject.title,
        type: localProject.type,
        writing_mode: localProject.writing_mode,
        premise: localProject.premise ?? null,
        tone: localProject.tone ?? null,
        setting: localProject.setting ?? null,
        // cover_url is the actual column name in Supabase (not cover_image_url)
        cover_url: isBlobOrLocalUrl((localProject as any).cover_url ?? (localProject as any).cover_image_url)
            ? null
            : ((localProject as any).cover_url ?? (localProject as any).cover_image_url ?? null),
        order_index: localProject.order_index ?? 0,
        export_metadata: localProject.export_metadata ?? null,
        share_owner_feedback: localProject.share_owner_feedback ?? false,
        allow_collaborator_exports: localProject.allow_collaborator_exports ?? false,
        allow_viewer_feedback: localProject.allow_viewer_feedback ?? false,
        created_at: localProject.created_at,
        updated_at: new Date().toISOString(),
        last_accessed_at: localProject.last_accessed_at ?? null,
        deleted_at: null,
        project_type: (localProject as any).project_type ?? null,
    }

    // Map Nodes
    const cloudNodes: StructureNodeRow[] = nodes.map(n => ({
        ...n,
        id: getNewId(n.id)!,
        project_id: newProjectId,
        parent_id: getNewId(n.parent_id),
    }))

    // Helper to recursively remap local_ IDs in JSON content (Tiptap doc trees etc.)
    const ID_ATTR_KEYS = new Set(['commentId', 'assetId', 'entityId', 'nodeId', 'sceneId'])
    const remapJsonContent = (obj: any): any => {
        if (!obj) return obj
        if (Array.isArray(obj)) return obj.map(remapJsonContent)
        if (typeof obj === 'object') {
            const newObj: any = {}
            for (const [k, v] of Object.entries(obj)) {
                if (ID_ATTR_KEYS.has(k) && typeof v === 'string' && v.startsWith('local_')) {
                    newObj[k] = getNewId(v) ?? v
                } else {
                    newObj[k] = remapJsonContent(v)
                }
            }
            return newObj
        }
        return obj
    }

    // Map Scenes
    const cloudScenes: SceneRow[] = allScenes.map(s => {
        const { scene_characters, scene_ideas, scene_locations, scene_objects, ...sceneData } = s as any
        return {
            ...sceneData,
            id: getNewId(s.id)!,
            project_id: newProjectId,
            node_id: getNewId(s.node_id)!,
            last_editor_id: user.id, // Update editor
            content: remapJsonContent(sceneData.content)
        }
    })

    // Map Entities
    const cloudCharacters: CharacterRow[] = projectCharacters.map(c => ({
        ...c, id: getNewId(c.id)!, project_id: newProjectId
    }))
    const cloudIdeas: IdeaRow[] = projectIdeas.map(i => ({
        ...i, id: getNewId(i.id)!, project_id: newProjectId
    }))
    const cloudLocations: LocationRow[] = projectLocations.map(l => ({
        ...l, id: getNewId(l.id)!, project_id: newProjectId
    }))
    const cloudObjects: ObjectRow[] = projectObjects.map(o => ({
        ...o, id: getNewId(o.id)!, project_id: newProjectId
    }))

    // Map Comments
    const cloudComments: ProjectCommentRow[] = comments.map(c => ({
        id: getNewId(c.id)!,
        project_id: newProjectId,
        node_id: getNewId(c.node_id),
        parent_id: getNewId(c.parent_id),
        author_id: user.id, // Transfer ownership
        content: c.content,
        status: c.status || 'open',
        anchor_data: c.anchor_data,
        order_index: c.order_index || 0,
        is_shared: c.is_shared || false,
        created_at: c.created_at,
        updated_at: c.updated_at
    }))

    // Map Assets
    const cloudProjectAssets: ProjectAssetRow[] = projectAssets.map(a => ({
        ...a,
        id: getNewId(a.id)!,
        project_id: newProjectId,
        uploaded_by: user.id
        // storage_path will be populated after upload
    }))

    const cloudSceneAssets: SceneAssetRow[] = sceneAssets.map(a => ({
        ...a,
        id: getNewId(a.id)!,
        project_id: newProjectId,
        scene_id: getNewId(a.scene_id)!,
        asset_id: getNewId(a.asset_id)!
    }))

    const cloudEntityAssets: EntityAssetRow[] = entityAssets.map(a => ({
        ...a,
        id: getNewId(a.id)!,
        project_id: newProjectId,
        entity_id: getNewId(a.entity_id)!,
        asset_id: getNewId(a.asset_id)!
    }))

    // Map AI Responses
    const cloudAiResponses: AiResponseRow[] = aiResponses.map(r => ({
        ...r,
        id: getNewId(r.id)!,
        project_id: newProjectId,
        source_scene_id: getNewId(r.source_scene_id),
        source_node_id: getNewId(r.source_node_id),
    }))

    // Quick validation check to ensure no 'local_' IDs slipped through foreign keys
    const allPayloads = [
        ...cloudNodes, ...cloudScenes, ...cloudCharacters, ...cloudIdeas, 
        ...cloudLocations, ...cloudObjects, ...cloudComments, 
        ...cloudProjectAssets, ...cloudSceneAssets, ...cloudEntityAssets,
        ...cloudAiResponses
    ]

    const validatePayloadRecursively = (obj: any, path: string = '') => {
        if (!obj) return
        if (Array.isArray(obj)) {
            obj.forEach((item, i) => validatePayloadRecursively(item, `${path}[${i}]`))
            return
        }
        if (typeof obj === 'object') {
            for (const [k, v] of Object.entries(obj)) {
                // `content` nodes have generic text that might randomly say "local_business" so skip scanning actual text content fields unless it's an ID field
                // Tiptap content marks store IDs in `attrs.commentId`. We checked and rewrote them above. 
                // We'll scan everything but ignore simple text fields to avoid false positives.
                if (k === 'text' || k === 'title' || k === 'name' || k === 'content' && typeof v === 'string') continue;
                validatePayloadRecursively(v, `${path}.${k}`)
            }
            return
        }
        if (typeof obj === 'string' && obj.startsWith('local_')) {
            // Exclude base64 strings
            if (obj.startsWith('local_') && !obj.includes(';base64,')) {
                throw new Error(`Dry-Run Validation Failed: Found unmapped local ID '${obj}' at path '${path}'`)
            }
        }
    }

    for (const record of allPayloads) {
        validatePayloadRecursively(record, record.id || 'unknown')
    }

    // 4. Asset Handling Rule
    // NOTE: We must insert the project row FIRST so that get_my_project_role() returns a valid
    // role during the storage upload RLS check. We'll insert the rest of the DB records after.
    onProgress?.('Creating cloud project...')

    // Helper to throw on Supabase insertion error
    const insertOrThrow = async (table: string, payload: any[]) => {
        if (payload.length === 0) return
        const { error } = await supabase.from(table).insert(payload)
        if (error) throw new Error(`Database insertion failed for ${table}: ${error.message}`)
    }

    // Insert project row first (needed for storage RLS)
    try {
        await insertOrThrow('projects', [cloudProject])
    } catch (projectErr: any) {
        throw new Error(`Migration Atomicity Error: ${projectErr.message}`)
    }

    // Track uploaded storage paths for cleanup on failure
    const uploadedPaths: string[] = []

    onProgress?.('Uploading assets...')
    
    for (let i = 0; i < projectAssets.length; i++) {
        const localAsset = projectAssets[i]
        const cloudAsset = cloudProjectAssets.find(a => a.id === getNewId(localAsset.id))!
        
        if (localAsset.storage_path.startsWith('data:')) {
            try {
                const ext = localAsset.file_name.split('.').pop() || 'bin'
                
                // Upload via server-side API route to bypass storage RLS during migration
                const res = await fetch('/api/migration/upload-asset', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        projectId: newProjectId,
                        assetId: cloudAsset.id,
                        base64: localAsset.storage_path,
                        mimeType: localAsset.mime_type,
                        fileName: localAsset.file_name,
                        extension: ext,
                    }),
                })

                if (!res.ok) {
                    const body = await res.json().catch(() => ({}))
                    throw new Error(body.error ?? `HTTP ${res.status}`)
                }

                const { storagePath } = await res.json()
                uploadedPaths.push(storagePath)
                cloudAsset.storage_path = storagePath
            } catch (err: any) {
                throw new Error(`Failed to upload asset '${localAsset.file_name}': ${err.message}`)
            }
        } else {
            cloudAsset.storage_path = localAsset.storage_path
        }
    }

    // 5. Cloud Insertion (remaining tables)
    onProgress?.('Finalizing migration...')

    try {
        // Note: project_members for owner is created automatically by DB trigger 'on_project_created'
        await insertOrThrow('structure_nodes', cloudNodes)
        await insertOrThrow('scenes', cloudScenes)
        
        await insertOrThrow('characters', cloudCharacters)
        await insertOrThrow('ideas', cloudIdeas)
        await insertOrThrow('locations', cloudLocations)
        await insertOrThrow('objects', cloudObjects)
        
        await insertOrThrow('project_comments', cloudComments)
        
        await insertOrThrow('project_assets', cloudProjectAssets)
        await insertOrThrow('scene_assets', cloudSceneAssets)
        await insertOrThrow('entity_assets', cloudEntityAssets)
        await insertOrThrow('ai_responses', cloudAiResponses)

    } catch (dbErr: any) {
        // Clean up: delete the project (cascades or we rely on the caller to retry)
        await supabase.from('projects').delete().eq('id', newProjectId)
        // Also remove any uploaded storage files
        if (uploadedPaths.length > 0) {
            await supabase.storage.from('project-assets').remove(uploadedPaths)
        }
        throw new Error(`Migration Atomicity Error: ${dbErr.message}`)
    }

    // 6. Mark local project as migrated
    await updateLocalProject(localProjectId, { migrated_to_cloud_project_id: newProjectId })

    return newProjectId
}
