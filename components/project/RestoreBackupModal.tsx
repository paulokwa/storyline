'use client'

import { useState, useRef } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ArchiveRestore, AlertTriangle, FileUp, Download } from 'lucide-react'
import { parseBackupFile, restoreLocalBackup } from '@/lib/backup/import-local-backup'
import { BACKUP_FILE_EXTENSION, StorylineBackup } from '@/lib/backup/backup-format'
import { cn } from '@/lib/utils'

interface RestoreBackupModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    projectId: string
    projectTitle: string
    currentUserId: string
    onRestoreComplete: () => void
    onOpenExport: () => void
}

export default function RestoreBackupModal({
    open,
    onOpenChange,
    projectId,
    projectTitle,
    currentUserId,
    onRestoreComplete,
    onOpenExport
}: RestoreBackupModalProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [status, setStatus] = useState<'idle' | 'reading' | 'confirming' | 'restoring' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [parsedBackup, setParsedBackup] = useState<StorylineBackup | null>(null)

    function resetState() {
        setStatus('idle')
        setErrorMessage(null)
        setParsedBackup(null)
    }

    function handleOpenChange(newOpen: boolean) {
        if (!newOpen) {
            resetState()
        }
        onOpenChange(newOpen)
    }

    function handleSelectClick() {
        setErrorMessage(null)
        inputRef.current?.click()
    }

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

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

        if (parsed.data.project.id === projectId) {
            // Technically possible but rare for backup to have same ID natively
            // Actually it's very common if the user exports this project then restores it.
        }

        setParsedBackup(parsed.data)
        setStatus('confirming')
    }

    async function handleRestore() {
        if (!parsedBackup) return

        setStatus('restoring')
        const result = await restoreLocalBackup(parsedBackup, projectId, currentUserId)

        if (!result.ok) {
            setStatus('error')
            setErrorMessage(result.reason)
            return
        }

        setStatus('idle')
        onRestoreComplete()
        handleOpenChange(false)
    }

    const isLoading = status === 'reading' || status === 'restoring'

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[500px] border-[#f0eee9] bg-white p-0 overflow-hidden rounded-3xl shadow-2xl">
                <DialogHeader className="p-6 pb-4 border-b border-[#f0eee9] bg-slate-50/50">
                    <DialogTitle className="text-xl font-serif text-[#31332f] flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                            <ArchiveRestore className="w-5 h-5 text-orange-600" />
                        </div>
                        Restore Project
                    </DialogTitle>
                    <DialogDescription className="text-sm text-slate-500 font-sans mt-2">
                        Overwrite this project with a <strong>{BACKUP_FILE_EXTENSION}</strong> backup file.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    {/* State: Initial or Error */}
                    {(status === 'idle' || status === 'error' || status === 'reading') && (
                        <div className="flex flex-col items-center justify-center py-6">
                            <input
                                ref={inputRef}
                                type="file"
                                accept={`${BACKUP_FILE_EXTENSION},application/json`}
                                className="sr-only"
                                onChange={handleFileChange}
                                disabled={isLoading}
                            />
                            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                                <FileUp className="w-8 h-8 text-slate-400" />
                            </div>
                            <Button
                                onClick={handleSelectClick}
                                disabled={isLoading}
                                className="rounded-xl px-8"
                            >
                                {status === 'reading' ? 'Reading file...' : 'Select Backup File'}
                            </Button>

                            {status === 'error' && errorMessage && (
                                <p className="mt-4 text-xs text-red-500 font-medium text-center px-4">
                                    {errorMessage}
                                </p>
                            )}
                        </div>
                    )}

                    {/* State: Confirming */}
                    {(status === 'confirming' || status === 'restoring') && parsedBackup && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                                <div className="flex gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                    <div className="space-y-1 text-sm text-red-900">
                                        <p className="font-semibold">Destructive Action</p>
                                        <p>
                                            Restoring this backup will <strong>permanently overwrite</strong> all current
                                            content, characters, scenes, and settings in this project.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="text-sm font-medium text-slate-700">Backup Details:</div>
                                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-sm text-slate-600">
                                    <p><span className="font-medium">Title:</span> {parsedBackup.project.title}</p>
                                    <p><span className="font-medium">Type:</span> {parsedBackup.project.type}</p>
                                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 mt-2 border-t border-slate-200">
                                        <p>{parsedBackup.scenes.length} Scenes</p>
                                        <p>{parsedBackup.characters.length} Characters</p>
                                        <p>{parsedBackup.locations.length} Locations</p>
                                        <p>{parsedBackup.ideas.length} Ideas</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 pt-2">
                                <Button 
                                    variant="outline" 
                                    className="rounded-xl w-full flex gap-2 border-slate-300 text-slate-700"
                                    onClick={onOpenExport}
                                    disabled={isLoading}
                                >
                                    <Download className="w-4 h-4" />
                                    Export current project first
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 pt-0 flex gap-2 justify-end sm:justify-between items-center sm:flex-row-reverse border-t border-[#f0eee9] bg-slate-50/50 mt-auto">
                    {(status === 'confirming' || status === 'restoring') ? (
                        <div className="flex gap-3 w-full sm:w-auto">
                            <Button
                                variant="ghost"
                                onClick={() => resetState()}
                                disabled={isLoading}
                                className="rounded-xl flex-1 sm:flex-none"
                            >
                                Change File
                            </Button>
                            <Button
                                onClick={handleRestore}
                                disabled={isLoading}
                                className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-6 flex-1 sm:flex-none shadow-sm shadow-red-900/10"
                            >
                                {status === 'restoring' ? 'Overwriting...' : 'Overwrite Project'}
                            </Button>
                        </div>
                    ) : (
                        <Button variant="ghost" onClick={() => handleOpenChange(false)} className="rounded-xl ml-auto">
                            Cancel
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
