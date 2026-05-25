'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { isLocalProjectId } from '@/lib/persistence/project-mode'
import { updateLocalProject, destroyLocalProject } from '@/lib/persistence/local-projects'
import { migrateLocalProjectToCloud } from '@/lib/persistence/local-to-cloud'
import { getBackupMeta } from '@/lib/backup/backup-reminder'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { SanctuarySelect } from '@/components/ui/sanctuary-select'
import { Trash2, AlertTriangle, Save, Globe, Info, Tag, Hash, Copyright, Book, Type, MessageSquare, LogOut, Users, ArrowUpRight, ChevronDown, Copy, Database as DatabaseIcon, HardDrive, type LucideIcon } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'
import type { ExportMetadata } from '@/lib/export/buildExportPayload'
import type { BackupReminderMeta } from '@/lib/backup/backup-format'
import { cn } from '@/lib/utils'
import { PROJECT_TYPE_LABELS, getProjectTypeLabel } from '@/lib/constants'
import { useTheme } from '@/components/providers/ThemeProvider'
import { getUserSafely } from '@/lib/supabase/client-auth'
import LocalTransferGuidance from '@/components/project/local/LocalTransferGuidance'

type Project = Database['public']['Tables']['projects']['Row']
type LocalProjectDetails = Project & {
    migrated_to_cloud_project_id?: string | null
}

interface ProjectSettingsModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    project: Project
    role?: 'owner' | 'editor' | 'viewer'
    onOpenShare?: () => void
    onOpenRestore?: () => void
}

function formatProjectDate(value: string | null | undefined) {
    if (!value) return 'Not available'

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Not available'

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date)
}

function ToggleStatePill({ checked, isLocalOnly }: { checked: boolean, isLocalOnly?: boolean }) {
    if (isLocalOnly) {
        return (
            <span className="inline-flex min-w-[5.75rem] items-center justify-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] border-indigo-100 bg-indigo-50/50 text-indigo-700">
                Requires Cloud
            </span>
        )
    }

    return (
        <span
            className={cn(
                "inline-flex min-w-[5.5rem] items-center justify-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em]",
                checked
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-100 text-slate-500"
            )}
        >
            {checked ? 'Enabled' : 'Disabled'}
        </span>
    )
}

