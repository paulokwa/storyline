'use client'

/**
 * Phase 3 – Backup System: Import Backup Button
 *
 * A standalone component that renders a file picker trigger for importing
 * a `.storyline` backup. On success, navigates to the newly created project.
 *
 * Placement: Library header action area (alongside "Start New Project").
 */

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload } from 'lucide-react'
import { parseBackupFile, importLocalBackup } from '@/lib/backup/import-local-backup'
import { BACKUP_FILE_EXTENSION } from '@/lib/backup/backup-format'
import { cn } from '@/lib/utils'

export default function ImportBackupButton({
    currentUserId,
    className,
}: {
    currentUserId: string
    className?: string
}) {
    const router = useRouter()
    const inputRef = useRef<HTMLInputElement>(null)
    const [status, setStatus] = useState<'idle' | 'reading' | 'importing' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    function handleClick() {
        setErrorMessage(null)
        inputRef.current?.click()
    }

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        // Reset input so the same file can be re-selected
        e.target.value = ''

        setStatus('reading')
        setErrorMessage(null)

        let raw: string
        try {
            raw = await file.text()
        } catch {
            setStatus('error')
            setErrorMessage('Could not read the selected file.')
            return
        }

        const parsed = parseBackupFile(raw)
        if ('error' in parsed) {
            setStatus('error')
            setErrorMessage(parsed.error)
            return
        }

        setStatus('importing')
        const result = await importLocalBackup(parsed.data, currentUserId)

        if (!result.ok) {
            setStatus('error')
            setErrorMessage(result.reason)
            return
        }

        // Navigate to the newly imported project
        setStatus('idle')
        router.push(`/project/${result.projectId}/story`)
    }

    const isLoading = status === 'reading' || status === 'importing'

    return (
        <div className="flex flex-col items-end gap-2">
            <button
                onClick={handleClick}
                disabled={isLoading}
                id="library-import-backup-btn"
                className={cn(
                    'h-14 w-full md:w-auto flex items-center justify-center gap-2 sm:gap-3 px-5 sm:px-8',
                    'rounded-full text-sm sm:text-base font-semibold transition-all',
                    'border border-slate-200 bg-white text-slate-600',
                    'hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800',
                    'disabled:opacity-60 disabled:cursor-not-allowed',
                    className
                )}
                aria-label="Import a .storyline backup file"
            >
                <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="sm:hidden">Import</span>
                <span className="hidden sm:inline">
                    {isLoading
                        ? status === 'reading'
                            ? 'Reading file…'
                            : 'Importing…'
                        : 'Import Backup'}
                </span>
            </button>

            {/* Hidden file input */}
            <input
                ref={inputRef}
                type="file"
                accept={`${BACKUP_FILE_EXTENSION},application/json`}
                className="sr-only"
                onChange={handleFileChange}
                aria-hidden="true"
                tabIndex={-1}
            />

            {status === 'error' && errorMessage && (
                <p
                    className="text-xs text-red-500 font-medium max-w-xs text-right animate-in fade-in duration-200"
                    role="alert"
                >
                    {errorMessage}
                </p>
            )}
        </div>
    )
}
