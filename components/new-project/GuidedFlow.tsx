'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ChevronRight, Sparkles, Image as ImageIcon } from 'lucide-react'
import type { ProjectType } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'
import CoverPicker from '@/components/project/CoverPicker'

interface GuidedData {
    title: string
    premise: string
    tone: string
    characters: string[]
    locations: string[]
    firstIdea: string
    coverUrl: string
}

interface GuidedFlowProps {
    projectType: ProjectType
    initialTitle?: string
    onComplete: (data: GuidedData & { coverFile?: File | null }) => void
    onBack: () => void
    creating: boolean
    onDataChange?: (data: GuidedData) => void
}

type GuidedStep = 'title' | 'premise' | 'tone' | 'character' | 'setting' | 'first_idea' | 'identity'

const STEPS: GuidedStep[] = ['premise', 'tone', 'character', 'setting', 'first_idea', 'identity']

// Map internal steps to Stitch visual labels
const STAGE_LABELS: Record<GuidedStep, string> = {
    title: 'First Spark',
    premise: 'Concept',
    tone: 'Story Tone',
    character: 'Protagonists',
    setting: 'World & Locations',
    first_idea: 'Vision',
    identity: 'Identity'
}

const STEP_IMAGES: Record<GuidedStep, string> = {
    title: '/assets/onboarding/step-spark.png',
    premise: '/assets/onboarding/step-concept.png',
    tone: '/assets/onboarding/step-tone.png',
    character: '/assets/onboarding/step-hero.png',
    setting: '/assets/onboarding/step-world.png',
    first_idea: '/assets/onboarding/step-vision.png',
    identity: '/assets/onboarding/step-identity.png'
}

const TONES = [
    'Dark & Dramatic', 'Light & Funny', 'Mysterious', 'Romantic',
    'Adventurous', 'Heartwarming', 'Suspenseful', 'Quirky',
]


