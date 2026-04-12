'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Film, BookOpen, Trash2, ChevronRight, Plus, Clock, Sparkles } from 'lucide-react'
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

type Project = Database['public']['Tables']['projects']['Row'] & {
    role?: 'owner' | 'editor' | 'viewer'
}

export default function ProjectGrid({ projects }: { projects: Project[] }) {
    const [draft, setDraft] = useState<{ state: any; step: any } | null>(null)

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

    return (
        <TooltipProvider>
            <div className="max-w-[1440px] mx-auto px-6 py-16 md:py-24 fade-in">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20 border-b border-slate-100 pb-12">
                    <div className="space-y-4">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <h1 className="text-5xl md:text-7xl font-serif text-slate-800 tracking-tight leading-tight cursor-help">
                                    The Manuscript<br /><span className="text-slate-400">Archive</span>
                                </h1>
                            </TooltipTrigger>
                            <TooltipContent side="right">Manuscript Management</TooltipContent>
                        </Tooltip>
                        <p className="text-lg text-slate-500 max-w-sm font-medium">
                            Your creative sanctuary. Select a project below or start a new journey.
                        </p>
                    </div>
                    <Link href="/new">
                        <Button className="sanctuary-btn-primary h-14 px-8 rounded-full text-base font-semibold gap-3">
                            <Plus className="w-5 h-5" /> Start New Project
                        </Button>
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {draft && (
                        <Link
                            href="/new"
                            className="group block sanctuary-card border-2 border-dashed border-primary/20 bg-primary/5 rounded-[2rem] p-8 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl relative overflow-hidden active:scale-[0.98]"
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
                    )}
                    {projects.map((project) => (
                        <ProjectCard key={project.id} project={project} />
                    ))}
                </div>
            </div>
        </TooltipProvider>
    )
}

function ProjectCard({ project }: { project: Project }) {
    const router = useRouter()
    const isTV = project.type === 'tv_script'
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    async function handleDelete(e: React.MouseEvent) {
        e.preventDefault()
        e.stopPropagation()
        setIsDeleting(true)
        const supabase = createClient()
        await supabase.from('projects').delete().eq('id', project.id)
        router.refresh()
    }

    return (
        <Link
            href={`/project/${project.id}/story`}
            className="group block sanctuary-card rounded-[2rem] p-8 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl relative overflow-hidden active:scale-[0.98]"
        >
            <div className="relative z-10">
                <div className="flex items-start justify-between mb-8">
                    <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500",
                        isTV ? "bg-stone-50 text-stone-600 group-hover:bg-primary/10 group-hover:text-primary" : "bg-stone-50 text-stone-500 group-hover:bg-primary/10 group-hover:text-primary"
                    )}>
                        {isTV ? <Film className="w-7 h-7" /> : <BookOpen className="w-7 h-7" />}
                    </div>

                    {project.role === 'owner' && (
                        confirmDelete ? (
                            <div
                                onClick={e => e.preventDefault()}
                                className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200"
                            >
                                <span className="text-[10px] text-red-400 font-medium">Delete?</span>
                                <button
                                    onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(false) }}
                                    className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider"
                                >Cancel</button>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                onClick={handleDelete}
                                                disabled={isDeleting}
                                                className="px-3 py-1 text-[10px] font-bold bg-red-500 hover:bg-red-600 text-white rounded-full uppercase tracking-wider transition-colors disabled:opacity-50"
                                            >{isDeleting ? '...' : 'Delete'}</button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">Permanently delete this project</TooltipContent>
                                    </Tooltip>
                            </div>
                        ) : (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(true) }}
                                            className="opacity-0 group-hover:opacity-100 transition-all duration-300 p-2.5 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Delete Project</TooltipContent>
                                </Tooltip>
                        )
                    )}
                </div>

                <div className="space-y-3">
                    <h3 className="text-2xl font-serif text-slate-800 group-hover:text-primary transition-colors duration-300 leading-snug">
                        {project.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md group-hover:bg-primary/5 group-hover:text-primary/60 transition-colors">
                            {getProjectTypeLabel(project.type)}
                        </span>
                        
                        {project.role && project.role !== 'owner' && (
                            <Badge variant="outline" className="text-[9px] uppercase tracking-wider py-0 px-2 border-slate-200 text-slate-500 font-bold bg-white/50">
                                {project.role === 'editor' ? 'Shared · Can edit' : 'Shared · View only'}
                            </Badge>
                        )}
                        {project.role === 'owner' && (
                             <Badge variant="outline" className="text-[9px] uppercase tracking-wider py-0 px-2 border-amber-100 text-amber-600 font-bold bg-amber-50/30">
                                Owner
                            </Badge>
                        )}

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5 cursor-help">
                                    <Clock className="w-3.5 h-3.5" />
                                    {formatDistanceToNow(project.last_accessed_at || new Date().toISOString())}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                {`Last updated: ${formatDistanceToNow(project.updated_at || new Date().toISOString())}`}
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>

                {project.premise && (
                    <p className="mt-6 text-sm text-slate-500 leading-relaxed line-clamp-2 italic font-serif">
                        &ldquo;{project.premise}&rdquo;
                    </p>
                )}

                <div className="mt-10 pt-6 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:text-primary transition-colors">
                    </span>
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-primary text-slate-300 group-hover:text-white transition-all duration-500 transform group-hover:rotate-[-45deg]">
                        <ChevronRight className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Subtle background flair */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-stone-50/50 rounded-full -mr-16 -mt-16 group-hover:bg-primary/5 transition-all duration-700" />
        </Link>
    )
}
