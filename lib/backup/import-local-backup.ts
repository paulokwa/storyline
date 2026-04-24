'use client'

/**
 * Phase 3 – Backup System: Import Engine
 *
 * Parses a `.storyline` backup file and writes all records into the local
 * IndexedDB via the persistence layer.
 *
 * Rules:
 * - ONLY writes through lib/persistence/* — no direct Supabase calls.
 * - ALL IDs are remapped to fresh `local_*` IDs to prevent collisions.
 * - The importing user's ID is stamped onto the project.
 * - Returns the new project ID so the caller can navigate to it.
 */

import { BACKUP_FORMAT_VERSION, type StorylineBackup } from '@/lib/backup/backup-format'
import {
    bulkPutLocalRecords,
    putLocalRecord,
    deleteLocalRecordsByProjectId,
    LOCAL_STORE_NAMES,
} from '@/lib/persistence/local-db'
import { listLocalProjects, type LocalProjectRow } from '@/lib/persistence/local-projects'
import { LOCAL_PROJECT_ID_PREFIX } from '@/lib/persistence/project-mode'
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

export type ImportResult =
    | { ok: true; projectId: string }
    | { ok: false; reason: string }

export type LibraryImportOptions = {
    backupBaseTitle: string
    suggestedProject: LocalProjectRow | null
    sameTypeProjects: LocalProjectRow[]
    nextCopyTitle: string
}

type ImportLocalBackupOptions = {
    title?: string
}

type RestoreLocalBackupOptions = {
    title?: string | null
}

/** Generates a new local-prefixed ID. */
function newLocalId(prefix: string): string {
    return `${LOCAL_PROJECT_ID_PREFIX}${prefix}_${crypto.randomUUID()}`
}

function normalizeProjectTitle(title: string) {
    return title.trim().replace(/\s+/g, ' ')
}

export function getBackupBaseTitle(title: string | null | undefined): string {
    let baseTitle = normalizeProjectTitle(title || 'Untitled')

    while (/\s+\(Imported(?:\s+\d+)?\)$/i.test(baseTitle)) {
        baseTitle = normalizeProjectTitle(baseTitle.replace(/\s+\(Imported(?:\s+\d+)?\)$/i, ''))
    }

    return baseTitle || 'Untitled'
}

function titleKey(title: string | null | undefined) {
    return normalizeProjectTitle(title || 'Untitled').toLowerCase()
}

export function getNextImportedProjectTitle(
    baseTitle: string | null | undefined,
    existingTitles: Array<string | null | undefined>
): string {
    const normalizedBaseTitle = getBackupBaseTitle(baseTitle)
    const existing = new Set(existingTitles.map((title) => titleKey(title)))
    const firstImportTitle = `${normalizedBaseTitle} (Imported)`

    if (!existing.has(titleKey(firstImportTitle))) {
        return firstImportTitle
    }

    let importNumber = 2
    while (existing.has(titleKey(`${normalizedBaseTitle} (Imported ${importNumber})`))) {
        importNumber += 1
    }

    return `${normalizedBaseTitle} (Imported ${importNumber})`
}

export async function getLibraryImportOptions(backup: StorylineBackup): Promise<LibraryImportOptions | null> {
    const projects = await listLocalProjects()
    const activeProjects = projects.filter((project) => project.deleted_at == null)
    const sameTypeProjects = activeProjects.filter((project) => project.type === backup.project.type)
    const backupBaseTitle = getBackupBaseTitle(backup.project.title)
    const backupBaseKey = titleKey(backupBaseTitle)
    const suggestedProject =
        sameTypeProjects.find((project) => titleKey(project.title) === backupBaseKey)
        ?? sameTypeProjects.find((project) => titleKey(getBackupBaseTitle(project.title)) === backupBaseKey)
        ?? null

    if (sameTypeProjects.length === 0) {
        return null
    }

    return {
        backupBaseTitle,
        suggestedProject,
        sameTypeProjects,
        nextCopyTitle: getNextImportedProjectTitle(
            backupBaseTitle,
            activeProjects.map((project) => project.title)
        ),
    }
}

