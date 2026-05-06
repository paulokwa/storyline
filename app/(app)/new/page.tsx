'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Tv, BookOpen, Zap, Map, ChevronRight, ChevronLeft, Sparkles, FileText, LockKeyhole, Cloud } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { ProjectType, WritingMode } from '@/lib/supabase/types'
import GuidedFlow from '@/components/new-project/GuidedFlow'
import ImportWizard from '@/components/new-project/ImportWizard'
import CoverPicker from '@/components/project/CoverPicker'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { isTemporaryCoverUrl } from '@/lib/supabase/project-covers'
import { createProject as createStoredProject, type PreferredStorageMode } from '@/lib/persistence/projects'
import {
    TooltipProvider,
} from "@/components/ui/tooltip"
import { DEFAULT_WRITING_MODE_BY_TYPE, getProjectTypeLabel } from '@/lib/constants'
import { toast } from 'sonner'
import { useTheme } from '@/components/providers/ThemeProvider'

type StartMode = 'quick' | 'guided' | 'import'
type Step = 'title' | 'type' | 'start_mode' | 'identity' | 'guided' | 'import'
const LOCAL_MODE_EDUCATION_PENDING_KEY = 'storyline-local-mode-education-pending'
const LOCAL_MODE_EDUCATION_SHOWN_KEY = 'storyline-local-mode-education-shown'

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
    const [preferredStorageMode, setPreferredStorageMode] = useState<PreferredStorageMode>('local')
    const [selectedStorageMode, setSelectedStorageMode] = useState<PreferredStorageMode>('local')
    const [isAiEnabled, setIsAiEnabled] = useState(false)
    const storageSelectionTouchedRef = useRef(false)

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

    useEffect(() => {
        let cancelled = false
        const supabase = createClient()

        void (async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user || cancelled) return

            const [{ data: profile }, { data: aiSettings }] = await Promise.all([
                supabase
                    .from('profiles')
                    .select('preferred_storage_mode')
                    .eq('id', user.id)
                    .maybeSingle(),
                supabase
                    .from('user_api_keys')
                    .select('ai_enabled')
                    .eq('user_id', user.id)
                    .maybeSingle(),
            ])

            if (!cancelled) {
                const profileStorageMode: PreferredStorageMode = profile?.preferred_storage_mode === 'cloud' ? 'cloud' : 'local'
                setPreferredStorageMode(profileStorageMode)
                setIsAiEnabled(!!aiSettings?.ai_enabled)
                if (!storageSelectionTouchedRef.current) {
                    setSelectedStorageMode(profileStorageMode)
                }
            }
        })()

        return () => {
            cancelled = true
        }
    }, [])

    function readFileAsDataUrl(file: File) {
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result)
                    return
                }

                reject(new Error('Failed to read cover image.'))
            }
            reader.onerror = () => reject(reader.error ?? new Error('Failed to read cover image.'))
            reader.readAsDataURL(file)
        })
    }

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
            const storageMode = selectedStorageMode
            const writingMode = extras?.writingMode || (state.type ? DEFAULT_WRITING_MODE_BY_TYPE[state.type] : 'simple')
            const selectedCoverFile = extras?.coverFile ?? pendingCoverFile
            let persistedCoverUrl = extras?.coverUrl || state.coverUrl

            if (storageMode === 'local' && selectedCoverFile) {
                persistedCoverUrl = await readFileAsDataUrl(selectedCoverFile)
            } else if (storageMode === 'cloud' && selectedCoverFile) {
                persistedCoverUrl = ''
            } else if (isTemporaryCoverUrl(persistedCoverUrl)) {
                persistedCoverUrl = ''
            }

            const project = await createStoredProject({
                storageMode,
                userId: user.id,
                title: state.title || extras?.title || 'My New Project',
                type: state.type!,
                writingMode,
                premise: extras?.premise,
                tone: extras?.tone,
                setting: extras?.locations && extras.locations.length > 0 ? extras.locations.join(', ') : extras?.setting,
                coverUrl: persistedCoverUrl || undefined,
                characters: extras?.characters || (extras?.firstCharacterName ? [extras.firstCharacterName] : []),
                locations: extras?.locations || [],
                firstIdea: extras?.firstIdea,
                chunks: extras?.chunks,
            })

            localStorage.removeItem('storyline-new-project-draft')
            localStorage.removeItem('storyline-guided-data-draft')
            setPendingCoverFile(null)

            if (
                storageMode === 'local'
                && localStorage.getItem(LOCAL_MODE_EDUCATION_SHOWN_KEY) !== 'true'
            ) {
                sessionStorage.setItem(LOCAL_MODE_EDUCATION_PENDING_KEY, project.id)
            }

            router.push(`/project/${project.id}/story`)
        } catch (error) {
            console.error("Project creation error:", error)
            toast.error(error instanceof Error ? error.message : "Failed to create project.")
        } finally {
            setCreating(false)
        }
    }

    const creatingLabel = selectedStorageMode === 'cloud'
        ? 'Creating your cloud project...'
        : 'Creating...'

    const handleStorageModeChange = (storageMode: PreferredStorageMode) => {
        storageSelectionTouchedRef.current = true
        setSelectedStorageMode(storageMode)
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
                    <Link href="/library" className="group flex items-center gap-2 text-slate-400 hover:text-primary transition-all font-medium">
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
                                storageMode={selectedStorageMode}
                                preferredStorageMode={preferredStorageMode}
                                onStorageModeChange={handleStorageModeChange}
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
                                creatingLabel={creatingLabel}
                                isAiEnabled={isAiEnabled}
                            />
                        )}

                        {step === 'import' && state.type && (
                            <ImportWizard 
                                projectType={state.type}
                                onComplete={(chunks) => createProject({ chunks })}
                                onBack={() => setStep('start_mode')}
                                creating={creating}
                                creatingLabel={creatingLabel}
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
                                creatingLabel={creatingLabel}
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
    const { theme } = useTheme()
    const isMidnight = theme === 'midnight'
    return (
        <div className="fade-in space-y-10">
            <div className="space-y-4">
                <h1 className={cn('text-4xl md:text-5xl font-serif leading-tight', isMidnight ? 'text-slate-100' : 'text-slate-800')}>
                    Create a<br /><span className={cn('italic', isMidnight ? 'text-slate-400' : 'text-slate-400')}>new project</span>
                </h1>
                <p className={cn('font-medium text-lg leading-relaxed max-w-xl italic opacity-80', isMidnight ? 'text-slate-300' : 'text-slate-500')}>Choose the type of project you want to write.</p>
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
    const { theme } = useTheme()
    const isMidnight = theme === 'midnight'
    return (
        <div className="fade-in space-y-10">
            <div className="space-y-4">
                <h1 className={cn('text-4xl md:text-5xl font-serif leading-tight', isMidnight ? 'text-slate-100' : 'text-slate-800')}>
                    What are we<br /><span className={cn('italic', isMidnight ? 'text-slate-400' : 'text-slate-400')}>writing today?</span>
                </h1>
                <p className={cn('font-medium italic opacity-60', isMidnight ? 'text-slate-300' : 'text-slate-500')}>You can change editor settings later in Project Settings.</p>
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

function StepStartMode({ value, projectType, storageMode, preferredStorageMode, onStorageModeChange, onSelect, onBack, creating }: {
    value: StartMode | null
    projectType: ProjectType
    storageMode: PreferredStorageMode
    preferredStorageMode: PreferredStorageMode
    onStorageModeChange: (mode: PreferredStorageMode) => void
    onSelect: (m: StartMode) => void
    onBack: () => void
    creating: boolean
}) {
    const { theme } = useTheme()
    const isMidnight = theme === 'midnight'
    return (
        <div className="fade-in space-y-10">
            <div className="space-y-4">
                <h1 className={cn('text-4xl md:text-5xl font-serif leading-tight', isMidnight ? 'text-slate-100' : 'text-slate-800')}>
                    How shall we<br /><span className={cn('italic', isMidnight ? 'text-slate-400' : 'text-slate-400')}>begin?</span>
                </h1>
                <p className={cn('font-medium', isMidnight ? 'text-slate-300' : 'text-slate-500')}>Choose how you want to start.</p>
            </div>

            <StorageModeSelector
                value={storageMode}
                preferredStorageMode={preferredStorageMode}
                onChange={onStorageModeChange}
                disabled={creating}
            />

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

function StorageModeSelector({ value, preferredStorageMode, onChange, disabled }: {
    value: PreferredStorageMode
    preferredStorageMode: PreferredStorageMode
    onChange: (mode: PreferredStorageMode) => void
    disabled?: boolean
}) {
    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="text-xs font-bold uppercase tracking-[0.24em] text-[#546354]/70">Storage</div>
                    <p className="text-sm text-slate-500 font-medium">Choose where this project will be stored.</p>
                </div>
                <div className="text-xs text-slate-400 font-semibold">
                    Default: {preferredStorageMode === 'cloud' ? 'Cloud & collaboration' : 'Private on this device'}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <StorageModeOption
                    icon={<LockKeyhole className="w-5 h-5" />}
                    title="Private on this device"
                    description="Stored locally. Works offline. You can enable cloud later."
                    selected={value === 'local'}
                    disabled={disabled}
                    onClick={() => onChange('local')}
                />
                <StorageModeOption
                    icon={<Cloud className="w-5 h-5" />}
                    title="Cloud & collaboration"
                    description="Stored in the cloud. Supports collaboration and access across devices."
                    selected={value === 'cloud'}
                    disabled={disabled}
                    onClick={() => onChange('cloud')}
                />
            </div>
        </div>
    )
}

function StorageModeOption({ icon, title, description, selected, disabled, onClick }: {
    icon: React.ReactNode
    title: string
    description: string
    selected: boolean
    disabled?: boolean
    onClick: () => void
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-pressed={selected}
            className={cn(
                'group h-full min-h-32 text-left p-5 rounded-2xl transition-all duration-300 border-2 outline-none active:scale-[0.99]',
                selected
                    ? 'bg-white border-[#546354]/30 shadow-[0_12px_36px_rgba(84,99,84,0.1)]'
                    : 'bg-stone-50/60 border-transparent hover:bg-white hover:border-slate-100 hover:shadow-[0_14px_36px_rgba(0,0,0,0.05)]',
                disabled && 'opacity-50 cursor-not-allowed'
            )}
        >
            <div className="flex items-start gap-4">
                <div className={cn(
                    'w-10 h-10 rounded-xl flex shrink-0 items-center justify-center transition-all duration-300',
                    selected ? 'bg-[#546354] text-white shadow-lg shadow-[#546354]/15' : 'bg-white text-slate-400 group-hover:text-[#546354]'
                )}>
                    {icon}
                </div>
                <div className="min-w-0">
                    <div className="text-base font-bold text-slate-800 leading-tight">{title}</div>
                    <p className="mt-1 text-sm text-slate-500 leading-relaxed font-medium">{description}</p>
                </div>
            </div>
        </button>
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

function StepIdentity({ value, onChange, onFileChange, onComplete, onBack, creating, creatingLabel }: {
    value: string
    onChange: (v: string) => void
    onFileChange: (file: File | null) => void
    onComplete: () => void
    onBack: () => void
    creating: boolean
    creatingLabel: string
}) {
    const { theme } = useTheme()
    const isMidnight = theme === 'midnight'
    return (
        <div className="fade-in space-y-10">
            <div className="space-y-4">
                <h1 className={cn('text-4xl md:text-5xl font-serif leading-tight', isMidnight ? 'text-slate-100' : 'text-slate-800')}>
                    Add a<br /><span className={cn('italic', isMidnight ? 'text-slate-400' : 'text-slate-400')}>visual soul</span>
                </h1>
                <p className={cn('font-medium text-lg leading-relaxed max-w-xl italic opacity-80', isMidnight ? 'text-slate-300' : 'text-slate-500')}>Choose a cover for your library card or skip to keep it minimal.</p>
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
                            {creatingLabel}
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
