'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Film, BookOpen, Trash2, ChevronRight, Plus, Clock } from 'lucide-react'
import type { Database } from '@/lib/supabase/types'
import { formatDistanceToNow } from '@/lib/time'
import { cn } from '@/lib/utils'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

type Project = Database['public']['Tables']['projects']['Row']

export default function ProjectGrid({ projects }: { projects: Project[] }) {
    if (projects.length === 0) {
        return (
            <div className="max-w-7xl mx-auto px-6 py-24 text-center fade-in">
                <div className="w-20 h-20 bg-stone-100 rounded-3xl flex items-center justify-center mx-auto mb-8">
                    <BookOpen className="w-10 h-10 text-stone-400" />
                </div>
                <h2 className="text-3xl font-serif text-slate-800 mb-4">Your Archive is Empty</h2>
                <p className="text-slate-500 text-lg mb-10 max-w-md mx-auto font-medium">
                    Every great story begins with a single word. Start your first journey today.
                </p>
                <Link href="/new">
                    <Button className="sanctuary-btn-primary h-14 px-10 rounded-full text-base font-semibold gap-3">
                        <Plus className="w-5 h-5" /> Create Your First Project
                    </Button>
                </Link>
            </div>
        )
    }

    return (
        <TooltipProvider>
            <div className="max-w-7xl mx-auto px-6 py-16 md:py-24 fade-in">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20">
                    <div className="space-y-4">
                        <h1 className="text-5xl md:text-7xl font-serif text-slate-800 tracking-tight leading-tight">
                            The Manuscript<br /><span className="text-slate-400">Archive</span>
                        </h1>
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

    async function handleDelete(e: React.MouseEvent) {
        e.preventDefault()
        e.stopPropagation()
        if (!confirm(`Delete "${project.title}"? This cannot be undone.`)) return
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

                    <button
                        onClick={handleDelete}
                        className="opacity-0 group-hover:opacity-100 transition-all duration-300 p-2.5 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-3">
                    <h3 className="text-2xl font-serif text-slate-800 group-hover:text-primary transition-colors duration-300 leading-snug">
                        {project.title}
                    </h3>

                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md group-hover:bg-primary/5 group-hover:text-primary/60 transition-colors">
                            {isTV ? 'TV Script' : 'Novel'}
                        </span>
                        <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDistanceToNow(project.updated_at)}
                        </span>
                    </div>
                </div>

                {project.premise && (
                    <p className="mt-6 text-sm text-slate-500 leading-relaxed line-clamp-2 italic font-serif">
                        &ldquo;{project.premise}&rdquo;
                    </p>
                )}

                <div className="mt-10 pt-6 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:text-primary transition-colors">
                        {project.writing_mode.replace('_', ' ')}
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