/**
 * Parses raw JSON from a file picker into a `StorylineBackup`.
 * Returns a descriptive error string if validation fails.
 */
export function parseBackupFile(raw: string): { data: StorylineBackup } | { error: string } {
    let parsed: unknown
    try {
        parsed = JSON.parse(raw)
    } catch {
        return { error: 'The file is not valid JSON.' }
    }

    if (typeof parsed !== 'object' || parsed === null) {
        return { error: 'The backup file format is unrecognised.' }
    }

    const obj = parsed as Record<string, unknown>

    if (obj['version'] !== BACKUP_FORMAT_VERSION) {
        return {
            error: `Unsupported backup version (got ${obj['version']}, expected ${BACKUP_FORMAT_VERSION}). Please use a newer version of Storyline to import this backup.`,
        }
    }

    const projectObj = typeof obj['project'] === 'object' && obj['project'] !== null
        ? obj['project'] as Record<string, unknown>
        : null

    if (obj['storage_mode'] === 'cloud-enabled' || projectObj?.storage_mode === 'cloud-enabled') {
        return { error: 'Cloud project backups cannot be imported as local projects.' }
    }

    const required = ['project', 'structure_nodes', 'scenes', 'characters', 'ideas', 'locations', 'objects']
    for (const key of required) {
        if (!(key in obj)) {
            return { error: `The backup file is missing required field: "${key}".` }
        }
    }

    return { data: parsed as StorylineBackup }
}

/**
 * Imports a parsed `.storyline` backup into local IndexedDB.
 *
 * - Remaps all IDs to prevent collisions.
 * - Stamps the importing user's ID onto the project.
 * - Appends " (Imported)" to the project title to distinguish from the original.
 *
 * @returns The new project ID.
 */