export default function GuidedFlow({ projectType, initialTitle, onComplete, onBack, creating, onDataChange }: GuidedFlowProps) {
    const [stepIndex, setStepIndex] = useState(0)
    const [coverFile, setCoverFile] = useState<File | null>(null)
    const [data, setData] = useState<GuidedData>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('storyline-guided-data-draft')
            if (saved) {
                try {
                    return JSON.parse(saved)
                } catch (e) {
                    console.error("Failed to load guided draft", e)
                }
            }
        }
        return {
            title: initialTitle || '',
            premise: '',
            tone: '',
            characters: [''],
            locations: [''],
            firstIdea: '',
            coverUrl: '',
        }
    })

    useEffect(() => {
        localStorage.setItem('storyline-guided-data-draft', JSON.stringify(data))
        onDataChange?.(data)
    }, [data, onDataChange])

    const step = STEPS[stepIndex]
    const isScriptProject = projectType === 'tv_script'

    function next() {
        if (stepIndex < STEPS.length - 1) setStepIndex(s => s + 1)
        else {
            // Clean up empty strings before completion
            onComplete({
                ...data,
                characters: data.characters.filter(c => c.trim() !== ''),
                locations: data.locations.filter(l => l.trim() !== ''),
                coverFile,
            })
        }
    }

    function back() {
        if (stepIndex === 0) onBack()
        else setStepIndex(s => s - 1)
    }

    function canAdvance() {
        if (step === 'title') return data.title.trim().length > 0
        if (step === 'premise') return data.premise.trim().length > 0
        if (step === 'character') return data.characters.some(c => c.trim().length > 0)
        return true
    }

    const addItem = (field: 'characters' | 'locations') => {
        setData(d => ({ ...d, [field]: [...d[field], ''] }))
    }

    const updateItem = (field: 'characters' | 'locations', index: number, value: string) => {
        const newList = [...data[field]]
        newList[index] = value
        setData(d => ({ ...d, [field]: newList }))
    }

    const removeItem = (field: 'characters' | 'locations', index: number) => {
        if (data[field].length <= 1) return
        setData(d => ({ ...d, [field]: d[field].filter((_, i) => i !== index) }))
    }

    return (
        <div className="guided-flow-shell fade-in space-y-12">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-2 w-full">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-[#546354]/60">
                            Guided Flow · {stepIndex + 1} of {STEPS.length}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phase: {STAGE_LABELS[step]}</span>
                    </div>
                    <div className="w-full h-1 bg-stone-200/40 rounded-full overflow-hidden shadow-inner">
                        <div
                            className="h-full bg-[#546354] rounded-full transition-all duration-1000 ease-in-out"
                            style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-12">
                    {step === 'title' && (
                        <StepBlock
                            title="What is your manuscript called?"
                            hint="Give your creative journey a temporary name. You can refine this at any point."
                            image={STEP_IMAGES[step]}
                        >
                            <Input
                                id="title"
                                value={data.title}
                                onChange={(e) => setData(d => ({ ...d, title: e.target.value }))}
                                placeholder={isScriptProject ? 'e.g. Breaking Point' : 'e.g. The Last Summer'}
                                className="guided-flow-input h-16 text-xl bg-stone-50/50 border-transparent focus:bg-white focus:border-primary/20 rounded-2xl px-6 transition-all font-serif italic"
                                autoFocus
                            />
                        </StepBlock>
                    )}

                    {step === 'premise' && (
                        <StepBlock
                            title="What is the central story?"
                            hint="Describe the core conflict or the question your story seeks to answer."
                            image={STEP_IMAGES[step]}
                        >
                            <Textarea
                                value={data.premise}
                                onChange={(e) => setData(d => ({ ...d, premise: e.target.value }))}
                                placeholder={isScriptProject
                                    ? 'e.g. A chemistry teacher turned criminal tries to hold his family together while building an empire.'
                                    : 'e.g. A young woman returns to her hometown after 10 years away and uncovers a family secret.'}
                                rows={6}
                                className="guided-flow-textarea resize-none text-lg leading-relaxed bg-stone-50/50 border-transparent focus:bg-white focus:border-primary/20 rounded-3xl p-8 transition-all font-serif italic"
                            />
                        </StepBlock>
                    )}

                    {step === 'tone' && (
                        <StepBlock
                            title="What is the story's tone?"
                            hint="This guides future AI suggestions for atmosphere. It's optional and can be adjusted anytime."
                            optional
                            image={STEP_IMAGES[step]}
                        >
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                {TONES.map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setData(d => ({ ...d, tone: d.tone === t ? '' : t }))}
                                        className={cn(
                                            'guided-flow-chip text-sm py-4 px-5 rounded-2xl transition-all text-left font-medium border-2 active:scale-[0.98]',
                                            data.tone === t
                                                ? 'border-primary bg-primary/5 text-primary shadow-inner'
                                                : 'border-transparent bg-stone-50/50 text-slate-500 hover:bg-stone-100 hover:text-slate-800'
                                        )}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                            <Input
                                value={data.tone && !TONES.includes(data.tone) ? data.tone : ''}
                                onChange={(e) => setData(d => ({ ...d, tone: e.target.value }))}
                                placeholder="Or define a custom vibe…"
                                className="guided-flow-input h-14 text-base bg-stone-50/50 border-transparent focus:bg-white focus:border-primary/20 rounded-2xl px-6 transition-all"
                            />
                        </StepBlock>
                    )}

                    {step === 'character' && (
                        <StepBlock
                            title="Who are your protagonists?"
                            hint="Add the main characters driving this story. You can add more detailed history later."
                            image={STEP_IMAGES[step]}
                        >
                            <div className="space-y-4">
                                {data.characters.map((name, i) => (
                                    <div key={i} className="flex gap-2">
                                        <Input
                                            value={name}
                                            onChange={(e) => updateItem('characters', i, e.target.value)}
                                            placeholder={i === 0 ? "e.g. Maya Chen" : "Add another character..."}
                                            className="guided-flow-input h-16 text-xl bg-stone-50/50 border-transparent focus:bg-white focus:border-primary/20 rounded-2xl px-6 transition-all font-medium"
                                            autoFocus={i === data.characters.length - 1 && i > 0}
                                        />
                                        {data.characters.length > 1 && (
                                            <Button variant="ghost" className="guided-flow-remove h-16 rounded-2xl px-4 text-slate-300 hover:text-red-400" onClick={() => removeItem('characters', i)}>×</Button>
                                        )}
                                    </div>
                                ))}
                                <button 
                                    onClick={() => addItem('characters')}
                                    className="text-xs font-bold uppercase tracking-widest text-primary/60 hover:text-primary transition-colors flex items-center gap-2 pl-2"
                                >
                                    + Add Character
                                </button>
                            </div>
                        </StepBlock>
                    )}

                    {step === 'setting' && (
                        <StepBlock
                            title="Where does the story live?"
                            hint="Major locations, eras, or worlds. You can refine and add specific settings later."
                            optional
                            image={STEP_IMAGES[step]}
                        >
                              <div className="space-y-4">
                                {data.locations.map((loc, i) => (
                                    <div key={i} className="flex gap-2">
                                        <Input
                                            value={loc}
                                            onChange={(e) => updateItem('locations', i, e.target.value)}
                                            placeholder={isScriptProject ? 'e.g. Modern-day New Mexico' : 'e.g. 1940s rural France'}
                                            className="guided-flow-input h-16 text-xl bg-stone-50/50 border-transparent focus:bg-white focus:border-primary/20 rounded-2xl px-6 transition-all font-medium"
                                            autoFocus={i === data.locations.length - 1 && i > 0}
                                        />
                                        {data.locations.length > 1 && (
                                            <Button variant="ghost" className="guided-flow-remove h-16 rounded-2xl px-4 text-slate-300 hover:text-red-400" onClick={() => removeItem('locations', i)}>×</Button>
                                        )}
                                    </div>
                                ))}
                                <button 
                                    onClick={() => addItem('locations')}
                                    className="text-xs font-bold uppercase tracking-widest text-primary/60 hover:text-primary transition-colors flex items-center gap-2 pl-2"
                                >
                                    + Add Location
                                </button>
                            </div>
                        </StepBlock>
                    )}

                    {step === 'first_idea' && (
                        <StepBlock
                            title={isScriptProject ? 'The screenplay opening...' : 'The book opening...'}
                            hint="An evocative image or moment to bridge the gap to your first page."
                            optional
                            image={STEP_IMAGES[step]}
                        >
                            <Textarea
                                value={data.firstIdea}
                                onChange={(e) => setData(d => ({ ...d, firstIdea: e.target.value }))}
                                placeholder={isScriptProject
                                    ? 'e.g. We meet our protagonist at work, seconds before a life-altering phone call...'
                                    : 'e.g. The smell of cedar and old paper fills the air as she enters the library for the last time...'}
                                rows={6}
                                className="guided-flow-textarea resize-none text-lg leading-relaxed bg-stone-50/50 border-transparent focus:bg-white focus:border-primary/20 rounded-3xl p-8 transition-all font-serif italic"
                            />
                        </StepBlock>
                    )}

                    {step === 'identity' && (
                        <StepBlock
                            title="Choose a library cover"
                            hint="Select a thematic image for your library card or skip to keep it minimalist."
                            optional
                            image={STEP_IMAGES[step]}
                        >
                            <CoverPicker 
                                value={data.coverUrl}
                                onChange={(url) => setData(d => ({ ...d, coverUrl: url }))}
                                deferUpload
                                onPendingFileChange={setCoverFile}
                            />
                        </StepBlock>
                    )}
                </div>
            </div>

            <div className="guided-flow-footer flex flex-col-reverse gap-3 border-t border-stone-100 pt-8 sm:flex-row sm:items-center sm:justify-between sm:pt-10">
                <button
                    onClick={back}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white/80 px-4 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 transition-all hover:border-primary/20 hover:text-primary disabled:opacity-30 sm:h-auto sm:w-auto sm:justify-start sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:text-xs sm:tracking-widest"
                    disabled={creating}
                >
                    <ChevronLeft className="w-4 h-4" /> Go Back
                </button>

                <Button
                    onClick={next}
                    disabled={!canAdvance() || creating}
                    className="sanctuary-btn-primary h-14 w-full rounded-[1.75rem] px-6 text-base font-semibold gap-3 sm:w-auto sm:px-10 sm:rounded-full"
                >
                    {creating ? (
                        <><Sparkles className="w-4 h-4 animate-spin-slow" /> Creating Sanctuary...</>
                    ) : stepIndex === STEPS.length - 1 ? (
                        <>Initialize Archive <ChevronRight className="w-5 h-5" /></>
                    ) : (
                        <>
                            {step === 'tone' && !data.tone ? 'Skip for now' : 
                             step === 'identity' && !data.coverUrl ? 'Skip for now' : 'Continue'} 
                            <ChevronRight className="w-5 h-5" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}

function StepBlock({ title, hint, optional, image, children }: {
    title: string
    hint: string
    optional?: boolean
    image?: string
    children: React.ReactNode
}) {
    return (
        <div className="guided-flow-step grid grid-cols-1 md:grid-cols-12 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="md:col-span-7 space-y-8">
                <div className="guided-flow-copy space-y-3">
                    <div className="flex items-baseline gap-4">
                        <h1 className="text-2xl md:text-3xl font-serif text-slate-800 leading-tight tracking-tight">{title}</h1>
                        {optional && <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300 translate-y-[-2px]">Optional</span>}
                    </div>
                    <p className="text-slate-500 font-medium text-lg leading-relaxed italic opacity-80">{hint}</p>
                </div>
                <div className="space-y-6">
                    {children}
                </div>
            </div>
            {image && (
                <div className="md:col-span-5 hidden md:block">
                    <div className="guided-flow-visual relative aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl shadow-stone-200/50 group">
                        <img 
                            src={image} 
                            alt={title} 
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-tr from-stone-900/20 to-transparent pointer-events-none" />
                        <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-[2rem] pointer-events-none" />
                    </div>
                </div>
            )}
        </div>
    )
}
