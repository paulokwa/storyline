'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    BookOpen, Users, Lightbulb,
    ChevronLeft, Settings, Check, X, Home,
    Tv,
    Download,
    MapPin,
    Package,
    PanelLeft,
    Sparkles,
    Volume2,
    Wand2,
    Bookmark,
    History,
    MoreHorizontal,
    Image as ImageIcon,
    Share,
    FileDown,
    Settings2,
    Mic,
    MicOff,
    HelpCircle,
    PenLine,
    Square
} from 'lucide-react'
import { ShortcutsLegend } from './ShortcutsLegend'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useProjectActionsStore } from '@/lib/store/projectActionsStore'
import { useTheme } from '@/components/providers/ThemeProvider'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import ExportModal from '@/components/export/ExportModal'
import { getProjectTypeLabel } from '@/lib/constants'
import ProjectSettingsModal from '@/components/project/ProjectSettingsModal'
import ShareModal from '@/components/project/ShareModal'
import RestoreBackupModal from '@/components/project/RestoreBackupModal'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { cn, getUserColor } from '@/lib/utils'
import type { Database } from '@/lib/supabase/types'
import { ReaderProvider, useSpeech } from '@/hooks/useSpeech'
import { CommentsProvider, useComments } from '@/components/project/CommentsContext'
import { FloatingPlayer, ReaderControls } from '@/components/project/story/ReaderMode'
import { ProjectProvider, useProjectActions } from '@/components/project/ProjectContext'
import { MessageSquare } from 'lucide-react'
import { PresenceProvider, usePresence } from '@/components/project/PresenceContext'
import type { ProjectStorageMode } from '@/lib/persistence/project-mode'
import { updateLocalProject } from '@/lib/persistence/local-projects'
import { exportLocalBackup } from '@/lib/backup/export-local-backup'
import { recordBackupComplete } from '@/lib/backup/backup-reminder'
import { 
    saveProjectContent, 
    getNewStorylineFileHandle, 
} from '@/lib/backup/file-system'
import { buildLocalBackup } from '@/lib/backup/export-local-backup'
import { BACKUP_FILE_EXTENSION } from '@/lib/backup/backup-format'
import { toast } from 'sonner'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import OnboardingTour from './OnboardingTour'
import { queueAiTourStart } from '@/lib/ai/tour'
import { WORKSPACE_TOUR_PENDING_KEY } from '@/lib/project/tour'
import { OPEN_SHORTCUTS_EVENT } from '@/lib/project/shortcuts'

type Project = Database['public']['Tables']['projects']['Row']
type ProjectOwner = {
    user_id: string
    display_name: string | null
    avatar_url: string | null
}
type ProjectMemberSummary = {
    role: Database['public']['Enums']['project_role']
    user_id: string
    display_name: string | null
    avatar_url: string | null
}

const TABS = [
    { slug: 'story', label: 'Story', icon: BookOpen },
    { slug: 'ai', label: 'AI Partner', icon: Sparkles },
    { slug: 'archive', label: 'AI Memory', icon: Bookmark },
    { slug: 'characters', label: 'Characters', icon: Users },
    { slug: 'ideas', label: 'Ideas', icon: Lightbulb },
    { slug: 'locations', label: 'Locations', icon: MapPin },
    { slug: 'objects', label: 'Objects', icon: Package },
    { slug: 'assets', label: 'Assets', icon: ImageIcon },
    { slug: 'recovery', label: 'Recovery', icon: History },
] as const

const LOCAL_ONLY_TABS = TABS.filter(({ slug }) =>
    ['story', 'characters', 'ideas', 'locations', 'objects', 'assets', 'recovery'].includes(slug)
)
const LOCAL_MODE_EDUCATION_PENDING_KEY = 'storyline-local-mode-education-pending'
const LOCAL_MODE_EDUCATION_SHOWN_KEY = 'storyline-local-mode-education-shown'

function splitReaderBlocks(text: string): string[] {
    return text
        .split(/\n{2,}/)
        .map((block) => block.replace(/\s+/g, ' ').trim())
        .filter((block) => block.length > 0)
}