export default function ProjectSettingsModal({
    open,
    onOpenChange,
    project,
    role = 'owner',
    onOpenShare,
    onOpenRestore,
}: ProjectSettingsModalProps) {
    const { theme } = useTheme()
    const isMidnight = theme === 'midnight'
    const router = useRouter()
    const isLocalOnly = isLocalProjectId(project.id)
    const [loading, setLoading] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const canManageProject = role === 'owner'
    const localProject = project as LocalProjectDetails
    const isAlreadyMigrated = !!localProject.migrated_to_cloud_project_id
    const [advancedDetailsOpen, setAdvancedDetailsOpen] = useState(false)

    const [showMigrationConfirm, setShowMigrationConfirm] = useState(false)
    const [migrationProgress, setMigrationProgress] = useState<string | null>(null)
    const [pendingWritingMode, setPendingWritingMode] = useState<'simple' | 'screenplay' | null>(null)

    const handleLockedSettingClick = () => {
        if (!isLocalOnly) return
        toast.info("Cloud required", {
            description: "To share this project or invite collaborators, turn on cloud sync first using Enable Cloud & Collaboration above.",
            duration: 5000,
        })
    }

    const [activeTab, setActiveTab] = useState<'general' | 'metadata'>('general')
    const [title, setTitle] = useState(project.title ?? '')
    const [type, setType] = useState(project.type)
    const [premise, setPremise] = useState(project.premise || '')
    const [tone, setTone] = useState(project.tone || '')
    const [writingMode, setWritingMode] = useState(project.writing_mode || 'simple')
    const [shareOwnerFeedback, setShareOwnerFeedback] = useState(project.share_owner_feedback ?? false)
    const [allowViewerFeedback, setAllowViewerFeedback] = useState(project.allow_viewer_feedback ?? false)
    const [allowCollaboratorExports, setAllowCollaboratorExports] = useState(project.allow_collaborator_exports ?? false)
    const [metadata, setMetadata] = useState<ExportMetadata>((project.export_metadata as any) || {})
    const backupMeta: BackupReminderMeta | null = isLocalOnly ? getBackupMeta(project.id) : null

    const updateMetadata = (key: keyof ExportMetadata, value: string) => {
        setMetadata(prev => ({ ...prev, [key]: value }))
    }

    async function handleCopyProjectId() {
        try {
            await navigator.clipboard.writeText(project.id)
            toast.success('Project ID copied.')
        } catch {
            toast.error('Unable to copy project ID.')
        }
    }

    async function handleSave() {
        if (!canManageProject) return
        setLoading(true)

        if (isLocalProjectId(project.id)) {
            await updateLocalProject(project.id, {
                title: title.trim(),
                type: type,
                project_type: type, // sync both to match Supabase behavior
                premise: premise.trim() || null,
                tone: tone.trim() || null,
                writing_mode: writingMode,
                export_metadata: metadata as any,
            })
            setLoading(false)
            onOpenChange(false)
            router.refresh()
            return
        }

        const supabase = createClient()
        const { error } = await (supabase
            .from('projects') as any)
            .update({
                title: title.trim(),
                type: type,
                premise: premise.trim() || null,
                tone: tone.trim() || null,
                writing_mode: writingMode,
                share_owner_feedback: shareOwnerFeedback,
                allow_viewer_feedback: allowViewerFeedback,
                allow_collaborator_exports: allowCollaboratorExports,
                export_metadata: metadata as any,
            })
            .eq('id', project.id)

        setLoading(false)
        if (!error) {
            onOpenChange(false)
            router.refresh()
        }
    }

    async function handleMigration() {
        if (!isLocalOnly || !canManageProject || isAlreadyMigrated) return
        setLoading(true)
        setMigrationProgress('Initializing migration...')

        const supabase = createClient()

        try {
            const newProjectId = await migrateLocalProjectToCloud(project.id, (progress) => {
                setMigrationProgress(progress)
            })

            // Fire-and-forget bell notification — non-blocking, does not delay redirect
            void (async () => {
                try {
                    const { user } = await getUserSafely(supabase)
                    if (!user) return
                    await supabase.rpc('create_notification', {
                        p_user_id: user.id,
                        p_type: 'cloud_migration_completed',
                        p_title: `"${project.title}" is now on the cloud`,
                        p_summary: 'Your project is saved to the cloud and ready to access from any device.',
                        p_project_id: newProjectId,
                        p_link_href: `/project/${newProjectId}/story`,
                        p_event_key: `cloud-migration-completed:${project.id}:${newProjectId}:${user.id}`,
                        p_metadata: {
                            local_project_id: project.id,
                            cloud_project_id: newProjectId,
                        },
                    })
                } catch { /* notification failure is non-blocking */ }
            })()

            toast.success('Successfully migrated project to cloud!')
            setLoading(false)
            setMigrationProgress(null)
            setShowMigrationConfirm(false)

            // Redirect to the new cloud project
            onOpenChange(false)
            router.push(`/project/${newProjectId}/story`)
        } catch (error: any) {
            console.error('Migration failed:', error)
            toast.error(error.message || 'Failed to migrate project.')

            // Bell notification for non-trivial failures only
            const message: string = error?.message ?? ''
            const isUserError = message.includes('must be logged in') ||
                message.includes('already been migrated') ||
                message.includes('Local project not found')

            if (!isUserError) {
                try {
                    const { user } = await getUserSafely(supabase)
                    if (user) {
                        const stage = message.includes('upload asset') ? 'asset_upload'
                            : message.includes('Migration Atomicity') ? 'server_error'
                            : 'unknown'
                        await supabase.rpc('create_notification', {
                            p_user_id: user.id,
                            p_type: 'cloud_migration_failed',
                            p_title: `Cloud sync failed for "${project.title}"`,
                            p_summary: 'Your project could not be moved to the cloud. It is safe on this device — try again or contact support.',
                            p_link_href: '/library',
                            p_event_key: `cloud-migration-failed:${project.id}:${user.id}:${stage}`,
                            p_metadata: {
                                local_project_id: project.id,
                                failure_stage: stage,
                                error_message: message.substring(0, 500),
                            },
                        })
                    }
                } catch { /* notification failure is non-blocking */ }
            }

            setLoading(false)
            setMigrationProgress(null)
        }
    }

    async function handleDelete() {
        if (!canManageProject) return
        setLoading(true)

        if (isLocalProjectId(project.id)) {
            await destroyLocalProject(project.id)
            setLoading(false)
            router.push('/library')
            router.refresh()
            return
        }

        const supabase = createClient()
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', project.id)

        if (!error) {
            router.push('/library')
            router.refresh()
        }
        setLoading(false)
    }

    async function handleLeaveCollaboration() {
        if (canManageProject) return

        setLoading(true)
        const supabase = createClient()
        const { user } = await getUserSafely(supabase)
        const userId = user?.id

        if (!userId) {
            setLoading(false)
            return
        }

        const { error } = await supabase.rpc('remove_project_member', {
            p_id: project.id,
            p_user_id: userId,
        })

        if (!error) {
            onOpenChange(false)
            router.push('/library')
            router.refresh()
        }

        setLoading(false)
    }

    return (
        <>
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={cn(
                "project-settings-modal dialog-viewport-safe flex w-[calc(100%-1rem)] max-w-[850px] flex-col gap-0 p-0 overflow-hidden rounded-[2.5rem] shadow-2xl !opacity-100 backdrop-blur-none sm:w-full",
                isMidnight
                    ? "border border-slate-600/30 bg-[#10192b]"
                    : "border border-slate-200/50 bg-[#fbf9f5]"
            )}>
                {showMigrationConfirm ? (
                    <div className="py-6 space-y-6 px-6">
                        <div className="w-20 h-20 bg-indigo-500/10 rounded-[2rem] flex items-center justify-center mx-auto text-indigo-600">
                            <Globe className="w-10 h-10" />
                        </div>
                        <div className="text-center space-y-3">
                            <h2 className="text-2xl font-serif text-foreground">Enable Cloud Sync?</h2>
                            <div className="text-muted-foreground max-w-sm mx-auto text-sm space-y-2">
                                <p>Turn on cloud sync for this project if you want it on other devices or want to collaborate.</p>
                                <p className="font-medium text-foreground">Your local copy stays on this device as a backup. This does not publish your work or invite anyone automatically.</p>
                            </div>
                        </div>
                        
                        {migrationProgress && (
                            <div className="mt-4 p-4 bg-muted/50 rounded-xl flex items-center justify-center border border-border">
                                <p className="text-sm font-semibold text-indigo-600 animate-pulse">{migrationProgress}</p>
                            </div>
                        )}
                        
                        <div className="flex flex-col gap-3">
                            <Button
                                onClick={handleMigration}
                                disabled={loading}
                                className="h-14 rounded-full text-base font-semibold shadow-lg shadow-indigo-200/50 bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                {loading ? 'Turning on Cloud Sync...' : 'Turn On Cloud Sync'}
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setShowMigrationConfirm(false)}
                                disabled={loading}
                                className="h-12 rounded-full text-muted-foreground"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : !showDeleteConfirm ? (
                    <>
                        <DialogHeader className={cn(
                            "shrink-0 border-b px-5 pb-5 pt-10 sm:px-8 sm:pb-8 sm:pt-12",
                            isMidnight ? "bg-[#182239]/88 border-slate-700/60" : "bg-white/50 border-[#f0eee9]"
                        )}>
                            <DialogTitle className="text-2xl sm:text-3xl font-serif text-foreground">Project Settings</DialogTitle>
                            <DialogDescription className="text-sm text-muted-foreground font-medium">
                                Update the title, format, sharing, and export details for this project.
                            </DialogDescription>
                        </DialogHeader>



                        <div className="mx-5 mt-3 flex shrink-0 gap-1 rounded-xl bg-slate-100 p-1 sm:mx-8 sm:mt-4">
                            <button
                                onClick={() => setActiveTab('general')}
                                className={cn(
                                    "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all",
                                    activeTab === 'general' 
                                        ? "bg-card text-foreground shadow-sm" 
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                General
                            </button>
                            <button
                                onClick={() => setActiveTab('metadata')}
                                className={cn(
                                    "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all",
                                    activeTab === 'metadata' 
                                        ? "bg-card text-foreground shadow-sm" 
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Export Metadata
                            </button>
                        </div>

                        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-5 font-sans sm:px-8 sm:pb-10 sm:pt-6">
                            {activeTab === 'general' ? (
                                <div className="space-y-5 sm:space-y-6">
                                    <div className="space-y-2.5">
                                        <Label htmlFor="title" className="text-sm font-semibold text-foreground ml-1">Project Title</Label>
                                        <Input
                                            id="title"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="Enter story title..."
                                            disabled={!canManageProject}
                                            className="rounded-2xl border-border bg-muted/50 focus:bg-card focus:ring-primary/20 transition-all h-12"
                                        />
                                    </div>

                                    <div className="space-y-2.5">
                                        <Label htmlFor="type" className="text-sm font-semibold text-slate-700 ml-1">Project Format</Label>
                                        <SanctuarySelect
                                            id="type"
                                            value={type}
                                            onValueChange={(nextValue) => setType(nextValue as any)}
                                            disabled={!canManageProject}
                                            options={[
                                                { value: 'novel', label: PROJECT_TYPE_LABELS.novel },
                                                { value: 'tv_script', label: PROJECT_TYPE_LABELS.tv_script }
                                            ]}
                                            triggerClassName="border-border bg-muted/50 focus:bg-card focus-visible:ring-primary/20 text-sm"
                                        />
                                    </div>

                                    <div className="space-y-2.5">
                                        <Label htmlFor="writingMode" className="text-sm font-semibold text-slate-700 ml-1">Editor Mode</Label>
                                        <SanctuarySelect
                                            id="writingMode"
                                            value={writingMode}
                                            onValueChange={(nextValue) => {
                                                if (!canManageProject) return
                                                const newMode = nextValue as 'simple' | 'screenplay';
                                                const isMismatch = (type === 'novel' && newMode === 'screenplay') ||
                                                                 (type === 'tv_script' && newMode === 'simple');
                                                
                                                if (isMismatch) {
                                                    setPendingWritingMode(newMode)
                                                    return
                                                }
                                                setWritingMode(newMode);
                                            }}
                                            disabled={!canManageProject}
                                            options={[
                                                { value: 'simple', label: 'Simple (Prose)' },
                                                { value: 'screenplay', label: getProjectTypeLabel('tv_script') }
                                            ]}
                                            triggerClassName="border-border bg-muted/50 focus:bg-card focus-visible:ring-primary/20 text-sm"
                                        />
                                        <p className="px-1 text-xs leading-5 text-slate-500">Choose how this project behaves in the editor and how scenes are formatted while you write.</p>
                                    </div>

                                    <div className="space-y-2.5">
                                        <Label htmlFor="premise" className="text-sm font-semibold text-foreground ml-1">Core Premise</Label>
                                        <div className="flex items-start gap-2 px-1 text-xs font-medium leading-5 text-slate-500">
                                            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                                            <p className="min-w-0 flex-1">A short note about the story at its heart.</p>
                                            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                                                AI Partner Context
                                            </span>
                                        </div>
                                        <Textarea
                                            id="premise"
                                            value={premise}
                                            onChange={(e) => setPremise(e.target.value)}
                                            placeholder="The elevator pitch for your story..."
                                            disabled={!canManageProject}
                                            className="rounded-2xl border-border bg-muted/50 focus:bg-card focus:ring-primary/20 transition-all min-h-[140px] resize-none text-sm leading-relaxed"
                                        />
                                    </div>

                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between ml-1">
                                            <Label htmlFor="tone" className="text-sm font-semibold text-foreground">Story Tone</Label>
                                            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Optional</span>
                                        </div>
                                        <div className="flex items-start gap-2 px-1 text-xs font-medium leading-5 text-slate-500">
                                            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                                            <p className="min-w-0 flex-1">Capture the mood, voice, or atmosphere you want to return to later.</p>
                                            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                                                AI Partner Context
                                            </span>
                                        </div>
                                        <Textarea
                                            id="tone"
                                            value={tone}
                                            onChange={(e) => setTone(e.target.value)}
                                            placeholder="e.g. Noir, Whimsical, Gritty Realism..."
                                            disabled={!canManageProject}
                                            className="rounded-2xl border-border bg-muted/50 focus:bg-card focus:ring-primary/20 transition-all min-h-[100px] resize-none text-sm leading-relaxed"
                                        />
                                    </div>

                                    {isLocalOnly && (
                                        <div className="mt-6 space-y-4">
                                            <div className={cn(
                                                "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border",
                                                isMidnight 
                                                    ? "bg-indigo-500/10 border-indigo-400/20" 
                                                    : "bg-indigo-50 border-indigo-100"
                                            )}>
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-indigo-500/10 rounded-lg shrink-0">
                                                        <Globe className="w-4 h-4 text-indigo-600" />
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <h4 className="text-sm font-bold text-indigo-900">
                                                            {isAlreadyMigrated ? 'Cloud copy available' : 'Private on this device'}
                                                        </h4>
                                                        <p className="text-sm leading-5 text-indigo-800/80 font-medium">
                                                            {isAlreadyMigrated 
                                                                ? 'A cloud version of this project is ready if you want to collaborate or work across devices.'
                                                                : 'This project is staying local for now. Turn on cloud sync only if you want it on other devices or need collaboration.'
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-start sm:items-end gap-1 w-full sm:w-auto shrink-0">
                                                    {isAlreadyMigrated ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                onOpenChange(false);
                                                                router.push(`/project/${localProject.migrated_to_cloud_project_id}/story`);
                                                            }}
                                                            className="w-full sm:w-auto rounded-lg bg-white/80 border-indigo-200 text-indigo-600 hover:bg-white hover:text-indigo-700 h-8 text-xs font-bold shadow-sm"
                                                        >
                                                            Open Cloud Version
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setShowMigrationConfirm(true)}
                                                            disabled={!canManageProject}
                                                            className="w-full sm:w-auto rounded-lg bg-white/80 border-indigo-200 text-indigo-600 hover:bg-white hover:text-indigo-700 h-8 text-xs font-bold shadow-sm"
                                                        >
                                                            Enable Cloud & Collaboration
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            <LocalTransferGuidance
                                                compact
                                                onOpenProjectFile={onOpenRestore}
                                                onLearnAboutCloudSync={() => {
                                                    onOpenChange(false)
                                                    router.push('/help?q=cloud%20sync')
                                                }}
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        <div className="rounded-2xl border border-border bg-muted/30 p-4">
                                            <div className="flex items-start gap-4">
                                                <div className="space-y-1 flex-1 min-w-0">
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                                        <Label
                                                            htmlFor="allowViewerFeedback"
                                                            className={cn(
                                                                "flex items-center gap-2 text-sm font-semibold text-foreground",
                                                                isLocalOnly && "cursor-pointer"
                                                            )}
                                                            onClick={isLocalOnly ? handleLockedSettingClick : undefined}
                                                        >
                                                            <MessageSquare className="h-4 w-4 text-primary" />
                                                            Allow Viewer Feedback
                                                        </Label>
                                                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                                                            <ToggleStatePill checked={allowViewerFeedback} isLocalOnly={isLocalOnly} />
                                                            <div onClick={isLocalOnly ? handleLockedSettingClick : undefined} className="flex">
                                                                <Switch
                                                                    id="allowViewerFeedback"
                                                                    checked={allowViewerFeedback}
                                                                    onCheckedChange={setAllowViewerFeedback}
                                                                    disabled={!canManageProject || isLocalOnly}
                                                                    className={cn(
                                                                        "data-[size=default]:h-7 data-[size=default]:w-12",
                                                                        allowViewerFeedback && !isLocalOnly
                                                                            ? "data-checked:bg-emerald-600"
                                                                            : "data-unchecked:bg-slate-300"
                                                                    )}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs leading-relaxed text-slate-500">
                                                        {isLocalOnly 
                                                            ? "Turn on cloud sync if you want invited readers to highlight passages and leave feedback."
                                                            : "When on, viewers can highlight passages, leave feedback, and save AI conversations into feedback threads. They still cannot edit the project itself."
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-border bg-muted/30 p-4">
                                            <div className="space-y-3">
                                                <div className="flex items-start gap-4">
                                                    <div className="space-y-1 flex-1 min-w-0">
                                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                                            <Label
                                                                htmlFor="shareOwnerFeedback"
                                                                className={cn(
                                                                    "flex items-center gap-2 text-sm font-semibold text-foreground",
                                                                    isLocalOnly && "cursor-pointer"
                                                                )}
                                                                onClick={isLocalOnly ? handleLockedSettingClick : undefined}
                                                            >
                                                                <Globe className="h-4 w-4 text-primary" />
                                                                Share Owner Feedback Broadly
                                                            </Label>
                                                            <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                                                                <ToggleStatePill checked={shareOwnerFeedback} isLocalOnly={isLocalOnly} />
                                                                <div onClick={isLocalOnly ? handleLockedSettingClick : undefined} className="flex">
                                                                    <Switch
                                                                        id="shareOwnerFeedback"
                                                                        checked={shareOwnerFeedback}
                                                                        onCheckedChange={setShareOwnerFeedback}
                                                                        disabled={!canManageProject || isLocalOnly}
                                                                        className={cn(
                                                                            "data-[size=default]:h-7 data-[size=default]:w-12",
                                                                            shareOwnerFeedback && !isLocalOnly
                                                                                ? "data-checked:bg-emerald-600"
                                                                                : "data-unchecked:bg-slate-300"
                                                                        )}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs leading-relaxed text-slate-500">
                                                            {isLocalOnly 
                                                                ? "Turn on cloud sync before sharing your feedback with collaborators."
                                                                : "Share your feedback across the project by default. If you want more control, share feedback from individual comments instead."
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                                {isLocalOnly ? (
                                                     <button
                                                        type="button"
                                                        onClick={handleLockedSettingClick}
                                                        className="flex w-full items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/30 px-3 py-2 text-left transition-colors hover:bg-indigo-50"
                                                    >
                                                        <span className="flex items-center gap-2 text-[11px] font-semibold text-indigo-600">
                                                            <Users className="h-3.5 w-3.5 text-indigo-400" />
                                                            Turn on cloud sync to manage collaborators
                                                        </span>
                                                        <ArrowUpRight className="h-3.5 w-3.5 text-indigo-400" />
                                                    </button>
                                                ) : onOpenShare && (
                                                    <button
                                                        type="button"
                                                        onClick={onOpenShare}
                                                        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-left transition-colors hover:bg-white"
                                                    >
                                                        <span className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                                                            <Users className="h-3.5 w-3.5 text-slate-400" />
                                                            Manage collaborators and sharing in Share Project
                                                        </span>
                                                        <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-border bg-muted/30 p-4">
                                            <div className="flex items-start gap-4">
                                                <div className="space-y-1 flex-1 min-w-0">
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                                        <Label
                                                            htmlFor="allowCollaboratorExports"
                                                            className={cn(
                                                                "flex items-center gap-2 text-sm font-semibold text-foreground",
                                                                isLocalOnly && "cursor-pointer"
                                                            )}
                                                            onClick={isLocalOnly ? handleLockedSettingClick : undefined}
                                                        >
                                                            <Globe className="h-4 w-4 text-primary" />
                                                            Allow Collaborator Exports
                                                        </Label>
                                                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                                                            <ToggleStatePill checked={allowCollaboratorExports} isLocalOnly={isLocalOnly} />
                                                            <div onClick={isLocalOnly ? handleLockedSettingClick : undefined} className="flex">
                                                                <Switch
                                                                    id="allowCollaboratorExports"
                                                                    checked={allowCollaboratorExports}
                                                                    onCheckedChange={setAllowCollaboratorExports}
                                                                    disabled={!canManageProject || isLocalOnly}
                                                                    className={cn(
                                                                        "data-[size=default]:h-7 data-[size=default]:w-12",
                                                                        allowCollaboratorExports && !isLocalOnly
                                                                            ? "data-checked:bg-emerald-600"
                                                                            : "data-unchecked:bg-slate-300"
                                                                    )}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs leading-relaxed text-slate-500">
                                                        {isLocalOnly 
                                                            ? `Turn on cloud sync before you manage whether collaborators can export this ${getProjectTypeLabel(project.type).toLowerCase()}.`
                                                            : `When off, collaborators can still read the shared ${getProjectTypeLabel(project.type).toLowerCase()} but cannot export it. The owner can always export.`
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {!canManageProject && (
                                            <p className="px-1 text-[10px] italic text-slate-400">
                                                Only the owner can change collaboration, feedback visibility, and export access settings.
                                            </p>
                                        )}
                                    </div>

                                    <section className={cn(
                                        "border-t pt-5 sm:pt-6",
                                        isMidnight ? "border-slate-700/50" : "border-slate-200/80"
                                    )}>
                                        <div className="space-y-1">
                                            <h3 className="text-sm font-medium text-foreground">About this project</h3>
                                            <p className="text-sm leading-6 text-slate-500">
                                                Basic info about how this project is stored and synced.
                                            </p>
                                        </div>

                                        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                                            <InfoRow
                                                label="Storage mode"
                                                value={isLocalOnly ? 'Local on this device' : 'Cloud'}
                                            />
                                            <InfoRow
                                                label="Cloud status"
                                                value={isLocalOnly ? 'Not synced' : 'Synced'}
                                            />
                                            <InfoRow
                                                label="Collaboration"
                                                value={isLocalOnly ? 'Requires cloud' : 'Available'}
                                            />
                                            <InfoRow
                                                label="AI"
                                                value="Optional"
                                            />
                                        </div>

                                        <div className="mt-3 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => setAdvancedDetailsOpen((openState) => !openState)}
                                                className="flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-left text-xs font-medium text-slate-500 transition-colors hover:text-slate-800"
                                            >
                                                <span>Advanced details</span>
                                                <ChevronDown className={cn(
                                                    "h-3.5 w-3.5 transition-transform duration-200",
                                                    advancedDetailsOpen && "rotate-180"
                                                )} />
                                            </button>

                                            {advancedDetailsOpen && (
                                                <div className={cn(
                                                    "mt-2 space-y-2 rounded-xl border p-3",
                                                    isMidnight
                                                        ? "border-slate-700/50 bg-slate-950/20"
                                                        : "border-slate-200/80 bg-slate-50/65"
                                                )}>
                                                    <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/60 p-3 sm:flex-row sm:items-center sm:justify-between">
                                                        <div className="min-w-0">
                                                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                                                                Project ID
                                                            </p>
                                                            <p className="mt-1 truncate font-mono text-[11px] text-slate-600">
                                                                {project.id}
                                                            </p>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={handleCopyProjectId}
                                                            className="h-7 rounded-full px-3 text-[11px]"
                                                        >
                                                            <Copy className="mr-1.5 h-3 w-3" />
                                                            Copy
                                                        </Button>
                                                    </div>

                                                    <AdvancedInfoRow
                                                        icon={isLocalOnly ? HardDrive : DatabaseIcon}
                                                        label="Storage backend"
                                                        value={isLocalOnly ? 'Local (this device only)' : 'Cloud backup'}
                                                    />
                                                    <AdvancedInfoRow
                                                        label="Created"
                                                        value={formatProjectDate(project.created_at)}
                                                    />
                                                    <AdvancedInfoRow
                                                        label="Last updated"
                                                        value={formatProjectDate(project.updated_at)}
                                                    />
                                                    {localProject.migrated_to_cloud_project_id && (
                                                        <AdvancedInfoRow
                                                            label="Cloud version ID"
                                                            value={localProject.migrated_to_cloud_project_id}
                                                            monospace
                                                        />
                                                    )}
                                                    {isLocalOnly && backupMeta && (
                                                        <AdvancedInfoRow
                                                            label="Last backup"
                                                            value={backupMeta.last_backup_at
                                                                ? `Last local backup ${formatProjectDate(backupMeta.last_backup_at)}`
                                                                : 'No local backup recorded yet'}
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </div>
                            ) : (
                                <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-300 sm:space-y-6">
                                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
                                        <div className="space-y-2.5">
                                            <Label className="ml-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                                <Type className="w-3 h-3" /> Author Name
                                            </Label>
                                            <Input
                                                value={metadata.authorName || ''}
                                                onChange={(e) => updateMetadata('authorName', e.target.value)}
                                                placeholder="Legal name"
                                                disabled={!canManageProject}
                                                className="rounded-xl border-border bg-muted/50 h-10 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-2.5">
                                            <Label className="ml-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                                <Info className="w-3 h-3" /> Pen Name
                                            </Label>
                                            <Input
                                                value={metadata.penName || ''}
                                                onChange={(e) => updateMetadata('penName', e.target.value)}
                                                placeholder="Byline"
                                                disabled={!canManageProject}
                                                className="rounded-xl border-border bg-muted/50 h-10 text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
                                        <div className="space-y-2.5">
                                            <Label className="ml-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                                <Copyright className="w-3 h-3" /> Copyright
                                            </Label>
                                            <Input
                                                value={metadata.copyrightHolder || ''}
                                                onChange={(e) => updateMetadata('copyrightHolder', e.target.value)}
                                                placeholder="Holder"
                                                disabled={!canManageProject}
                                                className="rounded-xl border-border bg-muted/50 h-10 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-2.5">
                                            <Label className="ml-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                                <Info className="w-3 h-3" /> Year
                                            </Label>
                                            <Input
                                                value={metadata.copyrightYear || ''}
                                                onChange={(e) => updateMetadata('copyrightYear', e.target.value)}
                                                placeholder="e.g. 2024"
                                                disabled={!canManageProject}
                                                className="rounded-xl border-border bg-muted/50 h-10 text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
                                        <div className="space-y-2.5">
                                            <Label className="ml-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                                <Globe className="w-3 h-3" /> Language
                                            </Label>
                                            <Input
                                                value={metadata.language || ''}
                                                onChange={(e) => updateMetadata('language', e.target.value)}
                                                placeholder="e.g. English"
                                                disabled={!canManageProject}
                                                className="rounded-xl border-border bg-muted/50 h-10 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-2.5">
                                            <Label className="ml-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                                <Book className="w-3 h-3" /> Publisher
                                            </Label>
                                            <Input
                                                value={metadata.publisher || ''}
                                                onChange={(e) => updateMetadata('publisher', e.target.value)}
                                                placeholder="Imprint"
                                                disabled={!canManageProject}
                                                className="rounded-xl border-border bg-muted/50 h-10 text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2.5">
                                        <Label className="ml-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                            <Info className="w-3 h-3" /> Blurb / Description
                                        </Label>
                                        <Textarea
                                            value={metadata.description || ''}
                                            onChange={(e) => updateMetadata('description', e.target.value)}
                                            placeholder="A short summary for publishing metadata..."
                                            disabled={!canManageProject}
                                            className="rounded-xl border-border bg-muted/50 min-h-[80px] text-sm resize-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
                                        <div className="space-y-2.5">
                                            <Label className="ml-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                                <Tag className="w-3 h-3" /> Keywords
                                            </Label>
                                            <Input
                                                value={metadata.keywords || ''}
                                                onChange={(e) => updateMetadata('keywords', e.target.value)}
                                                placeholder="Comma separated"
                                                disabled={!canManageProject}
                                                className="rounded-xl border-border bg-muted/50 h-10 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-2.5">
                                            <Label className="ml-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                                <Hash className="w-3 h-3" /> ISBN
                                            </Label>
                                            <Input
                                                value={metadata.isbn || ''}
                                                onChange={(e) => updateMetadata('isbn', e.target.value)}
                                                placeholder="Optional"
                                                disabled={!canManageProject}
                                                className="rounded-xl border-border bg-muted/50 h-10 text-sm"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="rounded-2xl border border-border bg-muted/50 p-4">
                                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Export Tip</p>
                                        <p className="text-sm leading-6 text-muted-foreground">
                                            This metadata will be automatically injected into your EPUB, DOCX, and PDF exports.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={cn(
                            "shrink-0 border-t px-5 py-4 sm:px-6 sm:py-5",
                            isMidnight ? "bg-[#182239]/88 border-slate-700/60" : "bg-white border-[#f0eee9]"
                        )}>
                            <div className="flex flex-col gap-3 sm:gap-4">
                                <div className="flex justify-center">
                                    {canManageProject ? (
                                        <Button
                                            variant="ghost"
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="h-9 rounded-full px-5 text-sm font-medium text-slate-500 hover:bg-red-50/80 hover:text-red-600"
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete project...
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="ghost"
                                            onClick={handleLeaveCollaboration}
                                            disabled={loading}
                                            className="h-9 rounded-full px-5 text-sm font-medium text-slate-500 hover:bg-amber-50 hover:text-amber-700"
                                        >
                                            <LogOut className="w-4 h-4 mr-2" />
                                            Leave project
                                        </Button>
                                    )}
                                </div>

                                <div className="flex w-full items-center gap-3 sm:justify-end">
                                    <Button
                                        variant="ghost"
                                        onClick={() => onOpenChange(false)}
                                        className="h-11 rounded-xl px-8 flex-1 sm:flex-none"
                                    >
                                        Cancel
                                    </Button>
                                    {canManageProject && (
                                        <Button
                                            onClick={handleSave}
                                            disabled={loading || !title.trim()}
                                            className="bg-[#546354] hover:bg-[#3d4a3d] text-white h-11 rounded-xl px-8 flex-1 sm:flex-none shadow-lg shadow-slate-900/10 transition-all duration-300 active:scale-95"
                                        >
                                            <Save className="w-4 h-4 mr-2" />
                                            Save Changes
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="py-6 space-y-6">
                        <div className="w-20 h-20 bg-destructive/10 rounded-[2rem] flex items-center justify-center mx-auto text-destructive">
                            <AlertTriangle className="w-10 h-10" />
                        </div>
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-serif text-foreground">Delete this project?</h2>
                            <p className="text-muted-foreground max-w-xs mx-auto">
                                This permanently deletes <span className="font-bold text-foreground">&quot;{project.title}&quot;</span>, including its scenes, characters, and ideas.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={loading}
                                className="h-14 rounded-full text-base font-semibold shadow-lg shadow-red-200"
                            >
                                {loading ? 'Deleting...' : 'Delete project'}
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={loading}
                                className="h-12 rounded-full text-muted-foreground"
                            >
                                Keep project
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
        <AlertDialog open={pendingWritingMode !== null} onOpenChange={(open) => !open && setPendingWritingMode(null)}>
            <AlertDialogContent className="max-w-md rounded-[2rem]">
                <AlertDialogHeader>
                    <AlertDialogTitle>Switch editor mode?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Switching editor mode may not match your project structure. {getProjectTypeLabel('tv_script')} mode works best with {getProjectTypeLabel('tv_script').toLowerCase()}s.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => {
                        if (pendingWritingMode) {
                            setWritingMode(pendingWritingMode)
                        }
                        setPendingWritingMode(null)
                    }}>
                        Continue
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    )
}

function InfoRow({ label, value }: { label: string, value: string }) {
    return (
        <div className="rounded-lg border border-border/50 bg-background/35 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
            <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
        </div>
    )
}

function AdvancedInfoRow({
    label,
    value,
    icon: Icon,
    monospace = false,
}: {
    label: string
    value: string
    icon?: LucideIcon
    monospace?: boolean
}) {
    return (
        <div className="flex items-start justify-between gap-4 rounded-lg border border-border/50 bg-background/45 px-3 py-2.5">
            <div className="min-w-0">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {Icon && <Icon className="h-3 w-3" />}
                    {label}
                </p>
                <p className={cn(
                    "mt-1 break-words text-sm text-slate-600",
                    monospace && "font-mono text-[11px]"
                )}>
                    {value}
                </p>
            </div>
        </div>
    )
}