export async function importLocalBackup(
    backup: StorylineBackup,
    importingUserId: string,
    options: ImportLocalBackupOptions = {}
): Promise<ImportResult> {
    try {
        // ── Build ID remap table ──────────────────────────────────────────
        const idMap = new Map<string, string>()

        function remap(oldId: string | null | undefined, prefix: string): string {
            if (!oldId) return newLocalId(prefix)
            if (idMap.has(oldId)) return idMap.get(oldId)!
            const newId = newLocalId(prefix)
            idMap.set(oldId, newId)
            return newId
        }

        // Pre-assign project ID so it is stable for all FK references
        const newProjectId = remap(backup.project.id, 'project')

        // Pre-assign IDs for all entities
        for (const node of backup.structure_nodes) remap(node.id, 'node')
        for (const scene of backup.scenes) remap(scene.id, 'scene')
        for (const c of backup.characters) remap(c.id, 'character')
        for (const i of backup.ideas) remap(i.id, 'idea')
        for (const l of backup.locations) remap(l.id, 'location')
        for (const o of backup.objects) remap(o.id, 'object')
        for (const comment of (backup.comments ?? [])) remap(comment.id, 'comment')
        for (const asset of (backup.project_assets ?? [])) remap(asset.id, 'asset')
        for (const sa of (backup.scene_assets ?? [])) remap(sa.id, 'scene_asset')
        for (const ea of (backup.entity_assets ?? [])) remap(ea.id, 'entity_asset')

        // ── Remap project ─────────────────────────────────────────────────
        const timestamp = new Date().toISOString()
        const newProject = {
            ...backup.project,
            id: newProjectId,
            user_id: importingUserId,
            title: options.title ?? getNextImportedProjectTitle(getBackupBaseTitle(backup.project.title), []),
            created_at: timestamp,
            updated_at: timestamp,
            last_accessed_at: timestamp,
            order_index: Date.now(),
            is_local: true as const,
            storage_mode: 'local-only' as const,
        }

        // ── Remap structure nodes ─────────────────────────────────────────
        const newNodes: StructureNodeRow[] = backup.structure_nodes.map((node) => ({
            ...node,
            id: idMap.get(node.id)!,
            project_id: newProjectId,
            parent_id: node.parent_id ? (idMap.get(node.parent_id) ?? node.parent_id) : null,
        }))

        // ── Remap scenes ──────────────────────────────────────────────────
        const newScenes: SceneRow[] = backup.scenes.map((scene) => ({
            ...scene,
            id: idMap.get(scene.id)!,
            project_id: newProjectId,
            node_id: idMap.get(scene.node_id) ?? scene.node_id,
        }))

        // ── Remap characters ──────────────────────────────────────────────
        const newCharacters: CharacterRow[] = backup.characters.map((c) => ({
            ...c,
            id: idMap.get(c.id)!,
            project_id: newProjectId,
        }))

        // ── Remap ideas ───────────────────────────────────────────────────
        const newIdeas: IdeaRow[] = backup.ideas.map((i) => ({
            ...i,
            id: idMap.get(i.id)!,
            project_id: newProjectId,
        }))

        // ── Remap locations ───────────────────────────────────────────────
        const newLocations: LocationRow[] = backup.locations.map((l) => ({
            ...l,
            id: idMap.get(l.id)!,
            project_id: newProjectId,
        }))

        // ── Remap objects ─────────────────────────────────────────────────
        const newObjects: ObjectRow[] = backup.objects.map((o) => ({
            ...o,
            id: idMap.get(o.id)!,
            project_id: newProjectId,
        }))

        // ── Remap comments ────────────────────────────────────────────────
        const newComments = (backup.comments ?? []).map((comment) => ({
            ...comment,
            id: idMap.get(comment.id)!,
            project_id: newProjectId,
            node_id: comment.node_id ? (idMap.get(comment.node_id) ?? comment.node_id) : null,
            parent_id: comment.parent_id ? (idMap.get(comment.parent_id) ?? comment.parent_id) : null,
            author_id: importingUserId,
        }))

        // ── Remap assets ──────────────────────────────────────────────────
        const newAssets: ProjectAssetRow[] = (backup.project_assets ?? []).map((asset) => ({
            ...asset,
            id: idMap.get(asset.id)!,
            project_id: newProjectId,
        }))

        // ── Remap scene_assets ────────────────────────────────────────────
        const newSceneAssets: SceneAssetRow[] = (backup.scene_assets ?? []).map((sa) => ({
            ...sa,
            id: idMap.get(sa.id)!,
            project_id: newProjectId,
            scene_id: idMap.get(sa.scene_id) ?? sa.scene_id,
            asset_id: idMap.get(sa.asset_id) ?? sa.asset_id,
        }))

        // ── Remap entity_assets ───────────────────────────────────────────
        const newEntityAssets: EntityAssetRow[] = (backup.entity_assets ?? []).map((ea) => ({
            ...ea,
            id: idMap.get(ea.id)!,
            project_id: newProjectId,
            entity_id: idMap.get(ea.entity_id) ?? ea.entity_id,
            asset_id: idMap.get(ea.asset_id) ?? ea.asset_id,
        }))

        // ── Write everything via persistence layer ────────────────────────
        await putLocalRecord(LOCAL_STORE_NAMES.projects, newProject)

        await Promise.all([
            bulkPutLocalRecords(LOCAL_STORE_NAMES.structureNodes, newNodes),
            bulkPutLocalRecords(LOCAL_STORE_NAMES.scenes, newScenes),
            bulkPutLocalRecords(LOCAL_STORE_NAMES.characters, newCharacters),
            bulkPutLocalRecords(LOCAL_STORE_NAMES.ideas, newIdeas),
            bulkPutLocalRecords(LOCAL_STORE_NAMES.locations, newLocations),
            bulkPutLocalRecords(LOCAL_STORE_NAMES.objects, newObjects),
            bulkPutLocalRecords(LOCAL_STORE_NAMES.comments, newComments),
            bulkPutLocalRecords(LOCAL_STORE_NAMES.projectAssets, newAssets),
            bulkPutLocalRecords(LOCAL_STORE_NAMES.sceneAssets, newSceneAssets),
            bulkPutLocalRecords(LOCAL_STORE_NAMES.entityAssets, newEntityAssets),
        ])

        return { ok: true, projectId: newProjectId }
    } catch (err) {
        console.error('[importLocalBackup] Failed:', err)
        return {
            ok: false,
            reason: err instanceof Error ? err.message : 'An unexpected error occurred during import.',
        }
    }
}

