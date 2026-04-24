'use client'

/**
 * Phase 3 – Backup System: Reminder Logic
 *
 * Tracks backup state per project in localStorage and determines when to
 * show a non-blocking reminder to the user.
 *
 * Rules:
 * - localStorage ONLY — no IndexedDB, no Supabase.
 * - Two independent triggers: time-based and word-count-based.
 * - Snooze persists until the given ISO timestamp expires.
 * - All functions are safe to call server-side (they no-op if window missing).
 */

import type { BackupReminderMeta } from '@/lib/backup/backup-format'

// ── Constants ────────────────────────────────────────────────────────────────

/** Number of days without a backup before showing a reminder. */
export const BACKUP_REMINDER_DAYS = 7

/** Number of words written since last backup before showing a reminder. */
export const BACKUP_REMINDER_WORD_DELTA = 500

/** Number of hours to snooze a dismissed reminder. */
export const BACKUP_SNOOZE_HOURS = 24

// ── Storage key ──────────────────────────────────────────────────────────────

function backupMetaKey(projectId: string): string {
    return `storyline-backup-meta:${projectId}`
}

// ── Read / write meta ────────────────────────────────────────────────────────

function readMeta(projectId: string): BackupReminderMeta {
    if (typeof window === 'undefined') {
        return { last_backup_at: null, words_at_last_backup: 0, snoozed_until: null }
    }
    try {
        const raw = localStorage.getItem(backupMetaKey(projectId))
        if (!raw) return { last_backup_at: null, words_at_last_backup: 0, snoozed_until: null }
        return JSON.parse(raw) as BackupReminderMeta
    } catch {
        return { last_backup_at: null, words_at_last_backup: 0, snoozed_until: null }
    }
}

function writeMeta(projectId: string, meta: BackupReminderMeta): void {
    if (typeof window === 'undefined') return
    try {
        localStorage.setItem(backupMetaKey(projectId), JSON.stringify(meta))
    } catch {
        // Silently ignore quota errors — reminder is non-critical.
    }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Called after a successful backup export.
 * Records the backup timestamp and current word count.
 */
export function recordBackupComplete(projectId: string, wordCount: number): void {
    writeMeta(projectId, {
        last_backup_at: new Date().toISOString(),
        words_at_last_backup: wordCount,
        snoozed_until: null,
    })
}

/**
 * Snoozes the backup reminder for `BACKUP_SNOOZE_HOURS`.
 */
export function snoozeBackupReminder(projectId: string): void {
    const meta = readMeta(projectId)
    const until = new Date(Date.now() + BACKUP_SNOOZE_HOURS * 60 * 60 * 1000).toISOString()
    writeMeta(projectId, { ...meta, snoozed_until: until })
}

/**
 * Clears all backup reminder state for a project.
 * Useful when a project is deleted.
 */
export function clearBackupMeta(projectId: string): void {
    if (typeof window === 'undefined') return
    try {
        localStorage.removeItem(backupMetaKey(projectId))
    } catch {
        // ignore
    }
}

export type BackupReminderCheckResult =
    | { shouldRemind: false }
    | { shouldRemind: true; reason: 'time' | 'word_count' | 'never_backed_up' }

/**
 * Determines whether a backup reminder should be shown for a project.
 *
 * @param projectId  The local project ID.
 * @param currentWordCount  Approximate word count of the current project content.
 */
export function checkBackupReminder(
    projectId: string,
    currentWordCount: number
): BackupReminderCheckResult {
    if (typeof window === 'undefined') return { shouldRemind: false }

    const meta = readMeta(projectId)

    // Check if we are within a snooze window
    if (meta.snoozed_until) {
        if (new Date(meta.snoozed_until) > new Date()) {
            return { shouldRemind: false }
        }
    }

    // Never backed up — remind if there is meaningful content
    if (!meta.last_backup_at) {
        if (currentWordCount >= BACKUP_REMINDER_WORD_DELTA) {
            return { shouldRemind: true, reason: 'never_backed_up' }
        }
        return { shouldRemind: false }
    }

    // Trigger A: time-based
    const daysSinceBackup =
        (Date.now() - new Date(meta.last_backup_at).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceBackup >= BACKUP_REMINDER_DAYS) {
        return { shouldRemind: true, reason: 'time' }
    }

    // Trigger B: word-count-based
    const wordDelta = currentWordCount - meta.words_at_last_backup
    if (wordDelta >= BACKUP_REMINDER_WORD_DELTA) {
        return { shouldRemind: true, reason: 'word_count' }
    }

    return { shouldRemind: false }
}

/**
 * Human-readable message for each reminder reason.
 */
export function getBackupReminderMessage(reason: 'time' | 'word_count' | 'never_backed_up'): string {
    switch (reason) {
        case 'never_backed_up':
            return "You haven't backed up this project yet."
        case 'time':
            return `You haven't backed up this project in over ${BACKUP_REMINDER_DAYS} days.`
        case 'word_count':
            return `You've written a lot since your last backup.`
        default:
            return "Your project is due for a backup."
    }
}

/**
 * Fast approximation of word count from an array of TipTap scene content objects.
 * Uses JSON stringification — not perfectly accurate but fast and dependency-free.
 */
export function estimateProjectWordCount(sceneContents: unknown[]): number {
    let total = 0
    for (const content of sceneContents) {
        if (!content) continue
        try {
            // Extract just text nodes to avoid counting JSON keys as words
            const text = extractTextFromTipTap(content)
            total += text.trim().split(/\s+/).filter(Boolean).length
        } catch {
            // ignore
        }
    }
    return total
}

function extractTextFromTipTap(node: unknown): string {
    if (!node || typeof node !== 'object') return ''
    const n = node as Record<string, unknown>
    if (n['type'] === 'text' && typeof n['text'] === 'string') return n['text']
    const parts: string[] = []
    if (Array.isArray(n['content'])) {
        for (const child of n['content']) {
            parts.push(extractTextFromTipTap(child))
        }
    }
    return parts.join(' ')
}
