'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
    Film, 
    BookOpen, 
    Trash2, 
    ChevronRight, 
    Plus, 
    Clock, 
    Sparkles, 
    Palette,
    Pencil,
    GripVertical,
    ArrowUpDown,
    Calendar,
    LayoutGrid,
    Users
} from 'lucide-react'
import type { Database } from '@/lib/supabase/types'
import { formatDistanceToNow } from '@/lib/time'
import { cn } from '@/lib/utils'
import { PROJECT_TYPE_LABELS, DEFAULT_WRITING_MODE_BY_TYPE, getProjectTypeLabel } from '@/lib/constants'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import CoverEditModal from './CoverEditModal'
import ProjectSettingsModal from '../project/ProjectSettingsModal'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '@/components/providers/ThemeProvider'
import { destroyLocalProject, listLocalProjects, restoreLocalProject, softDeleteLocalProject, updateLocalProject } from '@/lib/persistence/local-projects'
import { isLocalProjectId } from '@/lib/persistence/project-mode'
import ImportBackupButton from '@/components/library/ImportBackupButton'
import LocalTransferGuidance from '@/components/project/local/LocalTransferGuidance'

// Explicitly extend the Project type with fields added via recent migrations
type Project = Database['public']['Tables']['projects']['Row'] & {
    role?: 'owner' | 'editor' | 'viewer'
    order_index?: number | null
    cover_url?: string | null
    is_local?: boolean
    storage_mode?: 'local-only' | 'cloud-enabled'
    members?: Array<{
        user_id: string
        role: string
        display_name: string | null
        avatar_url: string | null
    }>
}

function getAvatarInitials(name: string | null | undefined, fallback = 'U') {
    const value = name?.trim()
    if (!value) return fallback

    return value.includes(' ')
        ? value.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
        : value.slice(0, 2).toUpperCase()
}