/**
 * Overwrites an existing project with a parsed `.storyline` backup.
 * 
 * - Deletes all existing records for the target project.
 * - Leaves the project's ID, `is_local`, and `storage_mode` unchanged.
 * - Remaps all backup children IDs to prevent dangling references or collisions.
 * 
 * @returns ok: true if restore is successful.
 */
export async function restoreLocalBackup(
    backup: StorylineBackup,
    targetProjectId: string,
    importingUserId: string,
    options: RestoreLocalBackupOptions = {}
): Promise<ImportResult> {
    try {
        // ── 1. Purge all existing records for this project ID ─────────────
        await Promise.all([
            deleteLocalRecordsByProjectId(LOCAL_STORE_NAMES.structureNodes, targetProjectId),
            deleteLocalRecordsByProjectId(LOCAL_STORE_NAMES.scenes, targetProjectId),
            deleteLocalRecordsByProjectId(LOCAL_STORE_NAMES.characters, targetProjectId),
            deleteLocalRecordsByProjectId(LOCAL_STORE_NAMES.ideas, targetProjectId),
            deleteLocalRecordsByProjectId(LOCAL_STORE_NAMES.locations, targetProjectId),
            deleteLocalRecordsByProjectId(LOCAL_STORE_NAMES.objects, targetProjectId),
            deleteLocalRecordsByProjectId(LOCAL_STORE_NAMES.comments, targetProjectId),
            deleteLocalRecordsByProjectId(LOCAL_STORE_NAMES.projectAssets, targetProjectId),
            deleteLocalRecordsByProjectId(LOCAL_STORE_NAMES.sceneAssets, targetProjectId),
            deleteLocalRecordsByProjectId(LOCAL_STORE_NAMES.entityAssets, targetProjectId),
        ])

        // ── 2. Build ID remap table for children ──────────────────────────
        const idMap = new Map<string, string>()

        function remap(oldId: string | null | undefined, prefix: string): string {
            if (!oldId) return newLocalId(prefix)
            if (idMap.has(oldId)) return idMap.get(oldId)!
            const newId = newLocalId(prefix)
            idMap.set(oldId, newId)
            return newId
        }

        // We do NOT remap the project ID. It remains `targetProjectId`.

        // Pre-assign IDs for all entities
        for (const node of backup.structure_nodes) remap(node.id, 'node')
        for (const scene of backup.scenes) remap(scene.id, 'scene')
        for (const c of backup.characters) remap(c.id, 'character')
        for (const i of backup.ideas) remap(i.id, 'idea')
        for (const l of backup.locations) remap(l.id, 'location')
        for (const o of backup.objects) remap(o.id, 'object')
        for (const comment of (backup.comments ?? [])) remap(comment.id, 'comment')
        for (const asset of (backup.project_assets ?? [])) remap(asset.id, 'asset')
        for (const sa of (backup.scene_assets ?? [])) remap(sa.id, 'scene_asset')
        for (const ea of (backup.entity_assets ?? [])) remap(ea.id, 'entity_asset')

        // ── 3. Remap project (Overwriting) ────────────────────────────────
        const timestamp = new Date().toISOString()
        const newProject = {
            ...backup.project,
            id: targetProjectId, // Retain target ID
            user_id: importingUserId, // Ensure the importing user owns it now
            title: options.title ?? backup.project.title,
            created_at: timestamp,
            updated_at: timestamp,
            last_accessed_at: timestamp,
            order_index: Date.now(),
            is_local: true as const,
            storage_mode: 'local-only' as const,
        }

        // ── 4. Remap structure nodes ──────────────────────────────────────
        const newNodes: StructureNodeRow[] = backup.structure_nodes.map((node) => ({
            ...node,
            id: idMap.get(node.id)!,
            project_id: targetProjectId,
            parent_id: node.parent_id ? (idMap.get(node.parent_id) ?? node.parent_id) : null,
        }))

        // ── 5. Remap scenes ───────────────────────────────────────────────
        const newScenes: SceneRow[] = backup.scenes.map((scene) => ({
            ...scene,
            id: idMap.get(scene.id)!,
            project_id: targetProjectId,
            node_id: idMap.get(scene.node_id) ?? scene.node_id,
        }))

        // ── 6. Remap characters ───────────────────────────────────────────
        const newCharacters: CharacterRow[] = backup.characters.map((c) => ({
            ...c,
            id: idMap.get(c.id)!,
            project_id: targetProjectId,
        }))

        // ── 7. Remap ideas ────────────────────────────────────────────────
        const newIdeas: IdeaRow[] = backup.ideas.map((i) => ({
            ...i,
            id: idMap.get(i.id)!,
            project_id: targetProjectId,
        }))

        // ── 8. Remap locations ────────────────────────────────────────────
        const newLocations: LocationRow[] = backup.locations.map((l) => ({
            ...l,
            id: idMap.get(l.id)!,
            project_id: targetProjectId,
        }))

        // ── 9. Remap objects ──────────────────────────────────────────────
        const newObjects: ObjectRow[] = backup.objects.map((o) => ({
            ...o,
            id: idMap.get(o.id)!,
            project_id: targetProjectId,
        }))

        // ── 10. Remap comments ────────────────────────────────────────────
        const newComments = (backup.comments ?? []).map((comment) => ({
            ...comment,
            id: idMap.get(comment.id)!,
            project_id: targetProjectId,
            node_id: comment.node_id ? (idMap.get(comment.node_id) ?? comment.node_id) : null,
            parent_id: comment.parent_id ? (idMap.get(comment.parent_id) ?? comment.parent_id) : null,
            author_id: importingUserId,
        }))

        // ── 11. Remap assets ──────────────────────────────────────────────
        const newAssets: ProjectAssetRow[] = (backup.project_assets ?? []).map((asset) => ({
            ...asset,
            id: idMap.get(asset.id)!,
            project_id: targetProjectId,
        }))

        // ── 12. Remap scene_assets ────────────────────────────────────────
        const newSceneAssets: SceneAssetRow[] = (backup.scene_assets ?? []).map((sa) => ({
            ...sa,
            id: idMap.get(sa.id)!,
            project_id: targetProjectId,
            scene_id: idMap.get(sa.scene_id) ?? sa.scene_id,
            asset_id: idMap.get(sa.asset_id) ?? sa.asset_id,
        }))

        // ── 13. Remap entity_assets ───────────────────────────────────────
        const newEntityAssets: EntityAssetRow[] = (backup.entity_assets ?? []).map((ea) => ({
            ...ea,
            id: idMap.get(ea.id)!,
            project_id: targetProjectId,
            entity_id: idMap.get(ea.entity_id) ?? ea.entity_id,
            asset_id: idMap.get(ea.asset_id) ?? ea.asset_id,
        }))

        // ── 14. Write everything via persistence layer ────────────────────
        await putLocalRecord(LOCAL_STORE_NAMES.projects, newProject)

        await Promise.all([
            bulkPutLocalRecords(LOCAL_STORE_NAMES.structureNodes, newNodes),
            bulkPutLocalRecords(LOCAL_STORE_NAMES.scenes, newScenes),
            bulkPutLocalRecords(LOCAL_STORE_NAMES.characters, newCharacters),
            bulkPutLocalRecords(LOCAL_STORE_NAMES.ideas, newIdeas),
            bulkPutLocalRecords(LOCAL_STORE_NAMES.locations, newLocations),
            bulkPutLocalRecords(LOCAL_STORE_NAMES.objects, newObjects),
            bulkPutLocalRecords(LOCAL_STORE_NAMES.comments, newComments),
            bulkPutLocalRecords(LOCAL_STORE_NAMES.projectAssets, newAssets),
            bulkPutLocalRecords(LOCAL_STORE_NAMES.sceneAssets, newSceneAssets),
            bulkPutLocalRecords(LOCAL_STORE_NAMES.entityAssets, newEntityAssets),
        ])

        return { ok: true, projectId: targetProjectId }
    } catch (err) {
        console.error('[restoreLocalBackup] Failed:', err)
        return {
            ok: false,
            reason: err instanceof Error ? err.message : 'An unexpected error occurred during restoration.',
        }
    }
}