export default function ProjectShell({
    project: initialProject,
    currentUserId,
    owner,
    members,
    role = 'owner',
    storageMode = 'cloud-enabled',
    children,
}: {
    project: Project
    currentUserId: string
    owner: ProjectOwner
    members: ProjectMemberSummary[]
    role?: 'owner' | 'editor' | 'viewer'
    storageMode?: ProjectStorageMode
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const router = useRouter()
    const [project, setProject] = useState(initialProject)
    const [editingTitle, setEditingTitle] = useState(false)
    const [titleDraft, setTitleDraft] = useState(project.title ?? '')
    const [exportModalOpen, setExportModalOpen] = useState(false)
    const [settingsModalOpen, setSettingsModalOpen] = useState(false)
    const [shareModalOpen, setShareModalOpen] = useState(false)
    const [restoreModalOpen, setRestoreModalOpen] = useState(false)
    const [shortcutsOpen, setShortcutsOpen] = useState(false)
    const [tourOpen, setTourOpen] = useState(false)
    const [localModeEducationOpen, setLocalModeEducationOpen] = useState(false)
    const onboardingStorageKey = `storyline-onboarding:${currentUserId}:${project.type}`
    const isLocalOnly = storageMode === 'local-only'

    async function saveTitle() {
        if (!titleDraft.trim()) return setEditingTitle(false)
        if (isLocalOnly) {
            const data = await updateLocalProject(project.id, { title: titleDraft.trim() })
            setProject(data as Project)
            setEditingTitle(false)
            return
        }

        const supabase = createClient()
        const { data } = await supabase
            .from('projects')
            .update({ title: titleDraft.trim() })
            .eq('id', project.id)
            .select()
            .single()
        if (data) setProject(data)
        setEditingTitle(false)
        router.refresh()
    }

    useEffect(() => {
        const completed = localStorage.getItem(onboardingStorageKey)
        if (!completed) {
            // Delay slightly to ensure elements are rendered
            const timer = setTimeout(() => setTourOpen(true), 1500)
            return () => clearTimeout(timer)
        }
    }, [onboardingStorageKey])

    useEffect(() => {
        if (sessionStorage.getItem(WORKSPACE_TOUR_PENDING_KEY) !== 'true') return

        sessionStorage.removeItem(WORKSPACE_TOUR_PENDING_KEY)
        const timer = setTimeout(() => setTourOpen(true), 200)

        return () => clearTimeout(timer)
    }, [pathname])

    useEffect(() => {
        const handleOpenShortcuts = () => setShortcutsOpen(true)

        window.addEventListener(OPEN_SHORTCUTS_EVENT, handleOpenShortcuts)
        return () => window.removeEventListener(OPEN_SHORTCUTS_EVENT, handleOpenShortcuts)
    }, [])

    useEffect(() => {
        if (!isLocalOnly) return
        if (localStorage.getItem(LOCAL_MODE_EDUCATION_SHOWN_KEY) === 'true') return
        if (sessionStorage.getItem(LOCAL_MODE_EDUCATION_PENDING_KEY) !== project.id) return

        setLocalModeEducationOpen(true)
    }, [isLocalOnly, project.id])

    useEffect(() => {
        if (isLocalOnly) return

        const supabase = createClient()
        const channel = supabase
            .channel(`project-members:${project.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'project_members',
                filter: `project_id=eq.${project.id}`,
            }, () => {
                router.refresh()
            })
            .subscribe()

        return () => {
            channel.unsubscribe()
        }
    }, [isLocalOnly, project.id, router])

    function dismissLocalModeEducation() {
        localStorage.setItem(LOCAL_MODE_EDUCATION_SHOWN_KEY, 'true')
        sessionStorage.removeItem(LOCAL_MODE_EDUCATION_PENDING_KEY)
        setLocalModeEducationOpen(false)
    }

    async function handleBackupFromEducation() {
        try {
            const { wordCount } = await exportLocalBackup(project.id)
            recordBackupComplete(project.id, wordCount)
        } catch (err) {
            console.error('[ProjectShell] Local backup export failed:', err)
        } finally {
            dismissLocalModeEducation()
        }
    }

    const { activeNodeId } = useProjectActions()

    return (
        <PresenceProvider projectId={project.id} currentSceneId={activeNodeId}>
            <CommentsProvider projectId={project.id}>
                <ReaderProvider>
                    <ProjectShellInner 
                        project={project} 
                        owner={owner}
                        members={members}
                        currentUserId={currentUserId}
                        editingTitle={editingTitle} 
                        setEditingTitle={setEditingTitle} 
                        titleDraft={titleDraft} 
                        setTitleDraft={setTitleDraft} 
                        saveTitle={saveTitle} 
                        setExportModalOpen={setExportModalOpen}
                        setSettingsModalOpen={setSettingsModalOpen}
                        setShareModalOpen={setShareModalOpen}
                        setRestoreModalOpen={setRestoreModalOpen}
                        shortcutsOpen={shortcutsOpen}
                        setShortcutsOpen={setShortcutsOpen}
                        role={role}
                        storageMode={storageMode}
                        pathname={pathname} 
                        onStartTour={() => setTourOpen(true)}
                    >
                        {children}
                    </ProjectShellInner>

                        {tourOpen && (
                            <OnboardingTour 
                                open={tourOpen} 
                                onClose={() => setTourOpen(false)}
                                onDismiss={() => {
                                    setTourOpen(false)
                                    localStorage.setItem(onboardingStorageKey, 'true')
                                }}
                                onComplete={() => {
                                    setTourOpen(false)
                                    localStorage.setItem(onboardingStorageKey, 'true')
                                }}
                                projectType={project.type}
                            />
                        )}
                        
                        <ExportModal 
                            open={exportModalOpen} 
                            onOpenChange={setExportModalOpen} 
                            projectId={project.id}
                            projectTitle={project.title ?? 'Untitled'}
                            projectType={project.type as any}
                            role={role}
                            allowCollaboratorExports={project.allow_collaborator_exports ?? false}
                            onOpenSettings={() => {
                                setExportModalOpen(false)
                                setSettingsModalOpen(true)
                            }}
                        />

                        {!isLocalOnly && (
                            <>
                                <ShareModal
                                    open={shareModalOpen}
                                    onOpenChange={setShareModalOpen}
                                    projectId={project.id}
                                />
                            </>
                        )}

                        {isLocalOnly && (
                            <RestoreBackupModal
                                open={restoreModalOpen}
                                onOpenChange={setRestoreModalOpen}
                                projectId={project.id}
                                projectTitle={project.title ?? 'Untitled'}
                                currentUserId={currentUserId}
                                onRestoreComplete={() => {
                                    window.location.reload()
                                }}
                                onOpenExport={() => {
                                    setRestoreModalOpen(false)
                                    exportLocalBackup(project.id).then(({ wordCount }) => {
                                        recordBackupComplete(project.id, wordCount)
                                    })
                                }}
                            />
                        )}

                        {isLocalOnly && (
                            <Dialog
                                open={localModeEducationOpen}
                                onOpenChange={(open) => {
                                    if (!open) {
                                        dismissLocalModeEducation()
                                        return
                                    }
                                    setLocalModeEducationOpen(open)
                                }}
                            >
                                <DialogContent className="max-w-md rounded-[2rem] border border-[#d9e1d5] bg-[#fbf9f5] p-0 shadow-2xl">
                                    <div className="p-8">
                                        <DialogHeader className="space-y-3 text-left">
                                            <DialogTitle className="font-serif text-2xl text-slate-900">Stored on this device</DialogTitle>
                                            <DialogDescription className="text-sm leading-6 text-slate-600">
                                                This project stays on this device unless you back it up or turn on cloud sync.
                                            </DialogDescription>
                                        </DialogHeader>

                                        <div className="mt-6 flex flex-col gap-3">
                                            <Button
                                                type="button"
                                                onClick={handleBackupFromEducation}
                                                className="h-11 rounded-full bg-[#546354] text-white hover:bg-[#465345]"
                                            >
                                                <Download className="mr-2 h-4 w-4" />
                                                Back up project
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    dismissLocalModeEducation()
                                                    setSettingsModalOpen(true)
                                                }}
                                                className="h-11 rounded-full border-[#d9e1d5] bg-white/80 text-slate-700 hover:bg-white"
                                            >
                                                <Settings className="mr-2 h-4 w-4" />
                                                Open Project Settings
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={dismissLocalModeEducation}
                                                className="h-11 rounded-full text-slate-600 hover:text-slate-900"
                                            >
                                                Keep writing
                                            </Button>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}

                        <ProjectSettingsModal 
                            open={settingsModalOpen} 
                            onOpenChange={setSettingsModalOpen} 
                            project={project} 
                            role={role}
                            onOpenRestore={isLocalOnly ? () => setRestoreModalOpen(true) : undefined}
                            onOpenShare={() => {
                                setSettingsModalOpen(false)
                                setShareModalOpen(true)
                            }}
                        />

                        <ShortcutsLegend 
                            open={shortcutsOpen} 
                            onOpenChange={setShortcutsOpen} 
                            onStartTour={() => {
                                setShortcutsOpen(false)
                                setTourOpen(true)
                            }}
                        />

                    <FloatingPlayer />
                </ReaderProvider>
            </CommentsProvider>
        </PresenceProvider>
    )
}


function ProjectShellInner({ 
    project, 
    owner,
    members,
    currentUserId,
    editingTitle, 
    setEditingTitle, 
    titleDraft, 
    setTitleDraft, 
    saveTitle, 
    setExportModalOpen, 
    setSettingsModalOpen, 
    setShareModalOpen,
    setRestoreModalOpen,
    shortcutsOpen,
    setShortcutsOpen,
    role,
    storageMode,
    pathname, 
    onStartTour,
    children 
}: any) {
    const router = useRouter()
    const { theme } = useTheme()
    const isMidnight = theme === 'midnight'
    const { 
        sidebarOpen, setSidebarOpen, 
        aiPanelOpen, setAiPanelOpen, 
        currentSceneText, 
        currentSelectionText,
        currentChapterText,
        analyzeScene, stopAnalysis, isAnalyzing,
        setAnalysisResult,
        sceneAssetsOpen, setSceneAssetsOpen,
        isDictating, requestDictation,
        activeNodeId,
        showStructureHint, setShowStructureHint
    } = useProjectActions()

    // Register actions in the global state for AppNav access
    const setActions = useProjectActionsStore(state => state.setActions)
    const isLocalOnly = storageMode === 'local-only'
    const canExport = role === 'owner' || (!isLocalOnly && (project.allow_collaborator_exports ?? false))
    const canShare = !isLocalOnly && role === 'owner'
    const supportsAi = true
    const supportsComments = true
    const supportsAssets = true
    const sceneAssetsLabel = project.type === 'tv_script' ? 'Visual References' : 'Gallery'
    const visibleTabs = isLocalOnly ? LOCAL_ONLY_TABS : TABS
    const { commentsPanelOpen, setCommentsPanelOpen } = useComments()
    
    // Responsive checks
    const isMobile = useMediaQuery('(max-width: 768px)')





    const [isSavingToDisk, setIsSavingToDisk] = useState(false)

    const handleSaveProject = useCallback(async () => {
        if (!isLocalOnly || isSavingToDisk) return
        setIsSavingToDisk(true)

        try {
            // Build the project backup JSON
            const backup = await buildLocalBackup(project.id)
            const json = JSON.stringify(backup, null, 2)
            
            const result = await saveProjectContent(json, {
                fileName: project.linked_file_name || `${project.title || 'untitled'}${BACKUP_FILE_EXTENSION}`,
                handle: project.storyline_file_handle
            })
            
            if (result && result.ok) {
                const updatedFields: any = {
                    last_file_save_at: new Date().toISOString()
                }
                
                if (result.handle) {
                    updatedFields.storyline_file_handle = result.handle
                    updatedFields.linked_file_name = result.fileName
                }

                await updateLocalProject(project.id, updatedFields)
                
                toast.success(result.savedToHandle 
                    ? `Project saved to ${result.fileName}`
                    : "Project downloaded as .storyline file"
                )
            } else if (result) {
                if (result.reason === 'permission_denied') {
                    toast.error("Storyline could not access the linked file. Use Save As to choose a file again.")
                } else if (result.reason === 'permission_lost') {
                    toast.error("Storyline needs permission to save to this file again.")
                } else if (result.reason !== 'cancelled') {
                    toast.error(`Save failed: ${result.reason}`)
                }
            }
        } catch (err) {
            console.error('[ProjectShell] Manual save failed:', err)
            toast.error("An unexpected error occurred while saving.")
        } finally {
            setIsSavingToDisk(false)
        }
    }, [isLocalOnly, isSavingToDisk, project.id, project.storyline_file_handle])

    const handleSaveProjectAs = useCallback(async () => {
        if (!isLocalOnly || isSavingToDisk) return
        setIsSavingToDisk(true)

        try {
            // Build the project backup JSON
            const backup = await buildLocalBackup(project.id)
            const json = JSON.stringify(backup, null, 2)

            const result = await saveProjectContent(json, {
                fileName: `${project.title || 'untitled'}${BACKUP_FILE_EXTENSION}`,
                handle: null // Force a new handle
            })

            if (result && result.ok) {
                const updatedFields = {
                    storyline_file_handle: result.handle || null,
                    linked_file_name: result.fileName,
                    last_file_save_at: new Date().toISOString()
                }
                await updateLocalProject(project.id, updatedFields)
                toast.success(result.savedToHandle 
                    ? `Project linked to ${result.fileName} and saved`
                    : "Project saved and downloaded"
                )
            } else if (result && result.reason !== 'cancelled') {
                toast.error(`Save As failed: ${result.reason}`)
            }
        } catch (err) {
            console.error('[ProjectShell] Save As failed:', err)
            toast.error("An unexpected error occurred while saving.")
        } finally {
            setIsSavingToDisk(false)
        }
    }, [isLocalOnly, isSavingToDisk, project.id, project.title])

    // Global keyboard shortcut for Save (Ctrl+S / Cmd+S)
    useEffect(() => {
        if (!isLocalOnly) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault()
                if (project.storyline_file_handle) {
                    handleSaveProject()
                } else {
                    handleSaveProjectAs()
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isLocalOnly, project.storyline_file_handle, handleSaveProject, handleSaveProjectAs])

    useEffect(() => {
        setActions({
            export: () => {
                setExportModalOpen(true)
            },
            save: isLocalOnly ? handleSaveProject : undefined,
            saveAs: isLocalOnly ? handleSaveProjectAs : undefined,
            share: () => {
                if (!isLocalOnly) setShareModalOpen(true)
            },
            settings: () => {
                setSettingsModalOpen(true)
            },
            stats: () => {
                router.push(`/project/${project.id}/stats`)
            },
            canShare,
            canExport,
            restore: isLocalOnly ? () => setRestoreModalOpen(true) : undefined,
            exportDisabledReason: canExport
                ? null
                : 'The owner has disabled exports for collaborators.',
            linkedFileName: project.linked_file_name,
            lastFileSaveAt: project.last_file_save_at,
        })
        return () => setActions(null)
    }, [canExport, canShare, isLocalOnly, project.id, project.linked_file_name, project.last_file_save_at, router, setActions, setExportModalOpen, setShareModalOpen, setSettingsModalOpen, setRestoreModalOpen, handleSaveProject, handleSaveProjectAs])

    const handleDismissStructureHint = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault()
            e.stopPropagation()
        }
        setShowStructureHint(false)
        localStorage.setItem('storyline-mobile-structure-discovered', 'true')
    }

    const handleToggleStructure = (e?: React.MouseEvent) => {
        if (e) e.preventDefault()
        handleDismissStructureHint()
        setSidebarOpen(!sidebarOpen)
    }

    const handleToggleAi = () => {
        const nextState = !aiPanelOpen
        if (nextState) {
            queueAiTourStart()
            setAnalysisResult(null) // Close analysis panel if opening AI Partner
            if (isMobile) setCommentsPanelOpen(false)
        }
        setAiPanelOpen(nextState)
    }

    const handleAiTabClick = () => {
        queueAiTourStart()
    }

    const isStoryTab = pathname.includes('/story')
    const activeTab = TABS.find(t => pathname.includes(`/${t.slug}`))?.slug ?? 'story'

    const [showAiHint, setShowAiHint] = useState(false)

    useEffect(() => {
        if (aiPanelOpen) {
            localStorage.setItem('storyline-ai-helper-discovered', 'true')
            setShowAiHint(false)
        }
    }, [aiPanelOpen])

    useEffect(() => {
        if (!supportsAi || !isStoryTab || aiPanelOpen || role === 'viewer') return
        
        const timer = setTimeout(() => {
            const discovered = localStorage.getItem('storyline-ai-helper-discovered')
            const shownThisSession = sessionStorage.getItem('storyline-ai-helper-shown')
            
            if (discovered || shownThisSession) return
            
            const len = currentSceneText?.trim().length || 0
            if (len < 50) {
                setShowAiHint(true)
                sessionStorage.setItem('storyline-ai-helper-shown', 'true')
            }
        }, 5000)
        
        return () => clearTimeout(timer)
    }, [currentSceneText, isStoryTab, aiPanelOpen, role, supportsAi])

    const handleToggleComments = () => {
        if (!supportsComments) return
        const nextState = !commentsPanelOpen
        if (nextState && isMobile) {
            setAiPanelOpen(false)
        }
        setCommentsPanelOpen(nextState)
    }

    const handleToggleAssets = () => {
        if (!supportsAssets) return
        const nextState = !sceneAssetsOpen
        if (nextState && isMobile) {
            setAiPanelOpen(false)
            setCommentsPanelOpen(false)
        }
        setSceneAssetsOpen(nextState)
    }

    const { speak, speechState } = useSpeech()
    const isReading = speechState === 'speaking'

    // Global shortcut for the shortcuts panel
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null
            const isTypingTarget = !!target && (
                ['INPUT', 'TEXTAREA'].includes(target.tagName) ||
                target.isContentEditable
            )
            const isShortcutKey = e.key === '?' || (e.key === '/' && e.shiftKey)

            if (isShortcutKey && !isTypingTarget) {
                e.preventDefault()
                setShortcutsOpen((open: boolean) => !open)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [setShortcutsOpen])

    return (
        <TooltipProvider>
            <div className="project-shell-root h-full min-h-0 flex-1 flex flex-col overflow-hidden">
                {/* Project header */}
                <div className="project-shell-header bg-secondary/50 backdrop-blur-sm px-4 sm:px-6 lg:px-10 border-b border-border">
                    <div className="w-full max-w-[1440px] mx-auto">
                    {/* Top row */}

                    <div className="flex items-center gap-3 pt-4 pb-2 border-b border-black/5 md:border-none lg:gap-5">
                        <div className="flex items-center gap-1.5 shrink-0 lg:gap-2">
                            <Tooltip>
                                <TooltipTrigger>
                                    <Link 
                                        href="/library" 
                                        className="h-9 w-9 flex items-center justify-center rounded-xl bg-black/5 text-slate-500 hover:text-slate-800 transition-all active:scale-95"
                                    >
                                        <Home className="w-4 h-4" />
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" sideOffset={-57}>Back to library</TooltipContent>
                            </Tooltip>

                            {isStoryTab && (
                                <div className="relative">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleToggleStructure}
                                        data-tour="structure-toggle"
                                        aria-pressed={sidebarOpen}
                                        aria-label={sidebarOpen ? "Hide structure panel" : "Show structure panel"}
                                        className={cn(
                                            "rounded-xl transition-all h-9 px-3 gap-2",
                                            sidebarOpen ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-black/5 text-slate-600 hover:bg-black/10 hover:text-slate-800"
                                        )}
                                    >
                                        <PanelLeft className="w-4 h-4 shrink-0" />
                                        <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-[0.14em]">Structure</span>
                                    </Button>
                                    {showStructureHint && (
                                        <div className="absolute left-1/2 top-full mt-2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-500 bg-[#546354] text-white text-[11px] leading-relaxed font-medium py-2.5 pl-4 pr-3 rounded-2xl shadow-xl shadow-black/10 flex items-center gap-3 whitespace-normal w-[240px] md:hidden">
                                            <div className="absolute -top-1 left-1/2 -ml-1 border-4 border-transparent border-b-[#546354] border-t-0" />
                                            <p>You can reopen your story structure any time from the Structure button next to Home.</p>
                                            <button onClick={handleDismissStructureHint} className="bg-white/20 hover:bg-white/30 rounded-full p-1 shrink-0 transition-colors">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!isStoryTab && (
                                     <Tooltip>
                                         <TooltipTrigger>
                                             <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => router.push(`/project/${project.id}/story${activeNodeId ? `?nodeId=${activeNodeId}` : ''}`)}
                                            className="h-9 px-3 gap-2 rounded-xl bg-indigo-50/50 text-indigo-600 hover:bg-indigo-50 transition-all active:scale-95 ml-1"
                                        >
                                            <PenLine className="w-3.5 h-3.5" />
                                            <span className="hidden lg:inline text-[10px] font-bold uppercase tracking-[0.1em]">Editor</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">Return to your last active scene</TooltipContent>
                                </Tooltip>
                            )}
                        </div>

                        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden border-l border-black/5 pl-3 lg:gap-3 lg:pl-4">
                            {!editingTitle ? (
                                <>
                                    <div className={cn(
                                        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                                        project.type === 'novel'
                                            ? (isMidnight
                                                ? "bg-[rgba(245,248,255,0.08)] text-[#aab8ff] border border-[rgba(96,115,151,0.28)] shadow-[inset_0_0_0_1px_rgba(148,163,184,0.12),0_10px_24px_rgba(2,6,23,0.24)]"
                                                : "bg-indigo-50 text-indigo-600")
                                            : (isMidnight
                                                ? "bg-[rgba(245,248,255,0.08)] text-[#f5b767] border border-[rgba(96,115,151,0.28)] shadow-[inset_0_0_0_1px_rgba(148,163,184,0.12),0_10px_24px_rgba(2,6,23,0.24)]"
                                                : "bg-amber-50 text-amber-600")
                                    )}>
                                        {project.type === 'novel' ? <BookOpen className="w-4 h-4" /> : <Tv className="w-4 h-4" />}
                                    </div>
                                    <button 
                                        onClick={() => {
                                            if (role === 'owner') {
                                                setTitleDraft(project.title)
                                                setEditingTitle(true)
                                            }
                                        }}
                                        className="text-sm sm:text-lg font-serif italic text-slate-800 hover:text-indigo-600 transition-colors truncate text-left"
                                    >
                                        {project.title}
                                    </button>
                                </>
                            ) : (
                                <div className="flex items-center gap-2 w-full animate-in fade-in slide-in-from-left-1 duration-200">
                                    <Input
                                        value={titleDraft}
                                        onChange={(e) => setTitleDraft(e.target.value)}
                                        className="h-8 text-sm font-serif italic border-indigo-200 focus:ring-indigo-500/20 bg-white"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') saveTitle()
                                            if (e.key === 'Escape') setEditingTitle(false)
                                        }}
                                    />
                                    <button onClick={saveTitle} className="p-1 text-green-600 hover:bg-green-50 rounded-lg">
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setEditingTitle(false)} className="p-1 text-red-600 hover:bg-red-50 rounded-lg">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3 lg:gap-4">
                            {!isLocalOnly && <AvatarPortal owner={owner} members={members} currentUserId={currentUserId} role={role} />}
                            
                            {supportsAi && isStoryTab && (
                                <div className="hidden lg:flex xl:hidden items-center gap-1.5 p-1 bg-violet-50/50 rounded-2xl border border-violet-100/50">
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => (isAnalyzing ? stopAnalysis() : analyzeScene())}
                                                disabled={!isAnalyzing && !currentSceneText}
                                                className={cn(
                                                    "rounded-xl transition-all h-9 w-9 p-0",
                                                    isAnalyzing ? "bg-white text-violet-600 shadow-sm animate-pulse ring-2 ring-violet-200/70" : "text-slate-500 hover:bg-white hover:text-violet-600"
                                                )}
                                            >
                                                {isAnalyzing ? <Square className="w-3.5 h-3.5 fill-current" /> : <Wand2 className="w-4 h-4" />}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" sideOffset={7}>{isAnalyzing ? 'Stop analysis' : 'Analyze this scene with AI'}</TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                        <TooltipTrigger>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleToggleAi}
                                                data-tour="ai-sidebar-trigger"
                                                className={cn(
                                                    "rounded-xl transition-all h-9 w-9 p-0",
                                                    aiPanelOpen ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:bg-white hover:text-indigo-600"
                                                )}
                                            >
                                                <Sparkles className="w-4 h-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" sideOffset={7}>Ask AI Partner</TooltipContent>
                                    </Tooltip>
                                </div>
                            )}

                            {!isLocalOnly && <div className="h-6 w-px bg-slate-200/50" />}
                            
                            <Tooltip>
                                <TooltipTrigger>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => router.push(`/project/${project.id}/help`)}
                                        data-tour="help-icon"
                                        className="h-9 w-9 p-0 rounded-xl bg-black/5 text-slate-500 hover:text-primary hover:bg-primary/5 transition-all lg:hidden"
                                    >
                                        <HelpCircle className="w-5 h-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Help center</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>

                    
                    {/* Action Buttons Row - Mobile Only */}
                    <div className="project-shell-mobilebar lg:hidden border-b border-black/5">
                        <div className="snap-row flex items-center gap-2 py-2 pl-1">
                            {isStoryTab && (
                                <div className="flex items-center gap-2 shrink-0">
                                    {/* AI Tools - Generative stuff first */}
                                    {supportsAi && (
                                    <div className="story-mobile-ai-cluster flex items-center gap-1 bg-violet-50 p-1 rounded-2xl border border-violet-100/50">
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => (isAnalyzing ? stopAnalysis() : analyzeScene())}
                                                    disabled={!isAnalyzing && !currentSceneText}
                                                    className={cn(
                                                        "story-mobile-ai-button rounded-xl transition-all h-9 px-3 gap-2",
                                                        isAnalyzing ? "story-mobile-ai-button-active bg-white text-violet-600 shadow-sm animate-pulse font-bold ring-2 ring-violet-200/70" : "text-slate-500 hover:bg-white"
                                                    )}
                                                >
                                                    {isAnalyzing ? <Square className="w-3.5 h-3.5 fill-current" /> : <Wand2 className="w-4 h-4" />}
                                                    <span className="text-xs font-medium">{isAnalyzing ? 'Stop' : 'Analyze'}</span>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" sideOffset={7}>{isAnalyzing ? 'Stop analysis' : 'Analyze this scene with AI'}</TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleToggleAi}
                                                    data-tour="ai-helper"
                                                    className={cn(
                                                        "story-mobile-ai-button rounded-xl transition-all h-9 px-3 gap-2",
                                                        aiPanelOpen ? "story-mobile-ai-button-active bg-white text-indigo-600 shadow-sm font-bold border-indigo-100" : "text-slate-500 hover:bg-white"
                                                    )}
                                                >
                                                    <Sparkles className="w-4 h-4" />
                                                    <span className="text-xs font-medium">Ask AI</span>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" sideOffset={7}>Ask AI Partner</TooltipContent>
                                        </Tooltip>

                                        {showAiHint && (
                                            <div className="absolute left-1/2 top-full mt-2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-500 bg-violet-600 text-white text-[11px] font-medium py-1.5 pl-3 pr-2 rounded-full shadow-lg shadow-violet-900/10 flex items-center gap-2 whitespace-nowrap">
                                                <div className="absolute -top-1 left-1/2 -ml-1 border-4 border-transparent border-b-violet-600 border-t-0" />
                                                <Sparkles className="w-3.5 h-3.5" />
                                                AI Partner can help outline this scene
                                                <button 
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        setShowAiHint(false)
                                                        localStorage.setItem('storyline-ai-helper-discovered', 'true')
                                                    }} 
                                                    className="bg-white/20 hover:bg-white/30 rounded-full p-0.5 ml-1 transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    )}

                                    {/* Reading/Interaction */}
                                    <ReaderControls 
                                        getSelection={() => currentSelectionText}
                                        getScene={() => currentSceneText}
                                        getChapter={() => currentChapterText}
                                        getSceneChunks={() => splitReaderBlocks(currentSceneText)}
                                        getChapterChunks={() => splitReaderBlocks(currentChapterText)}
                                        mode="icon-only"
                                    />

                                    {/* Dictate */}
                                    <span className="shrink-0">
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={requestDictation}
                                                className={cn(
                                                    "rounded-xl transition-all h-9 w-9 p-0 flex items-center justify-center shrink-0 border border-transparent",
                                                    isDictating ? "bg-red-50 text-red-600 border-red-100 font-bold shadow-sm animate-pulse" : "bg-black/5 text-slate-500 hover:bg-black/10"
                                                )}
                                            >
                                                {isDictating ? <Mic className="w-4 h-4 text-red-500" /> : <MicOff className="w-4 h-4" />}
                                            </Button>
                                        </TooltipTrigger>
                                             <TooltipContent side="bottom">Dictate</TooltipContent>
                                     </Tooltip>
                                     </span>

                                     {/* Feedback */}
                                     {supportsComments && <span className="shrink-0">
                                     <Tooltip>
                                        <TooltipTrigger>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleToggleComments}
                                                className={cn(
                                                    "rounded-xl transition-all h-9 w-9 p-0 flex items-center justify-center shrink-0 border border-transparent",
                                                    commentsPanelOpen ? "bg-rose-50 text-rose-600 border-rose-100 font-bold shadow-sm" : "bg-black/5 text-slate-500 hover:bg-black/10"
                                                )}
                                            >
                                                <MessageSquare className="w-4 h-4" />
                                            </Button>
                                        </TooltipTrigger>
                                         <TooltipContent side="bottom">Feedback</TooltipContent>
                                     </Tooltip>
                                     </span>}

                                     {/* Gallery */}
                                     {supportsAssets && <span className="shrink-0">
                                     <Tooltip>
                                         <TooltipTrigger>
                                             <Button
                                                 variant="ghost"
                                                 size="sm"
                                                 onClick={handleToggleAssets}
                                                 disabled={!activeNodeId || activeNodeId === 'virtual-root'}
                                                 className={cn(
                                                     "rounded-xl transition-all h-9 w-9 p-0 flex items-center justify-center shrink-0 border border-transparent",
                                                     !activeNodeId || activeNodeId === 'virtual-root'
                                                         ? "bg-black/5 text-slate-300"
                                                         : sceneAssetsOpen
                                                             ? "bg-emerald-50 text-emerald-600 border-emerald-100 font-bold shadow-sm"
                                                             : "bg-black/5 text-slate-500 hover:bg-black/10"
                                                 )}
                                             >
                                                 <ImageIcon className="w-4 h-4" />
                                             </Button>
                                         </TooltipTrigger>
                                         <TooltipContent side="bottom">{sceneAssetsLabel}</TooltipContent>
                                     </Tooltip>
                                     </span>}

                                </div>
                            )}
                        </div>
                    </div>

                    <div className="project-shell-tabs mt-1 flex justify-center lg:mt-2">
                        <div className="snap-row flex gap-1 lg:gap-1.5">
                            {visibleTabs.map(({ slug, label, icon: Icon }) => (
                                <Link
                                    key={slug}
                                    href={`/project/${project.id}/${slug}${slug === 'story' && activeNodeId ? `?nodeId=${activeNodeId}` : ''}`}
                                    onClick={slug === 'ai' ? handleAiTabClick : undefined}
                                    data-tour={slug === 'ai' ? 'ai-tab' : undefined}
                                    className={cn(
                                        'flex items-center gap-1.5 px-4 sm:px-6 py-3 text-sm font-medium transition-all duration-300 rounded-t-xl shrink-0',
                                        activeTab === slug
                                            ? 'bg-background text-primary shadow-[0_-4px_12px_rgba(0,0,0,0.03)]'
                                            : 'text-slate-500 hover:text-slate-800 hover:bg-black/5'
                                    )}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    <span className="font-sans tracking-wide uppercase text-[10px]">{label}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Page content */}
            <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
                {children}
            </div>
            
            </div>
        </TooltipProvider>
    )
}

function AvatarPortal({
    owner,
    members,
    currentUserId,
    role,
}: {
    owner: ProjectOwner
    members: ProjectMemberSummary[]
    currentUserId: string
    role: 'owner' | 'editor' | 'viewer'
}) {
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])
    if (!mounted) return null
    
    const avatarProps = { owner, members, currentUserId, role }
    const target = document.getElementById('app-nav-portal')
    if (!target) return <CollaborativeAvatars {...avatarProps} />
    
    return createPortal(<CollaborativeAvatars {...avatarProps} />, target)
}

function CollaborativeAvatars({
    owner,
    members,
    currentUserId,
    role,
}: {
    owner: ProjectOwner
    members: ProjectMemberSummary[]
    currentUserId: string
    role: 'owner' | 'editor' | 'viewer'
}) {
    const { presenceUsers, currentUser } = usePresence()
    const MAX_VISIBLE = 4
    const showOwnerBadge = role !== 'owner' && owner.user_id !== currentUserId
    const ownerPresence = presenceUsers.find(user => user.user_id === owner.user_id)
    const memberUsers = members.filter(member => member.user_id !== owner.user_id)
    const usersToRender = role === 'owner'
        ? memberUsers
        : presenceUsers
            .filter(user => {
                if (user.user_id === currentUser?.id) return false
                if (showOwnerBadge && user.user_id === owner.user_id) return false
                return true
            })
            .map(user => ({
                role: 'viewer' as Database['public']['Enums']['project_role'],
                user_id: user.user_id,
                display_name: user.display_name,
                avatar_url: null,
            }))

    const visibleUsers = usersToRender.slice(0, MAX_VISIBLE)
    const remainingCount = usersToRender.length - MAX_VISIBLE
    const ownerName = owner.display_name || 'Project owner'
    const ownerInitials = ownerName.includes(' ')
        ? ownerName.split(' ').map((part: string) => part[0]).join('').slice(0, 2).toUpperCase()
        : ownerName.slice(0, 2).toUpperCase()

    if (!showOwnerBadge && visibleUsers.length === 0 && remainingCount <= 0) {
        return null
    }
    
    return (
        <div className="flex items-center -space-x-1.5 hover:-space-x-1 transition-all duration-300">
            {showOwnerBadge && (
                <Tooltip>
                    <TooltipTrigger>
                        <div className="relative">
                            <Avatar className="w-8 h-8 ring-2 ring-amber-200 bg-white transition-all cursor-default">
                                <AvatarImage src={owner.avatar_url || undefined} alt={ownerName} />
                                <AvatarFallback className="text-[10px] font-bold bg-amber-50 text-amber-700">
                                    {ownerInitials}
                                </AvatarFallback>
                            </Avatar>
                            <span className={cn(
                                "absolute -bottom-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full border border-white px-1 text-[7px] font-bold uppercase tracking-wide",
                                ownerPresence ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                            )}>
                                O
                            </span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="flex flex-col gap-0.5 px-3 py-2 rounded-xl shadow-xl border-slate-200">
                        <p className="text-xs font-bold text-slate-900">{ownerName}</p>
                        <p className="text-[10px] text-slate-500 font-medium">
                            Project owner{ownerPresence ? ' currently in the project' : ''}
                        </p>
                    </TooltipContent>
                </Tooltip>
            )}
            {visibleUsers.map((user) => {
                const activePresence = presenceUsers.find((presenceUser) => presenceUser.user_id === user.user_id)
                const statusLabel = activePresence?.status === 'editing' ? 'writing' : 'reading'
                const collaboratorName = user.display_name || 'Collaborator'
                const collaboratorInitials = collaboratorName.includes(' ')
                    ? collaboratorName.split(' ').map((part: string) => part[0]).join('').slice(0, 2).toUpperCase()
                    : collaboratorName.slice(0, 2).toUpperCase()
                const colorSeed = activePresence?.email || collaboratorName || user.user_id
                const userColor = getUserColor(colorSeed)
                const roleLabel = user.role === 'editor' ? 'Editor' : 'Viewer'
                
                return (
                    <Tooltip key={user.user_id}>
                        <TooltipTrigger>
                            <div className="relative">
                                <Avatar className={cn(
                                    "w-8 h-8 ring-2 ring-white transition-all cursor-default",
                                    userColor
                                )}>
                                    <AvatarImage src={user.avatar_url || undefined} alt={collaboratorName} />
                                    <AvatarFallback className="text-[10px] font-bold bg-transparent">
                                        {collaboratorInitials}
                                    </AvatarFallback>
                                </Avatar>
                                <span className={cn(
                                    "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white",
                                    activePresence ? "bg-emerald-500" : "bg-slate-300"
                                )} />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="flex flex-col gap-0.5 px-3 py-2 rounded-xl shadow-xl border-slate-200">
                            <p className="text-xs font-bold text-slate-900">{collaboratorName}</p>
                            <p className="text-[10px] text-slate-500 font-medium">
                                {activePresence
                                    ? <>{roleLabel} access • active in {activePresence.scene_id ? 'this scene' : 'project'}</>
                                    : <>{roleLabel} access • currently offline</>}
                            </p>
                        </TooltipContent>
                    </Tooltip>
                )
            })}
            
            {remainingCount > 0 && (
                <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500 ring-2 ring-white cursor-default">
                    +{remainingCount}
                </div>
            )}
        </div>
    )
}
