'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import type { ProjectType } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

interface GuidedData {
    title: string
    premise: string
    tone: string
    firstCharacterName: string
    setting: string
    firstIdea: string
}

interface GuidedFlowProps {
    projectType: ProjectType
    initialTitle?: string
    onComplete: (data: GuidedData) => void
    onBack: () => void
    creating: boolean
}

type GuidedStep = 'title' | 'premise' | 'tone' | 'character' | 'setting' | 'first_idea'

const STEPS: GuidedStep[] = ['premise', 'tone', 'character', 'setting', 'first_idea']

// Map internal steps to Stitch visual labels
const STAGE_LABELS: Record<GuidedStep, string> = {
    title: 'First Spark',
    premise: 'Concept',
    tone: 'Tone & Style',
    character: 'Protagonist',
    setting: 'Setting',
    first_idea: 'Vision'
}

const TONES = [
    'Dark & Dramatic', 'Light & Funny', 'Mysterious', 'Romantic',
    'Adventurous', 'Heartwarming', 'Suspenseful', 'Quirky',
]

export default function GuidedFlow({ projectType, initialTitle, onComplete, onBack, creating }: GuidedFlowProps) {
    const [stepIndex, setStepIndex] = useState(0)
    const [data, setData] = useState<GuidedData>({
        title: initialTitle || '',
        premise: '',
        tone: '',
        firstCharacterName: '',
        setting: '',
        firstIdea: '',
    })

    const step = STEPS[stepIndex]
    const isScriptProject = projectType === 'tv_script'

    function next() {
        if (stepIndex < STEPS.length - 1) setStepIndex(s => s + 1)
        else onComplete(data)
    }

    function back() {
        if (stepIndex === 0) onBack()
        else setStepIndex(s => s - 1)
    }

    function canAdvance() {
        if (step === 'title') return data.title.trim().length > 0
        if (step === 'premise') return data.premise.trim().length > 0
        if (step === 'character') return data.firstCharacterName.trim().length > 0
        return true
    }

    return (
        <div className="fade-in space-y-12">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-[#546354]/60">
                        Guided Flow · {stepIndex + 1} of {STEPS.length}
                    </span>
                    <div className="w-24 h-1 bg-stone-200/40 rounded-full overflow-hidden shadow-inner">
                        <div
                            className="h-full bg-[#546354] rounded-full transition-all duration-1000 ease-in-out"
                            style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
                        />
                    </div>
                    <h2 className="text-sm font-medium text-slate-400 mt-1">Phase: {STAGE_LABELS[step]}</h2>
                </div>
            </div>

            {step === 'title' && (
                <StepBlock
                    title="What is your manuscript called?"
                    hint="Give your creative journey a temporary name. You can refine this at any point."
                >
                    <Input
                        id="title"
                        value={data.title}
                        onChange={(e) => setData(d => ({ ...d, title: e.target.value }))}
                        placeholder={isScriptProject ? 'e.g. Breaking Point' : 'e.g. The Last Summer'}
                        className="h-16 text-xl bg-stone-50/50 border-transparent focus:bg-white focus:border-primary/20 rounded-2xl px-6 transition-all font-serif italic"
                        autoFocus
                    />
                </StepBlock>
            )}

            {step === 'premise' && (
                <StepBlock
                    title="What is the central story?"
                    hint="Describe the core conflict or the question your story seeks to answer."
                >
                    <Textarea
                        value={data.premise}
                        onChange={(e) => setData(d => ({ ...d, premise: e.target.value }))}
                        placeholder={isScriptProject
                            ? 'e.g. A chemistry teacher turned criminal tries to hold his family together while building an empire.'
                            : 'e.g. A young woman returns to her hometown after 10 years away and uncovers a family secret.'}
                        rows={6}
                        className="resize-none text-lg leading-relaxed bg-stone-50/50 border-transparent focus:bg-white focus:border-primary/20 rounded-3xl p-8 transition-all font-serif italic"
                    />
                </StepBlock>
            )}

            {step === 'tone' && (
                <StepBlock
                    title="Setting the tonal anchor"
                    hint="Select the emotional frequency of your narrative universe."
                    optional
                >
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        {TONES.map((t) => (
                            <button
                                key={t}
                                onClick={() => setData(d => ({ ...d, tone: d.tone === t ? '' : t }))}
                                className={cn(
                                    'text-sm py-4 px-5 rounded-2xl transition-all text-left font-medium border-2 active:scale-[0.98]',
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
                        className="h-14 text-base bg-stone-50/50 border-transparent focus:bg-white focus:border-primary/20 rounded-2xl px-6 transition-all"
                    />
                </StepBlock>
            )}

            {step === 'character' && (
                <StepBlock
                    title="Who is the protagonist?"
                    hint="A name to center the story around. You will layer their history in the characters tab."
                >
                    <Input
                        value={data.firstCharacterName}
                        onChange={(e) => setData(d => ({ ...d, firstCharacterName: e.target.value }))}
                        placeholder="e.g. Maya Chen"
                        className="h-16 text-xl bg-stone-50/50 border-transparent focus:bg-white focus:border-primary/20 rounded-2xl px-6 transition-all font-medium"
                        autoFocus
                    />
                </StepBlock>
            )}

            {step === 'setting' && (
                <StepBlock
                    title="Where does the story live?"
                    hint="A specific location, an era, or an entirely new world."
                    optional
                >
                    <Input
                        value={data.setting}
                        onChange={(e) => setData(d => ({ ...d, setting: e.target.value }))}
                        placeholder={isScriptProject ? 'e.g. Modern-day New Mexico' : 'e.g. 1940s rural France'}
                        className="h-16 text-xl bg-stone-50/50 border-transparent focus:bg-white focus:border-primary/20 rounded-2xl px-6 transition-all"
                    />
                </StepBlock>
            )}

            {step === 'first_idea' && (
                <StepBlock
                    title={isScriptProject ? 'The pilot opening...' : 'The first chapter opening...'}
                    hint="An evocative image or moment to bridge the gap to your first page."
                    optional
                >
                    <Textarea
                        value={data.firstIdea}
                        onChange={(e) => setData(d => ({ ...d, firstIdea: e.target.value }))}
                        placeholder={isScriptProject
                            ? 'e.g. We meet our protagonist at work, seconds before a life-altering phone call...'
                            : 'e.g. The smell of cedar and old paper fills the air as she enters the library for the last time...'}
                        rows={6}
                        className="resize-none text-lg leading-relaxed bg-stone-50/50 border-transparent focus:bg-white focus:border-primary/20 rounded-3xl p-8 transition-all font-serif italic"
                    />
                </StepBlock>
            )}

            <div className="flex items-center justify-between pt-10 border-t border-stone-100">
                <button
                    onClick={back}
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-primary transition-all disabled:opacity-30"
                    disabled={creating}
                >
                    <ChevronLeft className="w-4 h-4" /> Go Back
                </button>

                <Button
                    onClick={next}
                    disabled={!canAdvance() || creating}
                    className="sanctuary-btn-primary h-14 px-10 rounded-full text-base font-semibold gap-3"
                >
                    {creating ? (
                        <><Sparkles className="w-4 h-4 animate-spin-slow" /> Creating Sanctuary...</>
                    ) : stepIndex === STEPS.length - 1 ? (
                        <>Initialize Archive <ChevronRight className="w-5 h-5" /></>
                    ) : (
                        <>Continue <ChevronRight className="w-5 h-5" /></>
                    )}
                </Button>
            </div>
        </div>
    )
}

function StepBlock({ title, hint, optional, children }: {
    title: string
    hint: string
    optional?: boolean
    children: React.ReactNode
}) {
    return (
        <div className="space-y-8">
            <div className="space-y-3">
                <div className="flex items-baseline gap-4">
                    <h1 className="text-2xl md:text-4xl font-serif text-slate-800 leading-tight tracking-tight">{title}</h1>
                    {optional && <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300 translate-y-[-2px]">Optional</span>}
                </div>
                <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-xl italic opacity-80">{hint}</p>
            </div>
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                {children}
            </div>
        </div>
    )
}
