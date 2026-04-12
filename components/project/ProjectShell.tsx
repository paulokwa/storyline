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
    ChevronLeft, Settings, Check, X,
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
    Settings2
} from 'lucide-react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useProjectActionsStore } from '@/lib/store/projectActionsStore'
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
import { FloatingPlayer } from '@/components/project/story/ReaderMode'
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

type Project = Database['public']['Tables']['projects']['Row']

const TABS = [
    { slug: 'story', label: 'Story', icon: BookOpen },
    { slug: 'characters', label: 'Characters', icon: Users },
    { slug: 'ideas', label: 'Ideas', icon: Lightbulb },
    { slug: 'locations', label: 'Locations', icon: MapPin },
    { slug: 'objects', label: 'Objects', icon: Package },
    { slug: 'assets', label: 'Assets', icon: ImageIcon },
    { slug: 'archive', label: 'Archive', icon: Bookmark },
    { slug: 'recovery', label: 'Recovery', icon: History },
] as const

export default function ProjectShell({
    project: initialProject,
    role = 'owner',
    children,
}: {
    project: Project
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

    return (
        <ProjectProvider role={role}>
            <PresenceWrapper project={project} role={role}>
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
                            role={role}
                            pathname={pathname} 
                        >
                            {children}
                        </ProjectShellInner>
                        
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

                        <FloatingPlayer />
                    </ReaderProvider>
                </CommentsProvider>
            </PresenceWrapper>
        </ProjectProvider>
    )
}

function PresenceWrapper({ project, children }: any) {
    const { activeNodeId } = useProjectActions()
    return (
        <PresenceProvider projectId={project.id} currentSceneId={activeNodeId}>
            {children}
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
    role,
    pathname, 
    children 
}: any) {
    const { 
        sidebarOpen, setSidebarOpen, 
        aiPanelOpen, setAiPanelOpen, 
        currentSceneText, 
        analyzeScene, isAnalyzing 
    } = useProjectActions()

    // Register actions in the global state for AppNav access
    const setActions = useProjectActionsStore(state => state.setActions)
    useEffect(() => {
        setActions({
            export: () => setExportModalOpen(true),
            share: () => setShareModalOpen(true),
            settings: () => setSettingsModalOpen(true),
            canShare: role === 'owner'
        })
        return () => setActions(null)
    }, [role, setActions, setExportModalOpen, setShareModalOpen, setSettingsModalOpen])
    const { commentsPanelOpen, setCommentsPanelOpen } = useComments()
    
    // Responsive checks
    const isMobile = useMediaQuery('(max-width: 768px)')
    const isVerySmall = useMediaQuery('(max-width: 480px)')

    const handleToggleAi = () => {
        const nextState = !aiPanelOpen
        if (nextState && isMobile) {
            setCommentsPanelOpen(false)
        }
        setAiPanelOpen(nextState)
    }

    const handleToggleComments = () => {
        const nextState = !commentsPanelOpen
        if (nextState && isMobile) {
            setAiPanelOpen(false)
        }
        setCommentsPanelOpen(nextState)
    }

    const { speak, speechState } = useSpeech()
    const isReading = speechState === 'speaking'
    const isStoryTab = pathname.includes('/story')
    const activeTab = TABS.find(t => pathname.includes(`/${t.slug}`))?.slug ?? 'story'

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Project header */}
            <div className="bg-secondary/50 backdrop-blur-sm px-4 sm:px-6 lg:px-8 border-b border-border">
                <div className="max-w-[1440px] mx-auto">
                    {/* Top row */}

                    <div className="flex items-center gap-2 pt-4 pb-2 border-b border-black/5 md:border-none">
                        <div className="flex items-center gap-1.5 shrink-0">
                            <Link 
                                href="/library" 
                                className="h-9 w-9 flex items-center justify-center rounded-xl bg-black/5 text-slate-500 hover:text-slate-800 transition-all active:scale-95"
                                title="Back to library"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </Link>

                            {isStoryTab && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSidebarOpen(!sidebarOpen)}
                                    className={cn(
                                        "rounded-xl transition-all h-9 w-9 p-0",
                                        sidebarOpen ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-black/5 text-slate-500 hover:bg-black/10"
                                    )}
                                    title="Toggle structure panel"
                                >
                                    <PanelLeft className="w-4 h-4" />
                                </Button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 overflow-hidden flex-1 px-1">
                            {!editingTitle ? (
                                <>
                                    <div className={cn(
                                        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                                        project.type === 'novel' ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"
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

                        <div className="flex items-center -space-x-2 shrink-0">
                             <AvatarPortal />
                        </div>
                    </div>

                    
                    {/* Action Buttons Row - Mobile Only */}
                    <div className="md:hidden relative group/actions border-b border-black/5">
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-1">
                            {isStoryTab && (
                                <div className="flex items-center gap-2 shrink-0">
                                    {/* AI Tools - Generative stuff first */}
                                    <div className="flex items-center gap-1 bg-violet-50 p-1 rounded-2xl border border-violet-100/50">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => analyzeScene()}
                                            disabled={isAnalyzing || !currentSceneText}
                                            className={cn(
                                                "rounded-xl transition-all h-9 px-3 gap-2",
                                                isAnalyzing ? "bg-white text-violet-600 shadow-sm animate-pulse font-bold" : "text-slate-500 hover:bg-white"
                                            )}
                                        >
                                            <Wand2 className="w-4 h-4" />
                                            <span className="text-xs font-medium">Analyze</span>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleToggleAi}
                                            className={cn(
                                                "rounded-xl transition-all h-9 px-3 gap-2",
                                                aiPanelOpen ? "bg-white text-indigo-600 shadow-sm font-bold border-indigo-100" : "text-slate-500 hover:bg-white"
                                            )}
                                        >
                                            <Sparkles className="w-4 h-4" />
                                            <span className="text-xs font-medium">Helper</span>
                                        </Button>
                                    </div>

                                    {/* Reading/Interaction */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => speak(currentSceneText, 'Scene')}
                                        className={cn(
                                            "rounded-xl transition-all h-9 px-3 gap-2",
                                            isReading ? "bg-amber-100 text-amber-700 animate-pulse border border-amber-200 font-bold" : "bg-black/5 text-slate-500 hover:bg-black/10"
                                        )}
                                    >
                                        <Volume2 className={cn("w-4 h-4", isReading && "animate-bounce")} />
                                        <span className="text-xs font-medium">Read Aloud</span>
                                    </Button>

                                    {/* Feedback */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleToggleComments}
                                        className={cn(
                                            "rounded-xl transition-all h-9 px-3 gap-2 border border-transparent",
                                            commentsPanelOpen ? "bg-rose-50 text-rose-600 border-rose-100 font-bold shadow-sm" : "bg-black/5 text-slate-500 hover:bg-black/10"
                                        )}
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        <span className="text-xs font-medium">Feedback</span>
                                    </Button>
                                </div>
                            )}
                        </div>
                        {/* Scroll indicator gradient */}
                        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#fcfbf9] to-transparent pointer-events-none" />
                    </div>

                    <div className="relative group/tabs mt-1">
                        <div className="flex gap-1 overflow-x-auto no-scrollbar scroll-smooth">
                            {TABS.map(({ slug, label, icon: Icon }) => (
                                <Link
                                    key={slug}
                                    href={`/project/${project.id}/${slug}`}
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
                        {/* Scroll indicator gradient */}
                        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#fcfbf9] to-transparent pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Page content */}
            <div className="flex-1 overflow-hidden max-w-[1440px] w-full mx-auto flex flex-col">
                {children}
            </div>
        </div>
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
        <TooltipProvider>
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
        </TooltipProvider>
    )
}
