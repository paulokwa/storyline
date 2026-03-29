'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { PenLine, Tv, BookOpen, Zap, Map, ChevronRight, ChevronLeft, Info, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { ProjectType, WritingMode } from '@/lib/supabase/types'
import GuidedFlow from '@/components/new-project/GuidedFlow'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

type StartMode = 'quick' | 'guided'
type Step = 'title' | 'type' | 'start_mode' | 'writing_mode' | 'guided'

interface NewProjectState {
    title: string
    type: ProjectType | null
    startMode: StartMode | null
    writingMode: WritingMode | null
}

export default function NewProjectPage() {
    const router = useRouter()
    const [step, setStep] = useState<Step>('title')
    const [state, setState] = useState<NewProjectState>({
        title: '',
        type: null,
        startMode: null,
        writingMode: null,
    })
    const [creating, setCreating] = useState(false)

    async function createProject(extras?: {
        title?: string; premise?: string; tone?: string; setting?: string;
        firstCharacterName?: string; firstIdea?: string;
        writingMode?: WritingMode;
    }) {
        if (creating) return
        setCreating(true)
        const supabase = createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setCreating(false)
            console.error("No user found")
            return
        }

        const payload: any = {
            user_id: user.id,
            title: state.title || extras?.title || 'My New Project',
            type: state.type!,
            writing_mode: extras?.writingMode || state.writingMode!,
        }

        if (extras?.premise) payload.premise = extras.premise
        if (extras?.tone) payload.tone = extras.tone
        if (extras?.setting) payload.setting = extras.setting

        console.log("Supabase Insert Payload:", JSON.stringify(payload, null, 2))

        const { data: project, error } = await (supabase as any)
            .from('projects')
            .insert(payload)
            .select()
            .single()

        if (error || !project) {
            console.error("Supabase Insert Error:", error)
            setCreating(false)
            return
        }

        // Scaffold structure nodes
        if (state.type === 'tv_script') {
            const { data: episode } = await (supabase as any).from('structure_nodes').insert({ project_id: project.id, type: 'episode', title: 'Episode 1', order_index: 0 }).select().single()
            if (episode) {
                const { data: act } = await (supabase as any).from('structure_nodes').insert({ project_id: project.id, parent_id: (episode as any).id, type: 'act', title: 'Act 1', order_index: 0 }).select().single()
                if (act) {
                    const { data: scene } = await (supabase as any).from('structure_nodes').insert({ project_id: project.id, parent_id: (act as any).id, type: 'scene', title: 'Scene 1', order_index: 0 }).select().single()
                    if (scene) await (supabase as any).from('scenes').insert({ node_id: (scene as any).id, project_id: project.id, writing_mode: payload.writing_mode })
                }
            }
        } else {
            const { data: chapter } = await (supabase as any).from('structure_nodes').insert({ project_id: project.id, type: 'chapter', title: 'Chapter 1', order_index: 0 }).select().single()
            if (chapter) {
                const { data: scene } = await (supabase as any).from('structure_nodes').insert({ project_id: project.id, parent_id: (chapter as any).id, type: 'scene', title: 'Scene 1', order_index: 0 }).select().single()
                if (scene) await (supabase as any).from('scenes').insert({ node_id: (scene as any).id, project_id: project.id, writing_mode: payload.writing_mode })
            }
        }

        router.push(`/project/${project.id}/story`)
    }

    const steps: Step[] = state.startMode === 'guided' ? ['title', 'type', 'start_mode', 'writing_mode', 'guided'] : ['title', 'type', 'start_mode', 'writing_mode']
    const currentStepIndex = steps.indexOf(step)
    const progress = ((currentStepIndex) / (steps.length - 1)) * 100

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-background flex flex-col items-center py-16 md:py-24 fade-in">
                {/* Header/Nav */}
                <div className="w-full max-w-2xl px-6 flex items-center justify-between mb-20 animate-in fade-in slide-in-from-top-4 duration-700">
                    <Link href="/library" className="group flex items-center gap-2 text-slate-400 hover:text-slate-800 transition-all font-medium">
                        <div className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm">
                            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                        </div>
                        <span className="text-sm">Archive</span>
                    </Link>
                    <div className="flex flex-col items-end gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-[#546354]/60">Phase {currentStepIndex + 1} of {steps.length}</span>
                        <div className="w-40 h-1.5 bg-stone-200/40 rounded-full overflow-hidden shadow-inner">
                            <div
                                className="h-full bg-[#546354] rounded-full transition-all duration-1000 ease-in-out shadow-[0_0_8px_rgba(84,99,84,0.3)]"
                                style={{ width: `${Math.max(8, progress)}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="w-full max-w-2xl px-6">
                    <div className="sanctuary-card rounded-[2.5rem] p-10 md:p-14 relative overflow-hidden animate-in fade-in zoom-in-95 duration-1000">
                        {step === 'title' && (
                            <StepTitle
                                value={state.title}
                                onChange={(title) => setState(s => ({ ...s, title }))}
                                onContinue={() => setStep('type')}
                            />
                        )}

                        {step === 'type' && (
                            <StepTypeSelect
                                value={state.type}
                                onSelect={(type) => {
                                    setState(s => ({ ...s, type }))
                                    setStep('start_mode')
                                }}
                                onBack={() => setStep('title')}
                            />
                        )}

                        {step === 'start_mode' && (
                            <StepStartMode
                                value={state.startMode}
                                projectType={state.type!}
                                onSelect={(startMode) => {
                                    setState(s => ({ ...s, startMode }))
                                    setStep('writing_mode')
                                }}
                                onBack={() => setStep('type')}
                            />
                        )}

                        {step === 'writing_mode' && (
                            <StepWritingMode
                                value={state.writingMode}
                                onSelect={(writingMode) => {
                                    setState(s => ({ ...s, writingMode }))
                                    if (state.startMode === 'guided') {
                                        setStep('guided')
                                    } else {
                                        createProject({ writingMode })
                                    }
                                }}
                                onBack={() => setStep('start_mode')}
                                creating={creating}
                            />
                        )}

                        {step === 'guided' && state.type && state.writingMode && (
                            <GuidedFlow
                                projectType={state.type}
                                initialTitle={state.title}
                                onComplete={createProject}
                                onBack={() => setStep('writing_mode')}
                                creating={creating}
                            />
                        )}

                        {/* Decorative sanctuary flair */}
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-stone-50/30 rounded-full -ml-32 -mb-32 blur-3xl pointer-events-none" />
                    </div>
                </div>
            </div>
        </TooltipProvider>
    )
}

function StepTitle({ value, onChange, onContinue }: {
    value: string
    onChange: (v: string) => void
    onContinue: () => void
}) {
    return (
        <div className="fade-in space-y-10">
            <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-serif text-slate-800 leading-tight">
                    Every journey needs<br /><span className="text-slate-400 italic">a name</span>
                </h1>
                <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-xl italic opacity-80">Give your creative work a title. You can change this later.</p>
            </div>

            <div className="space-y-6">
                <Input
                    value={value}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
                    placeholder="e.g. The Midnight Heir"
                    className="h-16 text-xl bg-stone-50/50 border-transparent focus:bg-white focus:border-primary/20 rounded-2xl px-6 transition-all font-serif italic"
                    autoFocus
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && value.trim() && onContinue()}
                />
                <Button
                    onClick={onContinue}
                    disabled={!value.trim()}
                    className="sanctuary-btn-primary h-14 px-10 rounded-full text-base font-semibold gap-3 w-full sm:w-auto"
                >
                    Continue <ChevronRight className="w-5 h-5" />
                </Button>
            </div>
        </div>
    )
}

function StepTypeSelect({ value, onSelect, onBack }: {
    value: ProjectType | null
    onSelect: (t: ProjectType) => void
    onBack: () => void
}) {
    return (
        <div className="fade-in space-y-10">
            <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-serif text-slate-800 leading-tight">
                    What are we<br /><span className="text-slate-400 italic">writing today?</span>
                </h1>
                <p className="text-slate-500 font-medium">Choose the vessel for your next story.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <TypeCard
                    icon={<Tv className="w-8 h-8" />}
                    title="TV Script"
                    description="Episodes, acts, and scenes. Standard screenplay formatting for serialized stories."
                    selected={value === 'tv_script'}
                    onClick={() => onSelect('tv_script')}
                />
                <TypeCard
                    icon={<BookOpen className="w-8 h-8" />}
                    title="Novel"
                    description="Chapters and scenes. Perfect for long-form fiction, memoirs, and prose."
                    selected={value === 'novel'}
                    onClick={() => onSelect('novel')}
                />
            </div>
        </div>
    )
}

function StepStartMode({ value, projectType, onSelect, onBack }: {
    value: StartMode | null
    projectType: ProjectType
    onSelect: (m: StartMode) => void
    onBack: () => void
}) {
    return (
        <div className="fade-in space-y-10">
            <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-serif text-slate-800 leading-tight">
                    How shall we<br /><span className="text-slate-400 italic">begin?</span>
                </h1>
                <p className="text-slate-500 font-medium">Choose a mode that matches your current momentum.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <TypeCard
                    icon={<Zap className="w-8 h-8" />}
                    title="Quick Start"
                    description="Empty pages and a clean structure. Best when you just need to write."
                    selected={value === 'quick'}
                    onClick={() => onSelect('quick')}
                />
                <TypeCard
                    icon={<Map className="w-8 h-8" />}
                    title="Guided Start"
                    description={`Answer a few prompts and we'll bridge the gap to your first ${projectType === 'tv_script' ? 'episode' : 'chapter'}.`}
                    selected={value === 'guided'}
                    onClick={() => onSelect('guided')}
                />
            </div>

            <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">
                <ChevronLeft className="w-4 h-4" /> Go Back
            </button>
        </div>
    )
}

