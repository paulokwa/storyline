'use client'

/**
 * Phase 3 – Backup System: Export Engine
 *
 * Reads all data for a local-only project via the persistence layer and
 * triggers a browser download of a `.storyline` JSON backup file.
 *
 * Rules:
 * - ONLY reads through lib/persistence/* — no direct Supabase calls.
 * - Soft-deleted records are excluded (backup = current visible state).
 * - Assets are already stored as base64 data URLs — exported verbatim.
 */

import {
    BACKUP_FILE_EXTENSION,
    BACKUP_FORMAT_VERSION,
    BACKUP_MIME_TYPE,
    type StorylineBackup,
} from '@/lib/backup/backup-format'
import { requireLocalProject } from '@/lib/persistence/local-projects'
import {
    getLocalRecordsByProjectId,
    LOCAL_STORE_NAMES,
} from '@/lib/persistence/local-db'
import { listLocalComments } from '@/lib/persistence/local-comments'
import type { Database } from '@/lib/supabase/types'

type StructureNodeRow = Database['public']['Tables']['structure_nodes']['Row']
type SceneRow = Database['public']['Tables']['scenes']['Row']
type CharacterRow = Database['public']['Tables']['characters']['Row']
type IdeaRow = Database['public']['Tables']['ideas']['Row']
type LocationRow = Database['public']['Tables']['locations']['Row']
type ObjectRow = Database['public']['Tables']['objects']['Row']
type ProjectAssetRow = Database['public']['Tables']['project_assets']['Row']
type SceneAssetRow = Database['public']['Tables']['scene_assets']['Row']
type EntityAssetRow = Database['public']['Tables']['entity_assets']['Row']

/** Approximate word count from a TipTap JSON doc (best-effort, fast). */
function estimateWordCount(scenes: SceneRow[]): number {
    let total = 0
    for (const scene of scenes) {
        if (!scene.content) continue
        try {
            const text = JSON.stringify(scene.content)
            total += text.split(/\s+/).length
        } catch {
            // ignore
        }
    }
    return total
}

/** Estimate size of the resulting JSON bundle in bytes (rough). */
export function estimateBackupSizeBytes(scenes: SceneRow[], assets: ProjectAssetRow[]): number {
    let size = 2048 // base overhead for project + structure + entities
    for (const scene of scenes) {
        size += JSON.stringify(scene.content ?? '').length
    }
    for (const asset of assets) {
        size += (asset.storage_path?.length ?? 0)
    }
    return size
}

/**
 * Assembles the complete backup bundle for a local-only project.
 * Does NOT trigger download — returns the bundle object.
 */
export async function buildLocalBackup(projectId: string): Promise<StorylineBackup> {
    const project = await requireLocalProject(projectId)

    const [
        allNodes,
        allScenes,
        allCharacters,
        allIdeas,
        allLocations,
        allObjects,
        allAssets,
        allSceneAssets,
        allEntityAssets,
        activeComments,
    ] = await Promise.all([
        getLocalRecordsByProjectId<StructureNodeRow>(LOCAL_STORE_NAMES.structureNodes, projectId),
        getLocalRecordsByProjectId<SceneRow>(LOCAL_STORE_NAMES.scenes, projectId),
        getLocalRecordsByProjectId<CharacterRow>(LOCAL_STORE_NAMES.characters, projectId),
        getLocalRecordsByProjectId<IdeaRow>(LOCAL_STORE_NAMES.ideas, projectId),
        getLocalRecordsByProjectId<LocationRow>(LOCAL_STORE_NAMES.locations, projectId),
        getLocalRecordsByProjectId<ObjectRow>(LOCAL_STORE_NAMES.objects, projectId),
        getLocalRecordsByProjectId<ProjectAssetRow>(LOCAL_STORE_NAMES.projectAssets, projectId),
        getLocalRecordsByProjectId<SceneAssetRow>(LOCAL_STORE_NAMES.sceneAssets, projectId),
        getLocalRecordsByProjectId<EntityAssetRow>(LOCAL_STORE_NAMES.entityAssets, projectId),
        listLocalComments(projectId), // already filters to active-only
    ])

    return {
        version: BACKUP_FORMAT_VERSION,
        exported_at: new Date().toISOString(),
        app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0',
        project,
        structure_nodes: allNodes.filter((n) => n.deleted_at == null),
        scenes: allScenes.filter((s) => s.deleted_at == null),
        characters: allCharacters.filter((c) => c.deleted_at == null),
        ideas: allIdeas.filter((i) => i.deleted_at == null),
        locations: allLocations.filter((l) => l.deleted_at == null),
        objects: allObjects.filter((o) => o.deleted_at == null),
        comments: activeComments,
        project_assets: allAssets,
        scene_assets: allSceneAssets,
        entity_assets: allEntityAssets,
    }
}

/**
 * Exports a local-only project as a `.storyline` backup file and triggers
 * a browser download.
 *
 * @returns Estimated word count at time of backup (for reminder tracking).
 */
export async function exportLocalBackup(projectId: string): Promise<{ wordCount: number; sizeBytes: number }> {
    const backup = await buildLocalBackup(projectId)
    const wordCount = estimateWordCount(backup.scenes)
    const sizeBytes = estimateBackupSizeBytes(backup.scenes, backup.project_assets)

    const json = JSON.stringify(backup, null, 2)
    const blob = new Blob([json], { type: BACKUP_MIME_TYPE })
    const url = URL.createObjectURL(blob)

    const safeTitle = (backup.project.title ?? 'untitled')
        .replace(/[^a-z0-9\-_ ]/gi, '')
        .replace(/\s+/g, '-')
        .toLowerCase()
        .slice(0, 60)
    const fileName = `${safeTitle}-backup${BACKUP_FILE_EXTENSION}`

    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.click()

    // Clean up object URL after 10s
    setTimeout(() => URL.revokeObjectURL(url), 10_000)

    return { wordCount, sizeBytes }
}
