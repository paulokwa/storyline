'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
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
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { motion, AnimatePresence } from 'framer-motion'

// Explicitly extend the Project type with fields added via recent migrations
type Project = Database['public']['Tables']['projects']['Row'] & {
    role?: 'owner' | 'editor' | 'viewer'
    order_index?: number | null
    cover_url?: string | null
    members?: Array<{
        user_id: string
        role: string
        display_name: string | null
        avatar_url: string | null
    }>
}

export default function ProjectGrid({ projects, deletedProjects }: { projects: Project[], deletedProjects: Project[] }) {
    const router = useRouter()
    const [draft, setDraft] = useState<{ state: any; step: any } | null>(null)
    const [view, setView] = useState<'active' | 'trash'>('active')
    const [sortFilter, setSortFilter] = useState<'custom' | 'recent' | 'az'>('custom')
    
    // Local state for dragging
    const [orderedActive, setOrderedActive] = useState<Project[]>(projects)
    const [orderedTrash, setOrderedTrash] = useState<Project[]>(deletedProjects)

    useEffect(() => {
        setOrderedActive(projects)
    }, [projects])

    useEffect(() => {
        setOrderedTrash(deletedProjects)
    }, [deletedProjects])

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

    function clearDraft(e: React.MouseEvent) {
        e.preventDefault()
        e.stopPropagation()
        localStorage.removeItem('storyline-new-project-draft')
        localStorage.removeItem('storyline-guided-data-draft')
        setDraft(null)
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

        // Persist to DB
        const supabase = createClient()
        await supabase.from('projects')
            .update({ order_index: newIndex } as any)
            .eq('id', reorderedItem.id)
        
        router.refresh()
    }

    if (projects.length === 0 && !draft) {
        return (
            <div className="max-w-[1440px] mx-auto px-6 py-24 text-center fade-in">
                <div className="w-20 h-20 bg-stone-100 rounded-3xl flex items-center justify-center mx-auto mb-8">
                    <BookOpen className="w-10 h-10 text-stone-400" />
                </div>
                <h2 className="text-3xl font-serif text-slate-800 mb-4">Start your first project</h2>
                <p className="text-slate-500 text-lg mb-10 max-w-md mx-auto font-medium leading-relaxed">
                    Create a Book or Screenplay and begin writing your next masterpiece.
                </p>
                <Link href="/new">
                    <Button className="sanctuary-btn-primary h-14 px-10 rounded-full text-base font-semibold gap-3 shadow-xl hover:shadow-primary/20 transition-all active:scale-[0.98]">
                        <Plus className="w-5 h-5" /> Start New Project
                    </Button>
                </Link>
            </div>
        )
    }

    const currentProjects = getSortedProjects(view === 'active' ? orderedActive : orderedTrash)

    return (
        <TooltipProvider>
            <div className="max-w-[1440px] mx-auto px-6 py-16 md:py-24">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20 border-b border-slate-100 pb-12">
                    <div className="space-y-4">
                        <motion.h1 
                            key={view}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-5xl md:text-7xl font-serif text-slate-800 tracking-tight leading-tight"
                        >
                            {view === 'active' ? (
                                <>The Manuscript<br /><span className="text-slate-400">Archive</span></>
                            ) : (
                                <>The Recovery<br /><span className="text-red-400">Vault</span></>
                            )}
                        </motion.h1>
                        <p className="text-lg text-slate-500 max-w-sm font-medium">
                            {view === 'active' 
                                ? "Your creative sanctuary. Select a project below or start a new journey."
                                : "Recover deleted projects here. Items are kept for 60 days before permanent deletion."
                            }
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-slate-100 p-1.5 rounded-full flex gap-1">
                            <button 
                                onClick={() => setView('active')}
                                className={cn(
                                    "px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all",
                                    view === 'active' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                Active
                            </button>
                            <button 
                                onClick={() => setView('trash')}
                                className={cn(
                                    "px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                                    view === 'trash' ? "bg-white text-red-500 shadow-sm" : "text-slate-400 hover:text-red-400"
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
                                "h-14 px-6 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-slate-800 hover:bg-slate-100 gap-3 border border-slate-100"
                            )}>
                                <ArrowUpDown className="w-4 h-4" />
                                Sort: {sortFilter === 'custom' ? 'Custom' : sortFilter === 'recent' ? 'Recent' : 'A-Z'}
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-3xl border-stone-100 shadow-2xl p-2 bg-white/80 backdrop-blur-xl">
                                <DropdownMenuItem onClick={() => setSortFilter('custom')} className="gap-3 text-xs font-bold uppercase tracking-widest py-4 rounded-2xl cursor-pointer hover:bg-slate-50 text-slate-600 transition-colors">
                                    <LayoutGrid className="w-4 h-4" /> Custom Order
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortFilter('recent')} className="gap-3 text-xs font-bold uppercase tracking-widest py-4 rounded-2xl cursor-pointer hover:bg-slate-50 text-slate-600 transition-colors">
                                    <Calendar className="w-4 h-4" /> Recently Used
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortFilter('az')} className="gap-3 text-xs font-bold uppercase tracking-widest py-4 rounded-2xl cursor-pointer hover:bg-slate-50 text-slate-600 transition-colors">
                                    <ArrowUpDown className="w-4 h-4" /> Alphabetical
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Link href="/new">
                            <Button className="sanctuary-btn-primary h-14 px-8 rounded-full text-base font-semibold gap-3">
                                <Plus className="w-5 h-5" /> Start New Project
                            </Button>
                        </Link>
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
                            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-slate-100">
                                <Trash2 className="w-10 h-10 text-slate-300" />
                            </div>
                            <h2 className="text-2xl font-serif text-slate-800 mb-2">Trash is empty</h2>
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
                                                <Link
                                                    href="/new"
                                                    className="group block sanctuary-card border-2 border-dashed border-primary/20 bg-primary/5 rounded-[2rem] p-8 h-full transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl relative overflow-hidden active:scale-[0.98]"
                                                >
                                                    <div className="relative z-10 flex flex-col h-full gap-6">
                                                        <div className="flex items-start justify-between">
                                                            <div className="w-14 h-14 rounded-2xl bg-primary shadow-lg shadow-primary/20 text-white flex items-center justify-center">
                                                                <Sparkles className="w-7 h-7" />
                                                            </div>
                                                            <Badge variant="default" className="bg-primary/10 text-primary border-none text-[9px] uppercase tracking-widest px-3 py-1 font-bold">
                                                                Incomplete Setup
                                                            </Badge>
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
                                                            <button 
                                                                onClick={clearDraft}
                                                                className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors py-2"
                                                            >
                                                                Start over
                                                            </button>
                                                            <div className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest group-hover:bg-[#3d4a3d] transition-all shadow-md">
                                                                Resume <ChevronRight className="w-4 h-4" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Link>
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
                
                <div className="mt-24 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 opacity-40 hover:opacity-100 transition-opacity">
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

function ProjectCard({ project, mode = 'active', dragHandleProps, isDragging }: { 
    project: Project, 
    mode?: 'active' | 'trash', 
    dragHandleProps?: any,
    isDragging?: boolean
}) {
    const router = useRouter()
    const isTV = project.project_type === 'tv_script'
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [isActionInProgress, setIsActionInProgress] = useState(false)
    const [isEditingCover, setIsEditingCover] = useState(false)
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const hasCover = !!project.cover_url
    const members = project.members || []
    const isShared = members.length > 1

    async function handleDelete(e: React.MouseEvent) {
        e.preventDefault()
        e.stopPropagation()
        setIsActionInProgress(true)
        const supabase = createClient()
        
        if (mode === 'active') {
            await supabase.from('projects').update({ deleted_at: new Date().toISOString() }).eq('id', project.id)
        } else {
            await supabase.from('projects').delete().eq('id', project.id)
        }
        
        router.refresh()
    }

    async function handleRestore(e: React.MouseEvent) {
        e.preventDefault()
        e.stopPropagation()
        setIsActionInProgress(true)
        const supabase = createClient()
        await supabase.from('projects').update({ deleted_at: null }).eq('id', project.id)
        router.refresh()
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
                    "flex items-start justify-between mb-8",
                    hasCover ? "absolute top-8 left-8 right-8" : ""
                )}>
                    <div className="flex items-center gap-3">
                        {dragHandleProps && (
                            <div 
                                {...dragHandleProps}
                                className={cn(
                                    "p-2.5 rounded-xl transition-all cursor-grab active:cursor-grabbing pointer-events-auto",
                                    hasCover ? "bg-white/10 text-white/40 hover:text-white" : "text-slate-300 hover:text-slate-500"
                                )}
                            >
                                <GripVertical className="w-5 h-5" />
                            </div>
                        )}
                        <div className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm",
                            hasCover 
                                ? "bg-white/10 backdrop-blur-md text-white border border-white/20 group-hover:bg-white/20"
                                : (isTV ? "bg-stone-50 text-stone-600 group-hover:bg-primary/10 group-hover:text-primary" : "bg-stone-50 text-stone-500 group-hover:bg-primary/10 group-hover:text-primary")
                        )}>
                            {isTV ? <Film className="w-7 h-7" /> : <BookOpen className="w-7 h-7" />}
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
                                <div className="flex items-center gap-2">
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
                                    {mode === 'active' && (
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
                            {getProjectTypeLabel(project.project_type as any)}
                        </span>
                        
                        {project.role === 'owner' && (
                             <Badge variant="outline" className={cn(
                                 "text-[9px] uppercase tracking-wider py-0 px-2 font-bold",
                                 hasCover ? "border-white/20 text-white/60 bg-white/5 backdrop-blur-md" : "border-amber-100 text-amber-600 bg-amber-50/30"
                             )}>
                                Owner
                            </Badge>
                        )}

                        <span className={cn(
                            "text-xs font-medium flex items-center gap-1.5",
                            hasCover ? "text-white/40" : "text-slate-400"
                        )}>
                            <Clock className="w-3.5 h-3.5" />
                            <span className="opacity-70">Last accessed:</span>
                            {isMounted ? formatDistanceToNow(project.last_accessed_at || new Date().toISOString()) + ' ago' : '...'}
                        </span>
                    </div>

                    {project.premise && (
                        <p className={cn(
                            "mt-6 text-sm leading-relaxed line-clamp-2 italic font-serif transition-colors duration-500",
                            hasCover ? "text-white/60 group-hover:text-white/80" : "text-slate-500"
                        )}>
                            &ldquo;{project.premise}&rdquo;
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
                                {members.slice(0, 4).map((member, i) => (
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
                                                    {(member.display_name || 'U').slice(0, 2)}
                                                </AvatarFallback>
                                            </Avatar>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="bg-slate-900 text-white border-none rounded-xl px-3 py-1.5">
                                            <p className="text-[10px] font-bold uppercase tracking-widest">{member.display_name}</p>
                                            <p className="text-[8px] opacity-50 uppercase tracking-widest">{member.role}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                ))}
                                {members.length > 4 && (
                                    <div className={cn(
                                        "w-7 h-7 rounded-full flex items-center justify-center border-2 text-[8px] font-bold z-0",
                                        hasCover ? "bg-white/10 border-black/50 text-white" : "bg-slate-50 border-white text-slate-400"
                                    )}>
                                        +{members.length - 4}
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
                                    <>Private Draft</>
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

            <CoverEditModal 
                project={{
                    id: project.id,
                    title: project.title || '',
                    cover_url: project.cover_url || ''
                }}
                isOpen={isEditingCover}
                onOpenChange={setIsEditingCover}
            />
        </div>
    )
}