function StepWritingMode({ value, onSelect, onBack, creating }: {
    value: WritingMode | null
    onSelect: (m: WritingMode) => void
    onBack: () => void
    creating: boolean
}) {
    return (
        <div className="fade-in space-y-10">
            <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-serif text-slate-800 leading-tight">
                    Define your<br /><span className="text-slate-400 italic">writing style</span>
                </h1>
                <p className="text-slate-500 font-medium">You can switch between these modes anytime inside the project.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <TypeCard
                    icon={<PenLine className="w-8 h-8" />}
                    title="Simple Mode"
                    description="Standard prose. Focus on the flow of your internal narrative."
                    selected={value === 'simple'}
                    onClick={() => !creating && onSelect('simple')}
                    disabled={creating}
                />
                <TypeCard
                    icon={<span className="text-xl font-bold tracking-tighter">INT.</span>}
                    title="Screenplay Mode"
                    description="Auto-formatted industry standards: sluglines, actions, and dialogue."
                    selected={value === 'screenplay'}
                    onClick={() => !creating && onSelect('screenplay')}
                    disabled={creating}
                />
            </div>

            {creating ? (
                <div className="flex items-center gap-3 text-primary font-medium animate-pulse">
                    <Sparkles className="w-5 h-5 animate-spin-slow" />
                    Scaffolding your sanctuary...
                </div>
            ) : (
                <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Go Back
                </button>
            )}
        </div>
    )
}

