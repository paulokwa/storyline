'use client'

import { useState, useEffect } from 'react'
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
    HelpCircle
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
import { cn, getUserColor } from '@/lib/utils'
import type { Database } from '@/lib/supabase/types'
import { ReaderProvider, useSpeech } from '@/hooks/useSpeech'
import { CommentsProvider, useComments } from '@/components/project/CommentsContext'
import { FloatingPlayer, ReaderControls } from '@/components/project/story/ReaderMode'
import { ProjectProvider, useProjectActions } from '@/components/project/ProjectContext'
import { MessageSquare } from 'lucide-react'
import { PresenceProvider, usePresence } from '@/components/project/PresenceContext'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Avatar, AvatarFallback } from "../ui/avatar"
import OnboardingTour from './OnboardingTour'
import { queueAiTourStart } from '@/lib/ai/tour'

type Project = Database['public']['Tables']['projects']['Row']

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

export default function ProjectShell({
    project: initialProject,
    currentUserId,
    role = 'owner',
    children,
}: {
    project: Project
    currentUserId: string
    role?: 'owner' | 'editor' | 'viewer'
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
    const [shortcutsOpen, setShortcutsOpen] = useState(false)
    const [tourOpen, setTourOpen] = useState(false)
    const onboardingStorageKey = `storyline-onboarding:${currentUserId}:${project.type}`

    async function saveTitle() {
        if (!titleDraft.trim()) return setEditingTitle(false)
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

    const { activeNodeId } = useProjectActions()

    return (
        <PresenceProvider projectId={project.id} currentSceneId={activeNodeId}>
            <CommentsProvider projectId={project.id}>
                <ReaderProvider>
                    <ProjectShellInner 
                        project={project} 
                        editingTitle={editingTitle} 
                        setEditingTitle={setEditingTitle} 
                        titleDraft={titleDraft} 
                        setTitleDraft={setTitleDraft} 
                        saveTitle={saveTitle} 
                        setExportModalOpen={setExportModalOpen}
                        setSettingsModalOpen={setSettingsModalOpen}
                        setShareModalOpen={setShareModalOpen}
                        shortcutsOpen={shortcutsOpen}
                        setShortcutsOpen={setShortcutsOpen}
                        role={role}
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
                            />
                        )}
                        
                        <ExportModal 
                            open={exportModalOpen} 
                            onOpenChange={setExportModalOpen} 
                            projectId={project.id}
                            projectTitle={project.title ?? 'Untitled'}
                            projectType={project.type as any}
                            onOpenSettings={() => {
                                setExportModalOpen(false)
                                setSettingsModalOpen(true)
                            }}
                        />
                        
                        <ProjectSettingsModal 
                            open={settingsModalOpen} 
                            onOpenChange={setSettingsModalOpen} 
                            project={project} 
                        />

                        <ShareModal
                            open={shareModalOpen}
                            onOpenChange={setShareModalOpen}
                            projectId={project.id}
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
    editingTitle, 
    setEditingTitle, 
    titleDraft, 
    setTitleDraft, 
    saveTitle, 
    setExportModalOpen, 
    setSettingsModalOpen, 
    setShareModalOpen,
    shortcutsOpen,
    setShortcutsOpen,
    role,
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
        analyzeScene, isAnalyzing,
        setAnalysisResult,
        sceneAssetsOpen, setSceneAssetsOpen,
        isDictating, requestDictation,
        activeNodeId,
        showStructureHint, setShowStructureHint
    } = useProjectActions()

    // Register actions in the global state for AppNav access
    const setActions = useProjectActionsStore(state => state.setActions)
    useEffect(() => {
        setActions({
            export: () => setExportModalOpen(true),
            share: () => setShareModalOpen(true),
            settings: () => setSettingsModalOpen(true),
            stats: () => router.push(`/project/${project.id}/stats`),
            canShare: role === 'owner'
        })
        return () => setActions(null)
    }, [role, setActions, setExportModalOpen, setShareModalOpen, setSettingsModalOpen])
    const { commentsPanelOpen, setCommentsPanelOpen } = useComments()
    
    // Responsive checks
    const isMobile = useMediaQuery('(max-width: 768px)')





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
        if (!isStoryTab || aiPanelOpen || role === 'viewer') return
        
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
    }, [currentSceneText, isStoryTab, aiPanelOpen, role])

    const handleToggleComments = () => {
        const nextState = !commentsPanelOpen
        if (nextState && isMobile) {
            setAiPanelOpen(false)
        }
        setCommentsPanelOpen(nextState)
    }

    const handleToggleAssets = () => {
        const nextState = !sceneAssetsOpen
        if (nextState && isMobile) {
            setAiPanelOpen(false)
            setCommentsPanelOpen(false)
        }
        setSceneAssetsOpen(nextState)
    }

    const { speak, speechState } = useSpeech()
    const isReading = speechState === 'speaking'

    // Global shortcut for help
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName) && !(e.target as HTMLElement).isContentEditable) {
                setShortcutsOpen(true)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [setShortcutsOpen])

    return (
        <TooltipProvider>
            <div className="project-shell-root h-full min-h-0 flex-1 flex flex-col overflow-hidden">
                {/* Project header */}
                <div className="project-shell-header bg-secondary/50 backdrop-blur-sm px-4 sm:px-6 lg:px-8 border-b border-border">
                <div className="max-w-[1440px] mx-auto">
                    {/* Top row */}

                    <div className="flex items-center gap-2 pt-4 pb-2 border-b border-black/5 md:border-none">
                        <div className="flex items-center gap-1.5 shrink-0">
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
                                            <BookOpen className="w-3.5 h-3.5" />
                                            <span className="hidden lg:inline text-[10px] font-bold uppercase tracking-[0.1em]">Editor</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">Return to your last active scene</TooltipContent>
                                </Tooltip>
                            )}
                        </div>

                        <div className="flex items-center gap-2 overflow-hidden flex-1 px-1">
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

                        <div className="flex items-center gap-4">
                            <AvatarPortal />
                            
                            {isStoryTab && (
                                <div className="hidden lg:flex xl:hidden items-center gap-1.5 p-1 bg-violet-50/50 rounded-2xl border border-violet-100/50">
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => analyzeScene()}
                                                disabled={isAnalyzing || !currentSceneText}
                                                className={cn(
                                                    "rounded-xl transition-all h-9 w-9 p-0",
                                                    isAnalyzing ? "bg-white text-violet-600 shadow-sm animate-pulse" : "text-slate-500 hover:bg-white hover:text-violet-600"
                                                )}
                                            >
                                                <Wand2 className="w-4 h-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" sideOffset={7}>Analyze this scene with AI</TooltipContent>
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

                            <div className="h-6 w-px bg-slate-200/50" />
                            
                            <Tooltip>
                                <TooltipTrigger>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShortcutsOpen(true)}
                                        data-tour="help-icon"
                                        className="h-9 w-9 p-0 rounded-xl bg-black/5 text-slate-500 hover:text-primary hover:bg-primary/5 transition-all"
                                    >
                                        <HelpCircle className="w-5 h-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Shortcuts & Help</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>

                    
                    {/* Action Buttons Row - Mobile Only */}
                    <div className="project-shell-mobilebar lg:hidden border-b border-black/5">
                        <div className="snap-row flex items-center gap-2 py-2 pl-1">
                            {isStoryTab && (
                                <div className="flex items-center gap-2 shrink-0">
                                    {/* AI Tools - Generative stuff first */}
                                    <div className="story-mobile-ai-cluster flex items-center gap-1 bg-violet-50 p-1 rounded-2xl border border-violet-100/50">
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => analyzeScene()}
                                                    disabled={isAnalyzing || !currentSceneText}
                                                    className={cn(
                                                        "story-mobile-ai-button rounded-xl transition-all h-9 px-3 gap-2",
                                                        isAnalyzing ? "story-mobile-ai-button-active bg-white text-violet-600 shadow-sm animate-pulse font-bold" : "text-slate-500 hover:bg-white"
                                                    )}
                                                >
                                                    <Wand2 className="w-4 h-4" />
                                                    <span className="text-xs font-medium">Analyze</span>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" sideOffset={7}>Analyze this scene with AI</TooltipContent>
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

                                    {/* Reading/Interaction */}
                                    <ReaderControls 
                                        getSelection={() => currentSelectionText}
                                        getScene={() => currentSceneText}
                                        getChapter={() => currentChapterText}
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
                                     <span className="shrink-0">
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
                                     </span>

                                     {/* Gallery */}
                                     <span className="shrink-0">
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
                                         <TooltipContent side="bottom">Gallery</TooltipContent>
                                     </Tooltip>
                                     </span>

                                </div>
                            )}
                        </div>
                    </div>

                    <div className="project-shell-tabs mt-1">
                        <div className="snap-row flex gap-1 pl-1">
                            {TABS.map(({ slug, label, icon: Icon }) => (
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
            <div className="flex h-full min-h-0 w-full max-w-[1440px] flex-1 flex-col overflow-hidden mx-auto">
                {children}
            </div>
            
            </div>
            <ShortcutsLegend open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
        </TooltipProvider>
    )
}

function AvatarPortal() {
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])
    if (!mounted) return null
    
    const target = document.getElementById('app-nav-portal')
    if (!target) return <CollaborativeAvatars />
    
    return createPortal(<CollaborativeAvatars />, target)
}

