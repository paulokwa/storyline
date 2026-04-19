'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { PenLine, Tv, BookOpen, Zap, Map, ChevronRight, ChevronLeft, Info, Sparkles, FileText } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { ProjectType, WritingMode } from '@/lib/supabase/types'
import GuidedFlow from '@/components/new-project/GuidedFlow'
import ImportWizard from '@/components/new-project/ImportWizard'
import CoverPicker from '@/components/project/CoverPicker'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { isTemporaryCoverUrl, uploadProjectCover } from '@/lib/supabase/project-covers'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { PROJECT_TYPE_LABELS, DEFAULT_WRITING_MODE_BY_TYPE, getProjectTypeLabel } from '@/lib/constants'
import { toast } from 'sonner'

type StartMode = 'quick' | 'guided' | 'import'
type Step = 'title' | 'type' | 'start_mode' | 'identity' | 'guided' | 'import'

interface NewProjectState {
    title: string
    type: ProjectType | null
    startMode: StartMode | null
    coverUrl: string
}

export default function NewProjectPage() {
    const router = useRouter()
    const [step, setStep] = useState<Step>('title')
    const [state, setState] = useState<NewProjectState>({
        title: '',
        type: null,
        startMode: null,
        coverUrl: '',
    })
    const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null)
    const [creating, setCreating] = useState(false)

    // Draft Persistence
    useEffect(() => {
        if (typeof window === 'undefined') return
        const saved = localStorage.getItem('storyline-new-project-draft')
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                if (parsed.state) setState(parsed.state)
                if (parsed.step && parsed.step !== 'writing_mode') setStep(parsed.step)
                else if (parsed.step === 'writing_mode') setStep('start_mode') // Handle legacy drafts
            } catch (e) {
                console.error("Failed to load draft", e)
            }
        }
    }, [])

    useEffect(() => {
        if (typeof window === 'undefined') return
        // Only save if we have some progress
        if (state.type || state.title || step !== 'title') {
            localStorage.setItem('storyline-new-project-draft', JSON.stringify({ state, step }))
        }
    }, [state, step])

    async function createProject(extras?: {
        title?: string; premise?: string; tone?: string; setting?: string;
        firstCharacterName?: string; firstIdea?: string;
        characters?: string[]; locations?: string[];
        writingMode?: WritingMode;
        chunks?: { title: string; content: string }[];
        coverUrl?: string;
        coverFile?: File | null;
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

        try {
            const writingMode = extras?.writingMode || (state.type ? DEFAULT_WRITING_MODE_BY_TYPE[state.type] : 'simple')
            const selectedCoverFile = extras?.coverFile ?? pendingCoverFile
            let persistedCoverUrl = extras?.coverUrl || state.coverUrl

            if (selectedCoverFile) {
                const uploadResult = await uploadProjectCover(supabase, user.id, selectedCoverFile)
                persistedCoverUrl = uploadResult.publicUrl
            } else if (isTemporaryCoverUrl(persistedCoverUrl)) {
                persistedCoverUrl = ''
            }

            const payload: any = {
                user_id: user.id,
                title: state.title || extras?.title || 'My New Project',
                type: state.type!,
                writing_mode: writingMode,
            }

            if (extras?.premise) payload.premise = extras.premise
            if (extras?.tone) payload.tone = extras.tone
            if (persistedCoverUrl) payload.cover_url = persistedCoverUrl

            if (extras?.locations && extras.locations.length > 0) {
                payload.setting = extras.locations.join(', ')
            } else if (extras?.setting) {
                payload.setting = extras.setting
            }

            const { data: project, error } = await (supabase as any)
                .from('projects')
                .insert(payload)
                .select()
                .single()

            if (error || !project) {
                console.error("Supabase Insert Error:", error)
                return
            }

            const charactersToInsert = extras?.characters || (extras?.firstCharacterName ? [extras.firstCharacterName] : [])
            for (let i = 0; i < charactersToInsert.length; i++) {
                const name = charactersToInsert[i].trim()
                if (!name) continue
                await (supabase as any).from('characters').insert({ project_id: project.id, name: name, description: i === 0 ? 'Protagonist' : 'Supporting Character', order_index: i })
            }

            const locationsToInsert = extras?.locations || []
            for (let i = 0; i < locationsToInsert.length; i++) {
                const name = locationsToInsert[i].trim()
                if (!name) continue
                await (supabase as any).from('locations').insert({ project_id: project.id, name: name, order_index: i })
            }

            let initialSceneContent: any = null
            const firstIdea = extras?.firstIdea?.trim()
            if (firstIdea) {
                await (supabase as any).from('ideas').insert({ project_id: project.id, title: 'Initial Vision', content: firstIdea, order_index: 0 })
                const nodeType = writingMode === 'screenplay' ? 'screenplayAction' : 'paragraph';
                const paragraphs = firstIdea.split('\n').filter(l => l.trim() !== '').map(l => ({ type: nodeType, content: [{ type: 'text', text: l }] }))
                initialSceneContent = { type: 'doc', content: paragraphs.length ? paragraphs : [{ type: nodeType }] }
            }

            if (extras?.chunks && extras.chunks.length > 0) {
                const chunks = extras.chunks
                let actParentId = null
                if (state.type === 'tv_script') {
                    const { data: episode } = await (supabase as any).from('structure_nodes').insert({ project_id: project.id, type: 'episode', title: 'Imported Episode', order_index: 0 }).select().single()
                    if (episode) {
                        const { data: act } = await (supabase as any).from('structure_nodes').insert({ project_id: project.id, parent_id: (episode as any).id, type: 'act', title: 'Imported Act', order_index: 0 }).select().single()
                        actParentId = act ? (act as any).id : null
                    }
                }
                for (let i = 0; i < chunks.length; i++) {
                    const chunk = chunks[i]
                    const nodeType = writingMode === 'screenplay' ? 'screenplayAction' : 'paragraph';
                    const paragraphs = chunk.content.split('\n').filter(l => l.trim() !== '').map(l => ({ type: nodeType, content: [{ type: 'text', text: l }] }))
                    const tiptapJson = { type: 'doc', content: paragraphs.length ? paragraphs : [{ type: nodeType }] }
                    if (state.type === 'novel') {
                        const { data: chapter } = await (supabase as any).from('structure_nodes').insert({ project_id: project.id, type: 'chapter', title: chunk.title || `Chapter ${i + 1}`, order_index: i }).select().single()
                        if (chapter) {
                            const { data: scene } = await (supabase as any).from('structure_nodes').insert({ project_id: project.id, parent_id: (chapter as any).id, type: 'scene', title: chunk.title || 'Scene 1', order_index: 0 }).select().single()
                            if (scene) await supabase.from('scenes').insert({ node_id: (scene as any).id, project_id: project.id, writing_mode: writingMode, content: tiptapJson })
                        }
                    } else if (actParentId) {
                        const { data: scene } = await (supabase as any).from('structure_nodes').insert({ project_id: project.id, parent_id: actParentId, type: 'scene', title: chunk.title || `Scene ${i + 1}`, order_index: i }).select().single()
                        if (scene) await (supabase as any).from('scenes').insert({ node_id: (scene as any).id, project_id: project.id, writing_mode: writingMode, content: tiptapJson })
                    }
                }
            } else if (state.type === 'tv_script') {
                const { data: episode } = await (supabase as any).from('structure_nodes').insert({ project_id: project.id, type: 'episode', title: 'Episode 1', order_index: 0 }).select().single()
                if (episode) {
                    const { data: act } = await (supabase as any).from('structure_nodes').insert({ project_id: project.id, parent_id: (episode as any).id, type: 'act', title: 'Act 1', order_index: 0 }).select().single()
                    if (act) {
                        const { data: scene } = await (supabase as any).from('structure_nodes').insert({ project_id: project.id, parent_id: (act as any).id, type: 'scene', title: 'Scene 1', order_index: 0 }).select().single()
                        const sceneData: any = { node_id: (scene as any).id, project_id: project.id, writing_mode: writingMode }
                        if (initialSceneContent) sceneData.content = initialSceneContent
                        if (scene) await supabase.from('scenes').insert(sceneData)
                    }
                }
            } else {
                const { data: chapter } = await (supabase as any).from('structure_nodes').insert({ project_id: project.id, type: 'chapter', title: 'Chapter 1', order_index: 0 }).select().single()
                if (chapter) {
                    const { data: scene } = await (supabase as any).from('structure_nodes').insert({ project_id: project.id, parent_id: (chapter as any).id, type: 'scene', title: 'Scene 1', order_index: 0 }).select().single()
                    const sceneData: any = { node_id: (scene as any).id, project_id: project.id, writing_mode: writingMode }
                    if (initialSceneContent) sceneData.content = initialSceneContent
                    if (scene) await supabase.from('scenes').insert(sceneData)
                }
            }

            localStorage.removeItem('storyline-new-project-draft')
            localStorage.removeItem('storyline-guided-data-draft')
            setPendingCoverFile(null)
            router.refresh()
            router.push(`/project/${project.id}/story`)
        } catch (error) {
            console.error("Project creation error:", error)
            toast.error(error instanceof Error ? error.message : "Failed to create project.")
        } finally {
            setCreating(false)
        }
    }

    const steps: Step[] = (() => {
        const base: Step[] = ['title', 'type', 'start_mode']
        if (state.startMode === 'guided') base.push('guided')
        else if (state.startMode === 'import') base.push('import')
        else if (state.startMode === 'quick') base.push('identity')
        return base
    })()
    const currentStepIndex = steps.indexOf(step)
    const progress = ((currentStepIndex) / (steps.length - 1)) * 100

    return (
        <TooltipProvider>
            <div className="new-project-page flex-1 w-full overflow-y-auto bg-background flex flex-col items-center py-16 md:py-24 fade-in">
                <div className="w-full max-w-2xl px-6 flex items-center justify-between mb-20 animate-in fade-in slide-in-from-top-4 duration-700">
                    <Link href="/library" className="group flex items-center gap-2 text-slate-400 hover:text-slate-800 transition-all font-medium">
                        <div className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm">
                            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                        </div>
                        <span className="text-sm">Archive</span>
                    </Link>
                    <div className="flex flex-col items-end gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-[#546354]/60">
                            Step {currentStepIndex + 1} of {steps.length} — {
                                step === 'title' ? 'Project' :
                                step === 'type' ? 'Format' :
                                step === 'start_mode' ? 'Setup' :
                                step === 'identity' ? 'Identity' :
                                step === 'guided' ? 'Details' :
                                step === 'import' ? 'Import' : ''
                            }
                        </span>
                        <div className="w-40 h-1.5 bg-stone-200/40 rounded-full overflow-hidden shadow-inner">
                            <div
                                className="h-full bg-[#546354] rounded-full transition-all duration-1000 ease-in-out shadow-[0_0_8px_rgba(84,99,84,0.3)]"
                                style={{ width: `${Math.max(8, progress)}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="w-full max-w-2xl px-6">
                    <div className="new-project-card sanctuary-card rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-14 relative overflow-hidden animate-in fade-in zoom-in-95 duration-1000">
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
                                    if (startMode === 'guided') {
                                        setStep('guided')
                                    } else if (startMode === 'import') {
                                        setStep('import')
                                    } else {
                                        setStep('identity')
                                    }
                                }}
                                onBack={() => setStep('type')}
                                creating={creating}
                            />
                        )}

                        {step === 'guided' && state.type && (
                            <GuidedFlow
                                projectType={state.type}
                                initialTitle={state.title}
                                onComplete={createProject}
                                onBack={() => setStep('start_mode')}
                                creating={creating}
                            />
                        )}

                        {step === 'import' && state.type && (
                            <ImportWizard 
                                projectType={state.type}
                                onComplete={(chunks) => createProject({ chunks })}
                                onBack={() => setStep('start_mode')}
                                creating={creating}
                            />
                        )}

                        {step === 'identity' && (
                            <StepIdentity 
                                value={state.coverUrl}
                                onChange={(url) => setState(s => ({ ...s, coverUrl: url }))}
                                onFileChange={setPendingCoverFile}
                                onComplete={() => createProject()}
                                onBack={() => setStep('start_mode')}
                                creating={creating}
                            />
                        )}

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
                    Create a<br /><span className="text-slate-400 italic">new project</span>
                </h1>
                <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-xl italic opacity-80">Choose the type of project you want to write.</p>
            </div>

            <div className="space-y-6">
                <Input
                    value={value}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
                    placeholder="e.g. The Midnight Heir"
                    className="new-project-step-input h-16 text-xl bg-stone-50/50 border-transparent focus:bg-white focus:border-primary/20 rounded-2xl px-6 transition-all font-serif italic"
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
                <p className="text-slate-500 font-medium italic opacity-60">You can change editor settings later in Project Settings.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <TypeCard
                    icon={<BookOpen className="w-8 h-8" />}
                    title={getProjectTypeLabel('novel')}
                    description="Write novels, short stories, memoirs, or any prose."
                    selected={value === 'novel'}
                    onClick={() => onSelect('novel')}
                />
                <TypeCard
                    icon={<Tv className="w-8 h-8" />}
                    title={getProjectTypeLabel('tv_script')}
                    description="Write scripts for film, TV, or stage using screenplay formatting."
                    selected={value === 'tv_script'}
                    onClick={() => onSelect('tv_script')}
                />
            </div>
            
            <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">
                <ChevronLeft className="w-4 h-4" /> Go Back
            </button>
        </div>
    )
}

function StepStartMode({ value, projectType, onSelect, onBack, creating }: {
    value: StartMode | null
    projectType: ProjectType
    onSelect: (m: StartMode) => void
    onBack: () => void
    creating: boolean
}) {
    return (
        <div className="fade-in space-y-10">
            <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-serif text-slate-800 leading-tight">
                    How shall we<br /><span className="text-slate-400 italic">begin?</span>
                </h1>
                <p className="text-slate-500 font-medium">Choose how you want to start.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <TypeCard
                    icon={<Zap className="w-8 h-8" />}
                    title="Start from Scratch"
                    description="Empty pages and a clean structure. Start writing immediately."
                    selected={value === 'quick'}
                    onClick={() => !creating && onSelect('quick')}
                    disabled={creating}
                />
                <TypeCard
                    icon={<FileText className="w-8 h-8" />}
                    title="Import Manuscript"
                    description="Import an existing manuscript (.docx, .md, .txt) and structure it automatically."
                    selected={value === 'import'}
                    onClick={() => !creating && onSelect('import')}
                    disabled={creating}
                />
                <TypeCard
                    icon={<Map className="w-8 h-8" />}
                    title="Guided Start"
                    description={`Answer a few prompts and we'll bridge the gap to your first ${projectType === 'tv_script' ? 'episode' : 'chapter'}.`}
                    selected={value === 'guided'}
                    onClick={() => !creating && onSelect('guided')}
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
                'group text-left p-8 rounded-[2rem] transition-all duration-500 relative border-2 active:scale-[0.98] outline-none',
                selected
                    ? 'bg-white border-[#546354]/20 shadow-[0_20px_50px_rgba(84,99,84,0.1)] ring-1 ring-[#546354]/10'
                    : 'bg-stone-50/50 hover:bg-white hover:shadow-[0_20px_60px_rgba(0,0,0,0.06)] hover:-translate-y-1 border-transparent hover:border-slate-100',
                disabled && 'opacity-50 cursor-not-allowed'
            )}
        >
            <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 shadow-sm",
                selected ? "bg-[#546354] text-white scale-110 shadow-xl shadow-[#546354]/20" : "bg-white text-slate-400 group-hover:bg-[#546354]/5 group-hover:text-[#546354]"
            )}>
                {icon}
            </div>
            <div className="font-serif text-2xl text-slate-800 mb-2 group-hover:text-primary transition-colors">{title}</div>
            <div className="text-sm text-slate-500 leading-relaxed font-medium italic opacity-80">{description}</div>

            {
                selected && (
                    <div className="absolute top-6 right-6">
                        <div className="w-8 h-8 rounded-full bg-[#546354] flex items-center justify-center animate-in zoom-in-0 duration-500 shadow-lg">
                            <ChevronRight className="w-5 h-5 text-white" />
                        </div>
                    </div>
                )
            }
        </button >
    )
}

function StepIdentity({ value, onChange, onFileChange, onComplete, onBack, creating }: {
    value: string
    onChange: (v: string) => void
    onFileChange: (file: File | null) => void
    onComplete: () => void
    onBack: () => void
    creating: boolean
}) {
    return (
        <div className="fade-in space-y-10">
            <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-serif text-slate-800 leading-tight">
                    Add a<br /><span className="text-slate-400 italic">visual soul</span>
                </h1>
                <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-xl italic opacity-80">Choose a cover for your library card or skip to keep it minimal.</p>
            </div>

            <CoverPicker value={value} onChange={onChange} deferUpload onPendingFileChange={onFileChange} />

            <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-primary transition-colors disabled:opacity-30"
                    disabled={creating}
                >
                    <ChevronLeft className="w-4 h-4" /> Go Back
                </button>
                <Button
                    onClick={onComplete}
                    disabled={creating}
                    className="sanctuary-btn-primary h-14 px-10 rounded-full text-base font-semibold gap-3"
                >
                    {creating ? (
                        <>
                            <Sparkles className="w-5 h-5 animate-spin" />
                            Creating...
                        </>
                    ) : (
                        <>
                            Start Writing <ChevronRight className="w-5 h-5" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}