export default function ProjectGrid({ projects, deletedProjects, currentUserId }: { projects: Project[], deletedProjects: Project[], currentUserId: string }) {
    const transferGuidanceDismissKey = 'storyline-library-transfer-guidance-dismissed'
    const router = useRouter()
    const { theme } = useTheme()
    const isMidnight = theme === 'midnight'
    const [localProjects, setLocalProjects] = useState<Project[]>([])
    const [localProjectsLoaded, setLocalProjectsLoaded] = useState(false)
    const [draft, setDraft] = useState<{ state: any; step: any } | null>(null)
    const [confirmDeleteDraft, setConfirmDeleteDraft] = useState(false)
    const [view, setView] = useState<'active' | 'trash'>('active')
    const [sortFilter, setSortFilter] = useState<'custom' | 'recent' | 'az'>('custom')
    const [showTransferGuidance, setShowTransferGuidance] = useState(true)
    const initialMount = useRef(true)

    // Load sort preference on mount
    useEffect(() => {
        const saved = localStorage.getItem('storyline-library-sort')
        if (saved && (saved === 'custom' || saved === 'recent' || saved === 'az')) {
            setSortFilter(saved as any)
        }

        if (localStorage.getItem(transferGuidanceDismissKey) === 'true') {
            setShowTransferGuidance(false)
        }
    }, [])

    // Save sort preference when it changes
    useEffect(() => {
        if (initialMount.current) {
            initialMount.current = false
            return
        }
        localStorage.setItem('storyline-library-sort', sortFilter)
    }, [sortFilter])
    
    // Local state for dragging
    const [orderedActive, setOrderedActive] = useState<Project[]>([])
    const [orderedTrash, setOrderedTrash] = useState<Project[]>([])

    const refreshLocalProjects = useCallback(async () => {
        try {
            const nextLocalProjects = await listLocalProjects()
            setLocalProjects(nextLocalProjects.map((project) => ({
                ...project,
                role: 'owner',
                members: [],
                is_local: true,
                storage_mode: 'local-only',
            })))
        } catch (error) {
            console.error('Failed to load local projects:', error)
            setLocalProjects([])
        } finally {
            setLocalProjectsLoaded(true)
        }
    }, [])

    useEffect(() => {
        void refreshLocalProjects()
    }, [refreshLocalProjects])

    useEffect(() => {
        setOrderedActive([...projects, ...localProjects.filter((project) => !project.deleted_at)])
    }, [localProjects, projects])

    useEffect(() => {
        setOrderedTrash([...deletedProjects, ...localProjects.filter((project) => !!project.deleted_at)])
    }, [deletedProjects, localProjects])

    useEffect(() => {
        const saved = localStorage.getItem('storyline-new-project-draft')
        if (saved) {
            try {
                setDraft(JSON.parse(saved))
            } catch (e) {
                console.error("Failed to parse draft", e)
            }
        }
    }, [])

    useEffect(() => {
        const supabase = createClient()
        const channel = supabase
            .channel('library-memberships')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'project_members',
            }, () => {
                router.refresh()
            })
            .subscribe()

        return () => {
            void supabase.removeChannel(channel)
        }
    }, [router])

    function clearDraft() {
        localStorage.removeItem('storyline-new-project-draft')
        localStorage.removeItem('storyline-guided-data-draft')
        setDraft(null)
        setConfirmDeleteDraft(false)
    }

    // Helper to get sorted projects for display
    function getSortedProjects(projectsToSort: Project[]) {
        if (sortFilter === 'recent') {
            return [...projectsToSort].sort((a, b) => 
                (b.last_accessed_at || b.created_at || '').localeCompare(a.last_accessed_at || a.created_at || '')
            )
        }
        if (sortFilter === 'az') {
            return [...projectsToSort].sort((a, b) => {
                const titleA = a.title || ''
                const titleB = b.title || ''
                return titleA.localeCompare(titleB)
            })
        }
        // Custom is already ordered by order_index from the server/parent
        return projectsToSort
    }

    async function onDragEnd(result: DropResult) {
        if (!result.destination) return
        if (sortFilter !== 'custom') return

        const sourceList = view === 'active' ? orderedActive : orderedTrash
        const setSourceList = view === 'active' ? setOrderedActive : setOrderedTrash
        
        const items = Array.from(sourceList)
        const [reorderedItem] = items.splice(result.source.index, 1)
        items.splice(result.destination.index, 0, reorderedItem)

        // Calculate new order index (floating point strategy)
        let newIndex: number
        if (items.length === 1) {
            newIndex = 1
        } else if (result.destination.index === 0) {
            newIndex = (items[1].order_index || 0) - 1
        } else if (result.destination.index === items.length - 1) {
            newIndex = (items[items.length - 2].order_index || 0) + 1
        } else {
            const prev = items[result.destination.index - 1].order_index || 0
            const next = items[result.destination.index + 1].order_index || 0
            newIndex = (prev + next) / 2
        }

        // Optimistic update
        reorderedItem.order_index = newIndex
        setSourceList(items)

        if (isLocalProjectId(reorderedItem.id)) {
            await updateLocalProject(reorderedItem.id, { order_index: newIndex })
            await refreshLocalProjects()
        } else {
            const supabase = createClient()
            await supabase.from('projects')
                .update({ order_index: newIndex } as any)
                .eq('id', reorderedItem.id)
            
            router.refresh()
        }
    }

    if (localProjectsLoaded && orderedActive.length === 0 && !draft) {
        return (
            <div className="library-grid-shell max-w-[1440px] mx-auto px-6 py-24 text-center fade-in">
                <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8", isMidnight ? "bg-slate-800/80 border border-slate-700/60" : "bg-stone-100")}>
                    <BookOpen className="w-10 h-10 text-stone-400" />
                </div>
                <h2 className={cn("text-3xl font-serif mb-4", isMidnight ? "text-slate-100" : "text-slate-800")}>Start your first project</h2>
                <p className={cn("text-lg mb-10 max-w-md mx-auto font-medium leading-relaxed", isMidnight ? "text-slate-400" : "text-slate-500")}>
                    Create a Book or Screenplay and begin writing your next masterpiece.
                </p>
                <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4">
                    <Link href="/new">
                        <Button className="sanctuary-btn-primary h-14 px-10 rounded-full text-base font-semibold gap-3 shadow-xl hover:shadow-primary/20 transition-all active:scale-[0.98]">
                            <Plus className="w-5 h-5" /> Start New Project
                        </Button>
                    </Link>
                    {showTransferGuidance && (
                        <LocalTransferGuidance
                            className="w-full text-left"
                            cloudSyncHref="/help?q=cloud%20sync"
                            onDismiss={() => {
                                setShowTransferGuidance(false)
                                localStorage.setItem(transferGuidanceDismissKey, 'true')
                            }}
                        />
                    )}
                    <div className="w-full">
                        <ImportBackupButton currentUserId={currentUserId} className="w-full md:w-auto" showTransferGuidance={false} />
                    </div>
                </div>
            </div>
        )
    }

    const currentProjects = getSortedProjects(view === 'active' ? orderedActive : orderedTrash)

    return (
        <TooltipProvider>
            <div className="library-grid-shell max-w-[1440px] mx-auto px-5 py-12 sm:px-6 sm:py-16 lg:py-24">
                <div className={cn("flex flex-col gap-8 mb-14 pb-10 lg:flex-row lg:items-end lg:justify-between lg:gap-12 lg:mb-20 lg:pb-12", isMidnight ? "border-b border-slate-700/50" : "border-b border-slate-100")}>
                    <div className="max-w-2xl space-y-4">
                        <motion.h1 
                            key={view}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn("text-4xl sm:text-5xl xl:text-7xl font-serif tracking-tight leading-[0.92]", isMidnight ? "text-slate-100" : "text-slate-800")}
                        >
                            {view === 'active' ? (
                                <>The Manuscript<br /><span className={isMidnight ? "text-slate-500" : "text-slate-400"}>Archive</span></>
                            ) : (
                                <>The Recovery<br /><span className={isMidnight ? "text-red-300/80" : "text-red-400"}>Vault</span></>
                            )}
                        </motion.h1>
                        <p className={cn("text-base sm:text-lg max-w-md font-medium", isMidnight ? "text-slate-400" : "text-slate-500")}>
                            {view === 'active' 
                                ? "Your creative sanctuary. Select a project below or start a new journey."
                                : "Recover deleted projects here. Items are kept for 60 days before permanent deletion."
                            }
                        </p>
                    </div>
                    <div className="w-full lg:ml-auto lg:max-w-3xl">
                        <div className="flex flex-col gap-3 sm:gap-4 lg:items-end">
                            <div className="flex items-stretch gap-3 w-full lg:w-auto sm:gap-4">
                                <div className={cn("p-1.5 rounded-full flex gap-1 min-w-0 flex-1 lg:flex-none", isMidnight ? "bg-slate-800/80 border border-slate-700/60" : "bg-slate-100")}>
                                <button 
                                    onClick={() => setView('active')}
                                    className={cn(
                                        "px-5 sm:px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all flex-1 lg:flex-none",
                                        view === 'active'
                                            ? (isMidnight ? "bg-slate-700/90 text-slate-100 shadow-sm" : "bg-white text-slate-800 shadow-sm")
                                            : (isMidnight ? "text-slate-400 hover:text-slate-200" : "text-slate-400 hover:text-slate-600")
                                    )}
                                >
                                    Active
                                </button>
                                <button 
                                    onClick={() => setView('trash')}
                                    className={cn(
                                        "px-5 sm:px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 flex-1 lg:flex-none",
                                        view === 'trash'
                                            ? (isMidnight ? "bg-slate-700/90 text-red-300 shadow-sm" : "bg-white text-red-500 shadow-sm")
                                            : (isMidnight ? "text-slate-400 hover:text-red-300" : "text-slate-400 hover:text-red-400")
                                    )}
                                >
                                    Trash
                                    {deletedProjects.length > 0 && (
                                        <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px]">
                                            {deletedProjects.length}
                                        </span>
                                    )}
                                </button>
                            </div>

                            <DropdownMenu>
                                <DropdownMenuTrigger className={cn(
                                    buttonVariants({ variant: "ghost" }),
                                    `h-14 w-14 sm:w-auto min-w-0 px-0 sm:px-6 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] gap-0 sm:gap-3 shrink-0 ${
                                        isMidnight
                                            ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70 border border-slate-700/60'
                                            : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100 border border-slate-100'
                                    }`
                                )}>
                                    <ArrowUpDown className="w-4 h-4" />
                                    <span className="sr-only sm:not-sr-only sm:inline">Sort</span>
                                    <span className="hidden lg:inline">: {sortFilter === 'custom' ? 'Custom' : sortFilter === 'recent' ? 'Recent' : 'A-Z'}</span>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className={cn("w-56 rounded-3xl shadow-2xl p-2 backdrop-blur-xl", isMidnight ? "border-slate-700/60 bg-[#182239]/96" : "border-stone-100 bg-white/80")}>
                                    <DropdownMenuItem onClick={() => setSortFilter('custom')} className={cn("gap-3 text-xs font-bold uppercase tracking-widest py-4 rounded-2xl cursor-pointer transition-colors", isMidnight ? "hover:bg-white/6 text-slate-300" : "hover:bg-slate-50 text-slate-600")}>
                                        <LayoutGrid className="w-4 h-4" /> Custom Order
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setSortFilter('recent')} className={cn("gap-3 text-xs font-bold uppercase tracking-widest py-4 rounded-2xl cursor-pointer transition-colors", isMidnight ? "hover:bg-white/6 text-slate-300" : "hover:bg-slate-50 text-slate-600")}>
                                        <Calendar className="w-4 h-4" /> Recently Used
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setSortFilter('az')} className={cn("gap-3 text-xs font-bold uppercase tracking-widest py-4 rounded-2xl cursor-pointer transition-colors", isMidnight ? "hover:bg-white/6 text-slate-300" : "hover:bg-slate-50 text-slate-600")}>
                                        <ArrowUpDown className="w-4 h-4" /> Alphabetical
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            </div>

                            <div className="flex w-full flex-col gap-3 sm:gap-4 lg:w-auto lg:flex-row lg:flex-wrap lg:justify-end">
                                <ImportBackupButton currentUserId={currentUserId} />

                                <Link href="/new" className="w-full lg:w-auto">
                                    <Button className="sanctuary-btn-primary h-14 w-full lg:w-auto justify-center px-5 sm:px-8 rounded-full text-sm sm:text-base font-semibold gap-2 sm:gap-3 shadow-xl hover:shadow-primary/20">
                                        <Plus className="w-5 h-5" />
                                        <span className="sm:hidden">New Project</span>
                                        <span className="hidden sm:inline">Start New Project</span>
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {view === 'trash' && deletedProjects.length === 0 ? (
                        <motion.div 
                            key="empty-trash"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="py-32 text-center"
                        >
                            <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 border", isMidnight ? "bg-slate-800/80 border-slate-700/60" : "bg-slate-50 border-slate-100")}>
                                <Trash2 className="w-10 h-10 text-slate-300" />
                            </div>
                            <h2 className={cn("text-2xl font-serif mb-2", isMidnight ? "text-slate-100" : "text-slate-800")}>Trash is empty</h2>
                            <p className="text-slate-400 font-medium">No projects are currently marked for deletion.</p>
                        </motion.div>
                    ) : (
                        <DragDropContext onDragEnd={onDragEnd}>
                            <Droppable droppableId={`projects-${view}`} direction="vertical">
                                {(provided) => (
                                    <motion.div 
                                        layout
                                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                    >
                                        {view === 'active' && draft && (
                                            <motion.div
                                                layout
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                            >
                                                <div className="group sanctuary-card border-2 border-dashed border-primary/20 bg-primary/5 rounded-[2rem] p-8 h-full transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl relative overflow-hidden active:scale-[0.98]">
                                                    <Link href="/new" className="absolute inset-0 z-10" />
                                                    <div className="relative z-20 flex flex-col h-full gap-6">
                                                        <div className="flex items-start justify-between">
                                                            <div className="w-14 h-14 rounded-2xl bg-primary shadow-lg shadow-primary/20 text-white flex items-center justify-center">
                                                                <Sparkles className="w-7 h-7" />
                                                            </div>
                                                            <div className="relative z-30 flex items-center gap-2 pointer-events-auto">
                                                                <Badge variant="default" className="bg-primary/10 text-primary border-none text-[9px] uppercase tracking-widest px-3 py-1 font-bold">
                                                                    Incomplete Setup
                                                                </Badge>
                                                                {confirmDeleteDraft ? (
                                                                    <div
                                                                        onClick={e => e.preventDefault()}
                                                                        className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200"
                                                                    >
                                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                                                                            Delete?
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={e => {
                                                                                e.preventDefault()
                                                                                e.stopPropagation()
                                                                                setConfirmDeleteDraft(false)
                                                                            }}
                                                                            className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={e => {
                                                                                e.preventDefault()
                                                                                e.stopPropagation()
                                                                                clearDraft()
                                                                            }}
                                                                            className="px-3 py-1 text-[10px] font-bold bg-red-500 hover:bg-red-600 text-white rounded-full uppercase tracking-wider transition-colors shadow-lg"
                                                                        >
                                                                            Delete
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={e => {
                                                                            e.preventDefault()
                                                                            e.stopPropagation()
                                                                            setConfirmDeleteDraft(true)
                                                                        }}
                                                                        className="transition-all duration-300 p-2.5 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 shadow-sm"
                                                                        aria-label="Delete incomplete setup"
                                                                    >
                                                                        <Trash2 className="w-5 h-5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2 flex-1">
                                                            <h3 className="text-2xl font-serif text-slate-800">
                                                                Resume your setup
                                                            </h3>
                                                            <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                                                You have an unfinished {getProjectTypeLabel(draft.state.type).toLowerCase()}. Pick up where you left off.
                                                            </p>
                                                        </div>
                                                        <div className="mt-4 flex items-center justify-between gap-4 pt-6 border-t border-primary/10">
                                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                                                Saved draft
                                                            </span>
                                                            <div className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest group-hover:bg-[#3d4a3d] transition-all shadow-md">
                                                                Resume <ChevronRight className="w-4 h-4" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}

                                        <AnimatePresence>
                                            {currentProjects.map((project, index) => (
                                                <Draggable 
                                                    key={project.id} 
                                                    draggableId={project.id} 
                                                    index={index}
                                                    isDragDisabled={sortFilter !== 'custom'}
                                                >
                                                    {(dragProvided, snapshot) => (
                                                        <motion.div
                                                            layout
                                                            initial={{ opacity: 0, scale: 0.9 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.8 }}
                                                            transition={{
                                                                layout: { type: "spring", stiffness: 300, damping: 30 },
                                                                opacity: { duration: 0.2 }
                                                            }}
                                                            ref={dragProvided.innerRef}
                                                            {...dragProvided.draggableProps}
                                                            className={cn(
                                                                "h-full outline-hidden",
                                                                snapshot.isDragging && "z-50"
                                                            )}
                                                        >
                                                            <ProjectCard 
                                                                project={project} 
                                                                mode={view} 
                                                                dragHandleProps={sortFilter === 'custom' ? dragProvided.dragHandleProps : undefined}
                                                                isDragging={snapshot.isDragging}
                                                                onLocalProjectChange={refreshLocalProjects}
                                                            />
                                                        </motion.div>
                                                    )}
                                                </Draggable>
                                            ))}
                                        </AnimatePresence>
                                        {provided.placeholder}
                                    </motion.div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    )}
                </AnimatePresence>
                
                <div className={cn("mt-24 pt-8 flex flex-col md:flex-row justify-between items-center gap-6 opacity-40 hover:opacity-100 transition-opacity", isMidnight ? "border-t border-slate-700/50" : "border-t border-slate-100")}>
                    <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400">© 2026 Storyline — Built for Authors</p>
                    <div className="flex gap-8">
                        <Link href="/terms" className="text-[10px] font-bold tracking-widest uppercase text-slate-400 hover:text-[#546354] transition-colors">Terms</Link>
                        <Link href="/privacy" className="text-[10px] font-bold tracking-widest uppercase text-slate-400 hover:text-[#546354] transition-colors">Privacy</Link>
                        <Link href="/ai-disclaimer" className="text-[10px] font-bold tracking-widest uppercase text-slate-400 hover:text-[#546354] transition-colors">AI Disclaimer</Link>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    )
}

function ProjectCard({ project, mode = 'active', dragHandleProps, isDragging, onLocalProjectChange }: { 
    project: Project, 
    mode?: 'active' | 'trash', 
    dragHandleProps?: any,
    isDragging?: boolean,
    onLocalProjectChange?: () => Promise<void>
}) {
    const router = useRouter()
    const resolvedProjectType = project.project_type || project.type
    const isTV = resolvedProjectType === 'tv_script'
    const isLocalProject = project.storage_mode === 'local-only' || isLocalProjectId(project.id)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [isActionInProgress, setIsActionInProgress] = useState(false)
    const [isEditingCover, setIsEditingCover] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const hasCover = !!project.cover_url
    const members = project.members || []
    const activeCollaborators = members.filter(member => member.role !== 'owner')
    const visibleMembers = activeCollaborators.length > 0 ? members : []
    const isShared = activeCollaborators.length > 0
    const cardDescription = project.premise || (project as any).export_metadata?.description || ''
    const hasDragHandle = !!dragHandleProps

    async function handleDelete(e: React.MouseEvent) {
        e.preventDefault()
        e.stopPropagation()
        setIsActionInProgress(true)

        if (isLocalProject) {
            if (mode === 'active') {
                await softDeleteLocalProject(project.id)
            } else {
                await destroyLocalProject(project.id)
            }
            await onLocalProjectChange?.()
        } else {
            const supabase = createClient()
            
            if (mode === 'active') {
                await supabase.from('projects').update({ deleted_at: new Date().toISOString() }).eq('id', project.id)
            } else {
                await supabase.from('projects').delete().eq('id', project.id)
            }
            
            router.refresh()
        }
    }

    async function handleRestore(e: React.MouseEvent) {
        e.preventDefault()
        e.stopPropagation()
        setIsActionInProgress(true)
        if (isLocalProject) {
            await restoreLocalProject(project.id)
            await onLocalProjectChange?.()
        } else {
            const supabase = createClient()
            await supabase.from('projects').update({ deleted_at: null }).eq('id', project.id)
            router.refresh()
        }
    }

    return (
        <div
            className={cn(
                "group block sanctuary-card rounded-[2rem] transition-all duration-700 relative overflow-hidden min-h-[420px] h-full flex flex-col",
                mode === 'active' ? "hover:-translate-y-2 hover:shadow-2xl active:scale-[0.98]" : "opacity-80 hover:opacity-100 bg-slate-50/50 grayscale hover:grayscale-0",
                !hasCover && "p-8 border border-slate-100 bg-white shadow-sm",
                isDragging && "shadow-2xl ring-2 ring-primary ring-offset-4 scale-105 rotate-2"
            )}
        >
            <Link href={mode === 'active' ? `/project/${project.id}/story` : '#'} className={cn(
                "absolute inset-0 z-10 cursor-pointer",
                mode === 'trash' && "cursor-default"
            )} />

            {hasCover && project.cover_url && (
                <div className="absolute inset-0 z-0">
                    <img 
                        src={project.cover_url} 
                        alt={project.title || 'Project cover'} 
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-[3000ms] group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/95 transition-opacity duration-700 group-hover:opacity-80" />
                </div>
            )}

            <div className={cn(
                "relative z-20 flex flex-col h-full flex-1 pointer-events-none",
                hasCover ? "p-8 justify-end" : ""
            )}>
                <div className={cn(
                    "mb-8 flex items-start justify-between gap-4 sm:gap-5",
                    hasCover ? "absolute top-8 left-8 right-8" : ""
                )}>
                    <div className={cn(
                        "flex min-w-0 items-center sm:gap-4",
                        hasDragHandle ? "gap-2.5" : "gap-3"
                    )}>
                        {hasDragHandle && (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center sm:h-11 sm:w-11">
                                <div 
                                    {...dragHandleProps}
                                    className={cn(
                                        "pointer-events-auto rounded-xl p-2 transition-all cursor-grab active:cursor-grabbing sm:p-2.5",
                                        hasCover ? "bg-white/10 text-white/40 hover:text-white" : "text-slate-300 hover:text-slate-500"
                                    )}
                                    aria-label="Reorder project"
                                >
                                    <GripVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                                </div>
                            </div>
                        )}
                        <div className={cn(
                            "shrink-0 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm",
                            hasDragHandle ? "h-12 w-12 sm:h-14 sm:w-14" : "h-14 w-14",
                            hasCover 
                                ? "bg-white/10 backdrop-blur-md text-white border border-white/20 group-hover:bg-white/20"
                                : (isTV ? "bg-stone-50 text-stone-600 group-hover:bg-primary/10 group-hover:text-primary" : "bg-stone-50 text-stone-500 group-hover:bg-primary/10 group-hover:text-primary")
                        )}>
                            {isTV ? <Film className="h-6 w-6 sm:h-7 sm:w-7" /> : <BookOpen className="h-6 w-6 sm:h-7 sm:w-7" />}
                        </div>
                    </div>

                    {project.role === 'owner' && (
                        <div className="relative z-30 pointer-events-auto">
                            {confirmDelete ? (
                                <div
                                    onClick={e => e.preventDefault()}
                                    className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200"
                                >
                                    <span className={cn("text-[10px] font-bold uppercase tracking-wider", hasCover ? "text-white/60" : "text-red-400")}>
                                        {mode === 'active' ? 'Delete?' : 'Destroy?'}
                                    </span>
                                    <button
                                        onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(false) }}
                                        className={cn("px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors", hasCover ? "text-white/40 hover:text-white" : "text-slate-400 hover:text-slate-600")}
                                    >Cancel</button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={isActionInProgress}
                                        className="px-3 py-1 text-[10px] font-bold bg-red-500 hover:bg-red-600 text-white rounded-full uppercase tracking-wider transition-colors shadow-lg disabled:opacity-50"
                                    >{isActionInProgress ? '...' : (mode === 'active' ? 'Delete' : 'Destroy')}</button>
                                </div>
                            ) : (
                                <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
                                    {mode === 'trash' && (
                                        <button
                                            onClick={handleRestore}
                                            disabled={isActionInProgress}
                                            className={cn(
                                                "p-2.5 rounded-xl transition-all shadow-sm",
                                                hasCover ? "bg-white/10 backdrop-blur-md text-white/60 hover:text-white hover:bg-white/20 border border-white/10" : "text-slate-400 hover:text-primary hover:bg-primary/10"
                                            )}
                                        >
                                            <Sparkles className="w-5 h-5" />
                                        </button>
                                    )}
                                    {mode === 'active' && !isLocalProject && (
                                        <>
                                            <button
                                                onClick={e => { e.preventDefault(); e.stopPropagation(); setIsSettingsOpen(true) }}
                                                className={cn(
                                                    "transition-all duration-300 p-2.5 rounded-xl shadow-sm",
                                                    hasCover 
                                                        ? "bg-white/10 backdrop-blur-md text-white/40 hover:text-white hover:bg-white/30 border border-white/10" 
                                                        : "opacity-0 group-hover:opacity-100 text-slate-300 hover:text-primary hover:bg-primary/10"
                                                )}
                                                title="Edit project details"
                                            >
                                                <Pencil className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={e => { e.preventDefault(); e.stopPropagation(); setIsEditingCover(true) }}
                                                className={cn(
                                                    "transition-all duration-300 p-2.5 rounded-xl shadow-sm",
                                                    hasCover 
                                                        ? "bg-white/10 backdrop-blur-md text-white/40 hover:text-white hover:bg-white/30 border border-white/10" 
                                                        : "opacity-0 group-hover:opacity-100 text-slate-300 hover:text-primary hover:bg-primary/10"
                                                )}
                                                title="Change Cover"
                                            >
                                                <Palette className="w-5 h-5" />
                                            </button>
                                        </>
                                    )}
                                    <button
                                        onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(true) }}
                                        className={cn(
                                            "transition-all duration-300 p-2.5 rounded-xl shadow-sm",
                                            hasCover 
                                                ? "bg-white/10 backdrop-blur-md text-white/40 hover:text-red-400 hover:bg-red-500/20 border border-white/10" 
                                                : cn("transition-all duration-300 p-2.5 rounded-xl", mode === 'active' ? "opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 hover:bg-red-50" : "text-slate-300 hover:text-red-600 hover:bg-red-50")
                                        )}
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className={cn("space-y-3", hasCover && "mt-auto")}>
                    <h3 className={cn(
                        "text-2xl font-serif leading-snug transition-colors duration-500",
                        hasCover ? "text-white" : "text-slate-800 group-hover:text-primary"
                    )}>
                        {project.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3">
                        <span className={cn(
                            "text-[10px] font-bold uppercase tracking-[0.2em] px-2.5 py-1 rounded-md transition-colors border",
                            hasCover 
                                ? "bg-white/5 backdrop-blur-md text-white/70 border-white/10 group-hover:bg-white/10" 
                                : "bg-slate-50 text-slate-400 border-transparent group-hover:bg-primary/5 group-hover:text-primary/60"
                        )}>
                            {getProjectTypeLabel(resolvedProjectType as any)}
                        </span>
                        
                        {project.role === 'owner' && (
                             <Badge variant="outline" className={cn(
                                 "text-[9px] uppercase tracking-wider py-0 px-2 font-bold",
                                 hasCover ? "border-white/20 text-white/60 bg-white/5 backdrop-blur-md" : "border-amber-100 text-amber-600 bg-amber-50/30"
                             )}>
                                Owner
                            </Badge>
                        )}
                        {isLocalProject ? (
                             <Badge variant="outline" className={cn(
                                 "text-[9px] uppercase tracking-wider py-0 px-2 font-bold",
                                 hasCover ? "border-white/20 text-white/60 bg-white/5 backdrop-blur-md" : "border-emerald-100 text-emerald-600 bg-emerald-50/30"
                             )}>
                                Local Only
                            </Badge>
                        ) : (
                            <Badge variant="outline" className={cn(
                                "text-[9px] uppercase tracking-wider py-0 px-2 font-bold",
                                hasCover ? "border-white/20 text-white/60 bg-white/5 backdrop-blur-md" : "border-sky-100 text-sky-600 bg-sky-50/30"
                            )}>
                                Cloud Sync
                            </Badge>
                        )}

                        <span className={cn(
                            "text-xs font-medium flex items-center gap-1.5",
                            hasCover ? "text-white/80" : "text-slate-400"
                        )}>
                            <Clock className={cn("w-3.5 h-3.5", hasCover ? "text-white/70" : "text-slate-400")} />
                            <span className={cn("font-medium", hasCover ? "text-white/70" : "text-slate-400")}>Last accessed:</span>
                            {isMounted ? <span className={cn(hasCover ? "text-white/80" : "text-slate-500")}>{formatDistanceToNow(project.last_accessed_at || new Date().toISOString()) + ' ago'}</span> : '...'}
                        </span>
                    </div>

                    {cardDescription && (
                        <p className={cn(
                            "mt-6 text-sm leading-relaxed line-clamp-2 italic font-serif transition-colors duration-500",
                            hasCover ? "text-white/60 group-hover:text-white/80" : "text-slate-500"
                        )}>
                            &ldquo;{cardDescription}&rdquo;
                        </p>
                    )}
                </div>

                <div className={cn(
                    "mt-10 pt-6 flex items-center justify-between",
                    hasCover ? "border-t border-white/10" : "border-t border-slate-50"
                )}>
                    <div className="flex items-center gap-4">
                        {isShared && mode === 'active' ? (
                            <div className="flex items-center -space-x-2 pointer-events-auto">
                                {visibleMembers.slice(0, 4).map((member) => (
                                    <Tooltip key={member.user_id}>
                                        <TooltipTrigger>
                                            <Avatar className={cn(
                                                "w-7 h-7 border-2 ring-2 ring-white",
                                                hasCover ? "border-black/50 ring-white/10" : "border-white ring-slate-50",
                                                "transition-transform hover:scale-110 hover:z-30 cursor-default"
                                            )}>
                                                <AvatarImage src={member.avatar_url || undefined} />
                                                <AvatarFallback className={cn(
                                                    "text-[8px] font-bold uppercase",
                                                    hasCover ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                                                )}>
                                                    {getAvatarInitials(member.display_name)}
                                                </AvatarFallback>
                                            </Avatar>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="bg-slate-900 text-white border-none rounded-xl px-3 py-1.5">
                                            <p className="text-[10px] font-bold uppercase tracking-widest">{member.display_name}</p>
                                            <p className="text-[8px] opacity-50 uppercase tracking-widest">{member.role}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                ))}
                                {visibleMembers.length > 4 && (
                                    <div className={cn(
                                        "w-7 h-7 rounded-full flex items-center justify-center border-2 text-[8px] font-bold z-0",
                                        hasCover ? "bg-white/10 border-black/50 text-white" : "bg-slate-50 border-white text-slate-400"
                                    )}>
                                        +{visibleMembers.length - 4}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <span className={cn("text-[10px] font-bold uppercase tracking-widest flex items-center gap-2", hasCover ? "text-white/30" : "text-slate-400")}>
                                {mode === 'trash' && project.deleted_at ? (
                                    <span className="text-red-400 flex items-center gap-1.5">
                                        <Clock className="w-3 h-3" />
                                        Deleted {isMounted ? formatDistanceToNow(project.deleted_at) + ' ago' : '...'}
                                    </span>
                                ) : (
                                    <span className={cn(hasCover ? "text-white/70" : "text-slate-400")}>Private Draft</span>
                                )}
                            </span>
                        )}
                    </div>
                    {mode === 'active' && (
                        <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-700 transform group-hover:rotate-[-45deg] shadow-lg",
                            hasCover 
                                ? "bg-white/10 backdrop-blur-md text-white/50 group-hover:bg-white group-hover:text-primary" 
                                : "bg-slate-50 text-slate-300 group-hover:bg-primary group-hover:text-white"
                        )}>
                            <ChevronRight className="w-5 h-5" />
                        </div>
                    )}
                </div>
            </div>

            {!hasCover && (
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 transition-all duration-700 bg-stone-50/50 group-hover:bg-primary/5" />
            )}

            {!isLocalProject && (
                <>
                    <CoverEditModal 
                        project={{
                            id: project.id,
                            title: project.title || '',
                            cover_url: project.cover_url || ''
                        }}
                        isOpen={isEditingCover}
                        onOpenChange={setIsEditingCover}
                    />

                    <ProjectSettingsModal
                        open={isSettingsOpen}
                        onOpenChange={setIsSettingsOpen}
                        project={project}
                        role={project.role ?? 'owner'}
                    />
                </>
            )}
        </div>
    )
}
