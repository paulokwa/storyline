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
import {
    parseBackupFile,
    importLocalBackup,
    restoreLocalBackup,
    getLibraryImportOptions,
    type LibraryImportOptions,
} from '@/lib/backup/import-local-backup'
import { BACKUP_FILE_EXTENSION, type StorylineBackup } from '@/lib/backup/backup-format'
import { getProjectTypeLabel } from '@/lib/constants'
import { cn } from '@/lib/utils'
import LocalTransferGuidance from '@/components/project/local/LocalTransferGuidance'

type PendingLibraryImport = {
    backup: StorylineBackup
    options: LibraryImportOptions
}

export default function ImportBackupButton({
    currentUserId,
    className,
    showTransferGuidance = true,
}: {
    currentUserId: string
    className?: string
    showTransferGuidance?: boolean
}) {
    const router = useRouter()
    const inputRef = useRef<HTMLInputElement>(null)
    const [status, setStatus] = useState<'idle' | 'reading' | 'importing' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [pendingImport, setPendingImport] = useState<PendingLibraryImport | null>(null)
    const [selectedUpdateProjectId, setSelectedUpdateProjectId] = useState<string>('')

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

        const importOptions = await getLibraryImportOptions(parsed.data)
        if (importOptions) {
            setPendingImport({ backup: parsed.data, options: importOptions })
            setSelectedUpdateProjectId(importOptions.suggestedProject?.id ?? importOptions.sameTypeProjects[0]?.id ?? '')
            setStatus('idle')
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

    async function handleUpdateExisting() {
        if (!pendingImport || !selectedUpdateProjectId) return

        const selectedProject = pendingImport.options.sameTypeProjects.find(
            (project) => project.id === selectedUpdateProjectId
        )
        if (!selectedProject) return

        setStatus('importing')
        setErrorMessage(null)

        const result = await restoreLocalBackup(
            pendingImport.backup,
            selectedProject.id,
            currentUserId,
            { title: selectedProject.title }
        )

        if (!result.ok) {
            setStatus('error')
            setErrorMessage(result.reason)
            return
        }

        setPendingImport(null)
        setSelectedUpdateProjectId('')
        setStatus('idle')
        router.push(`/project/${result.projectId}/story`)
    }

    async function handleCreateCopy() {
        if (!pendingImport) return

        setStatus('importing')
        setErrorMessage(null)

        const result = await importLocalBackup(
            pendingImport.backup,
            currentUserId,
            { title: pendingImport.options.nextCopyTitle }
        )

        if (!result.ok) {
            setStatus('error')
            setErrorMessage(result.reason)
            return
        }

        setPendingImport(null)
        setSelectedUpdateProjectId('')
        setStatus('idle')
        router.push(`/project/${result.projectId}/story`)
    }

    function handleCancelImportChoice() {
        if (isLoading) return
        setPendingImport(null)
        setSelectedUpdateProjectId('')
    }

    const isLoading = status === 'reading' || status === 'importing'
    const selectedProject = pendingImport?.options.sameTypeProjects.find(
        (project) => project.id === selectedUpdateProjectId
    ) ?? null
    const importedProjectTypeLabel = pendingImport
        ? getProjectTypeLabel(pendingImport.backup.project.type)
        : 'Project'

    return (
        <div className="flex w-full flex-col items-stretch gap-3 md:items-end">
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

            {showTransferGuidance && (
                <LocalTransferGuidance
                    compact
                    className="w-full md:max-w-xl"
                    cloudSyncHref="/settings"
                />
            )}

            {pendingImport && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="library-import-conflict-title"
                >
                    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
                        <h2
                            id="library-import-conflict-title"
                            className="text-lg font-semibold text-slate-900"
                        >
                            Import {importedProjectTypeLabel} backup
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                            This backup is for <span className="font-semibold text-slate-900">{pendingImport.options.backupBaseTitle}</span>. You can update an existing {importedProjectTypeLabel.toLowerCase()} or create a separate imported copy.
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            Updating will replace the selected project&apos;s current local content with this backup. This cannot be undone unless you have another backup.
                        </p>
                        <div className="mt-6 flex flex-col gap-3">
                            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                                Update existing {importedProjectTypeLabel.toLowerCase()}
                                <select
                                    value={selectedUpdateProjectId}
                                    onChange={(event) => setSelectedUpdateProjectId(event.target.value)}
                                    disabled={isLoading}
                                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {pendingImport.options.sameTypeProjects.map((project) => (
                                        <option key={project.id} value={project.id}>
                                            {project.title || 'Untitled'}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <button
                                type="button"
                                onClick={handleUpdateExisting}
                                disabled={isLoading || !selectedProject}
                                className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Update selected project
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateCopy}
                                disabled={isLoading}
                                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Create new copy as {pendingImport.options.nextCopyTitle}
                            </button>
                            <button
                                type="button"
                                onClick={handleCancelImportChoice}
                                disabled={isLoading}
                                className="rounded-full px-5 py-2 text-sm font-semibold text-slate-500 transition hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