function TypeCard({ icon, title, description, selected, onClick, disabled }: {
    icon: React.ReactNode
    title: string
    description: string
    selected: boolean
    onClick: () => void
    disabled?: boolean
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'group text-left p-8 rounded-[2rem] transition-all duration-500 relative border border-transparent active:scale-[0.98]',
                selected
                    ? 'bg-[#546354]/5 border-[#546354]/10 shadow-inner'
                    : 'bg-stone-50/50 hover:bg-white hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] hover:-translate-y-2 border-transparent',
                disabled && 'opacity-50 cursor-not-allowed'
            )}
        >
            <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500",
                selected ? "bg-primary text-white scale-110 shadow-lg shadow-primary/20" : "bg-white text-slate-400 group-hover:bg-primary/5 group-hover:text-primary"
            )}>
                {icon}
            </div>
            <div className="font-serif text-xl text-slate-800 mb-2 group-hover:text-primary transition-colors">{title}</div>
            <div className="text-sm text-slate-500 leading-relaxed font-medium">{description}</div>

            {
                selected && (
                    <div className="absolute top-4 right-4">
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center animate-in zoom-in-0 duration-300">
                            <ChevronRight className="w-4 h-4 text-white" />
                        </div>
                    </div>
                )
            }
        </button >
    )
}
