'use client'

/**
 * Phase 3 – Backup System: Backup Reminder Banner
 *
 * A non-blocking dismissible banner shown inside a local-only project.
 * Checks reminder triggers on mount and after every write session.
 *
 * Placement: rendered inside LocalProjectShell, above project content.
 */

import { useEffect, useState, useCallback } from 'react'
import { Download, X } from 'lucide-react'
import { toast } from 'sonner'
import {
    checkBackupReminder,
    snoozeBackupReminder,
    recordBackupComplete,
    estimateProjectWordCount,
    getBackupReminderMessage,
    type BackupReminderCheckResult,
} from '@/lib/backup/backup-reminder'
import { exportLocalBackup } from '@/lib/backup/export-local-backup'
import { getLocalRecordsByProjectId, LOCAL_STORE_NAMES } from '@/lib/persistence/local-db'
import type { Database } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

type SceneRow = Database['public']['Tables']['scenes']['Row']

export default function BackupBanner({ projectId }: { projectId: string }) {
    const [reminder, setReminder] = useState<BackupReminderCheckResult>({ shouldRemind: false })
    const [isExporting, setIsExporting] = useState(false)
    const [justExported, setJustExported] = useState(false)

    const evaluate = useCallback(async () => {
        try {
            const scenes = await getLocalRecordsByProjectId<SceneRow>(LOCAL_STORE_NAMES.scenes, projectId)
            const activeScenes = scenes.filter((s) => s.deleted_at == null)
            const wordCount = estimateProjectWordCount(activeScenes.map((s) => s.content))
            const result = checkBackupReminder(projectId, wordCount)
            setReminder(result)
        } catch {
            // Non-critical — silently fail
        }
    }, [projectId])

    useEffect(() => {
        void evaluate()

        // Poll every 30 seconds to catch word count changes during active writing
        const timer = setInterval(() => {
            void evaluate()
        }, 30000)
        return () => clearInterval(timer)
    }, [evaluate])

    if (!reminder.shouldRemind || justExported) return null

    async function handleExport() {
        setIsExporting(true)
        try {
            const { wordCount, sizeBytes } = await exportLocalBackup(projectId)
            recordBackupComplete(projectId, wordCount)
            if (sizeBytes > 20_000_000) {
                toast.warning(`Backup is ${Math.round(sizeBytes / 1_000_000)} MB — your project contains embedded images which increase file size. This is normal.`)
            }
            setJustExported(true)
            // Reset the "just exported" flash after 3s so banner disappears cleanly
            setTimeout(() => setReminder({ shouldRemind: false }), 3000)
        } catch (err) {
            console.error('[BackupBanner] Export failed:', err)
        } finally {
            setIsExporting(false)
        }
    }

    function handleSnooze() {
        snoozeBackupReminder(projectId)
        setReminder({ shouldRemind: false })
    }

    const message = getBackupReminderMessage(reminder.reason as 'time' | 'word_count' | 'never_backed_up')

    return (
        <div
            className={cn(
                'flex items-center gap-3 px-5 py-2.5 text-sm font-medium',
                'bg-amber-50 border-b border-amber-100 text-amber-800',
                'animate-in slide-in-from-top-1 duration-300'
            )}
            role="status"
            aria-live="polite"
        >
            <span className="flex-1 text-xs">{message}</span>

            <button
                onClick={handleExport}
                disabled={isExporting}
                className={cn(
                    'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold',
                    'bg-amber-600 text-white hover:bg-amber-700 transition-colors',
                    'disabled:opacity-60 disabled:cursor-not-allowed'
                )}
                id="backup-banner-export-btn"
            >
                <Download className="w-3 h-3" />
                {isExporting ? 'Backing up…' : 'Back up now'}
            </button>

            <button
                onClick={handleSnooze}
                className="p-1 text-amber-400 hover:text-amber-600 transition-colors rounded-full hover:bg-amber-100"
                aria-label="Dismiss backup reminder"
                id="backup-banner-dismiss-btn"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    )
}
