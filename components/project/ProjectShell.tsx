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
    Image as ImageIcon
} from 'lucide-react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
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
                        exportModalOpen={exportModalOpen}
                        setExportModalOpen={setExportModalOpen}
                        settingsModalOpen={settingsModalOpen}
                        setSettingsModalOpen={setSettingsModalOpen}
                        shareModalOpen={shareModalOpen}
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
    exportModalOpen,
    setExportModalOpen, 
    settingsModalOpen,
    setSettingsModalOpen, 
    shareModalOpen,
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
                    <div className="flex items-center gap-3 pt-4 pb-3">
                        <Link href="/library" className="text-slate-400 hover:text-slate-700 transition-colors shrink-0">
                            <ChevronLeft className="w-5 h-5" />
                        </Link>

                        <div 
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${project.type === 'tv_script' ? 'bg-violet-100' : 'bg-amber-50'}`}
                            title={getProjectTypeLabel(project.type)}
                        >
                            {project.type === 'tv_script'
                                ? <Tv className="w-4 h-4 text-violet-600" />
                                : <BookOpen className="w-4 h-4 text-amber-600" />}
                        </div>

                        {editingTitle ? (
                            <div className="flex items-center gap-2 flex-1">
                                <Input
                                    value={titleDraft}
                                    onChange={(e) => setTitleDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveTitle()
                                        if (e.key === 'Escape') setEditingTitle(false)
                                    }}
                                    className="h-8 text-base font-semibold max-w-sm"
                                    autoFocus
                                />
                                <button onClick={saveTitle} className="text-green-600 hover:text-green-700">
                                    <Check className="w-4 h-4" />
                                </button>
                                <button onClick={() => setEditingTitle(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => { setTitleDraft(project.title ?? ''); setEditingTitle(true) }}
                                className="text-2xl sm:text-3xl font-serif text-foreground hover:text-primary transition-colors text-left flex-1 truncate py-2"
                                title="Click to rename"
                            >
                                {project.title}
                            </button>
                        )}

                        <div className="flex items-center -space-x-2 mr-2 sm:mr-4 overflow-hidden shrink-0">
                             <AvatarPortal />
                        </div>

                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 flex-1">
                             {/* Tab Actions (Dynamic) */}
                             {isStoryTab && (
                                <div className="flex items-center gap-1 sm:gap-1.5 mr-2 pr-2 border-r border-[#e0ded9]">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSidebarOpen(!sidebarOpen)}
                                        className={cn(
                                            "rounded-xl transition-all h-9 px-2 sm:px-2.5",
                                            sidebarOpen ? "bg-primary/10 text-primary hover:bg-primary/20" : "text-slate-500 hover:bg-black/5"
                                        )}
                                        title="Toggle structure panel"
                                    >
                                        <PanelLeft className="w-4 h-4" />
                                    </Button>

                                    <div className="flex items-center gap-1 bg-black/5 p-0.5 rounded-xl shrink-0">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => speak(currentSceneText, 'Scene')}
                                            className={cn(
                                                "rounded-lg transition-all h-8 px-2.5 gap-2",
                                                isReading ? "bg-amber-100 text-amber-700 animate-pulse" : "text-slate-500 hover:bg-white"
                                            )}
                                            title="Read aloud"
                                        >
                                            <Volume2 className={cn("w-4 h-4", isReading && "animate-bounce")} />
                                            <span className="text-xs font-medium hidden md:inline">Read Aloud</span>
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => analyzeScene()}
                                            disabled={isAnalyzing || !currentSceneText}
                                            className={cn(
                                                "rounded-lg transition-all h-8 px-2.5 gap-2",
                                                isAnalyzing ? "bg-violet-100 text-violet-700 animate-pulse" : "text-slate-500 hover:bg-white"
                                            )}
                                            title="Analyze scene"
                                        >
                                            <Wand2 className="w-4 h-4" />
                                            <span className="text-xs font-medium hidden md:inline">Analyze</span>
                                        </Button>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleToggleAi}
                                        className={cn(
                                            "rounded-xl transition-all h-9 px-2 sm:px-2.5 gap-2",
                                            aiPanelOpen ? "bg-violet-100 text-violet-700 hover:bg-violet-200" : "text-slate-500 hover:bg-black/5"
                                        )}
                                        title="Toggle AI helper"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        <span className="text-xs font-medium hidden md:inline">AI Helper</span>
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleToggleComments}
                                        className={cn(
                                            "rounded-xl transition-all h-9 px-2 sm:px-2.5 gap-2",
                                            commentsPanelOpen ? "bg-primary/10 text-primary hover:bg-primary/20" : "text-slate-500 hover:bg-black/5"
                                        )}
                                        title="Toggle feedback panel"
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        <span className="text-xs font-medium hidden md:inline">Feedback</span>
                                    </Button>
                                    

                                </div>
                            )}

                            <div className="flex items-center gap-1 shrink-0 ml-auto sm:ml-0">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="flex rounded-xl bg-card border-border text-primary hover:bg-primary/5 hover:border-primary/20 transition-all duration-300 gap-1.5 px-2.5 sm:px-4 h-9 shadow-sm"
                                    onClick={() => setExportModalOpen(true)}
                                    title="Export Project"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Export</span>
                                </Button>

                                {role === 'owner' && (
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="flex rounded-xl bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-700 hover:border-indigo-600 transition-all duration-300 gap-1.5 px-2.5 sm:px-4 h-9 shadow-lg shadow-indigo-200"
                                        onClick={() => setShareModalOpen(true)}
                                        title="Share Project"
                                    >
                                        <Users className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Share</span>
                                    </Button>
                                )}
                                
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    className="rounded-xl text-slate-400 hover:text-slate-600 hover:bg-black/5 h-9 w-9"
                                    onClick={() => setSettingsModalOpen(true)}
                                    title="Project Settings"
                                >
                                    <Settings className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 mt-2 overflow-x-auto no-scrollbar scroll-smooth">
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
    const { presenceUsers } = usePresence()
    const MAX_VISIBLE = 4
    
    const visibleUsers = presenceUsers.slice(0, MAX_VISIBLE)
    const remainingCount = presenceUsers.length - MAX_VISIBLE
    
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
                                        {user.email.substring(0, 2).toUpperCase()}
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
