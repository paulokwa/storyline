/**
 * Phase 3 – Backup System
 *
 * Canonical type definitions for the `.storyline` backup bundle.
 * The format is a single JSON file that is self-contained and portable.
 *
 * Rules:
 * - `version` allows future migrations without breaking old imports.
 * - Assets are embedded as base64 data URLs (already the format used locally).
 * - This file MUST NOT import from Supabase or call any external services.
 */

import type { Database } from '@/lib/supabase/types'
import type { LocalCommentRecord } from '@/lib/persistence/local-comments'

type ProjectRow = Database['public']['Tables']['projects']['Row']
type StructureNodeRow = Database['public']['Tables']['structure_nodes']['Row']
type SceneRow = Database['public']['Tables']['scenes']['Row']
type CharacterRow = Database['public']['Tables']['characters']['Row']
type IdeaRow = Database['public']['Tables']['ideas']['Row']
type LocationRow = Database['public']['Tables']['locations']['Row']
type ObjectRow = Database['public']['Tables']['objects']['Row']
type ProjectAssetRow = Database['public']['Tables']['project_assets']['Row']
type SceneAssetRow = Database['public']['Tables']['scene_assets']['Row']
type EntityAssetRow = Database['public']['Tables']['entity_assets']['Row']

export const BACKUP_FORMAT_VERSION = 1 as const
export const BACKUP_FILE_EXTENSION = '.storyline'
export const BACKUP_MIME_TYPE = 'application/json'

/**
 * The canonical shape of a `.storyline` backup file.
 *
 * All records are owned by a single local-only project.
 * All asset `storage_path` values are base64 data URLs (already the local format).
 * Soft-deleted comments are excluded — the backup reflects what the user sees.
 */
export type StorylineBackup = {
    /** Format version — increment when breaking changes are made. */
    version: typeof BACKUP_FORMAT_VERSION

    /** ISO timestamp of when this backup was created. */
    exported_at: string

    /** App version string for debugging compatibility. */
    app_version: string

    /** Project metadata row (is_local + storage_mode preserved). */
    project: ProjectRow & { is_local: true; storage_mode: 'local-only' }

    /** All active (non-deleted) structure nodes. */
    structure_nodes: StructureNodeRow[]

    /** All active (non-deleted) scenes with their TipTap JSON content. */
    scenes: SceneRow[]

    /** All active characters. */
    characters: CharacterRow[]

    /** All active ideas. */
    ideas: IdeaRow[]

    /** All active locations. */
    locations: LocationRow[]

    /** All active objects. */
    objects: ObjectRow[]

    /**
     * Active (non-deleted) self-comments only.
     * Cloud collaboration comments are never present in local backups.
     */
    comments: LocalCommentRecord[]

    /**
     * All project assets with embedded base64 data URLs.
     * `storage_path` = `data:<mime>;base64,...` for local assets.
     */
    project_assets: ProjectAssetRow[]

    /** Links between scenes and assets. */
    scene_assets: SceneAssetRow[]

    /** Links between entities (characters, locations, etc.) and assets. */
    entity_assets: EntityAssetRow[]
}

/**
 * Metadata stored in localStorage to drive backup reminders.
 * Keyed by `storyline-backup-meta:<projectId>`.
 */
export type BackupReminderMeta = {
    /** ISO timestamp of the last successful backup. */
    last_backup_at: string | null

    /** Approximate word count at time of last backup. */
    words_at_last_backup: number

    /** ISO timestamp until which reminders are snoozed. null = not snoozed. */
    snoozed_until: string | null
}