function CollaborativeAvatars() {
    const { presenceUsers, currentUser } = usePresence()
    const MAX_VISIBLE = 4
    
    // Filter out the current user to avoid "Two Circles" for the same person
    const filteredUsers = presenceUsers.filter(u => u.user_id !== currentUser?.id)
    
    const visibleUsers = filteredUsers.slice(0, MAX_VISIBLE)
    const remainingCount = filteredUsers.length - MAX_VISIBLE
    
    return (
        <div className="flex items-center -space-x-1.5 hover:-space-x-1 transition-all duration-300">
            {visibleUsers.map((user) => {
                const statusLabel = user.status === 'editing' ? 'writing' : 'reading'
                const userColor = getUserColor(user.email)
                
                return (
                    <Tooltip key={user.user_id}>
                        <TooltipTrigger>
                            <Avatar className={cn(
                                "w-8 h-8 ring-2 ring-white transition-all cursor-default",
                                userColor
                            )}>
                                <AvatarFallback className="text-[10px] font-bold bg-transparent">
                                    {(() => {
                                        const name = user.display_name || user.email.split('@')[0]
                                        return name.includes(' ')
                                            ? name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                                            : name.slice(0, 2).toUpperCase()
                                    })()}
                                </AvatarFallback>
                            </Avatar>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="flex flex-col gap-0.5 px-3 py-2 rounded-xl shadow-xl border-slate-200">
                            <p className="text-xs font-bold text-slate-900">{user.email}</p>
                            <p className="text-[10px] text-slate-500 font-medium">
                                Currently <span className="text-primary/70">{statusLabel}</span> {user.scene_id ? 'this scene' : 'the project'}
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
