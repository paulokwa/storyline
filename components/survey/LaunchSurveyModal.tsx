'use client'

import { useState } from 'react'
import { X, ChevronRight, Heart, Meh, Frown, Smile } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export const SURVEY_STORAGE_KEY = 'storyline_survey_v1'

type UseCase = 'book' | 'screenplay' | 'both' | 'exploring'
type Satisfaction = 'great' | 'ok' | 'not_great'

const USE_CASE_OPTIONS: { value: UseCase; label: string; emoji: string }[] = [
    { value: 'book', label: 'Writing a book', emoji: '📖' },
    { value: 'screenplay', label: 'Writing a screenplay', emoji: '🎬' },
    { value: 'both', label: 'Both', emoji: '✍️' },
    { value: 'exploring', label: 'Just exploring', emoji: '🔍' },
]

const SATISFACTION_OPTIONS: { value: Satisfaction; label: string; Icon: typeof Heart }[] = [
    { value: 'great', label: "It's great!", Icon: Smile },
    { value: 'ok', label: "It's okay", Icon: Meh },
    { value: 'not_great', label: 'Needs work', Icon: Frown },
]

type Props = {
    open: boolean
    onClose: () => void
    projectCount?: number
}

export default function LaunchSurveyModal({ open, onClose, projectCount }: Props) {
    const [step, setStep] = useState(1)
    const [useCase, setUseCase] = useState<UseCase | null>(null)
    const [satisfaction, setSatisfaction] = useState<Satisfaction | null>(null)
    const [feedbackText, setFeedbackText] = useState('')
    const [submitting, setSubmitting] = useState(false)

    if (!open) return null

    const handleClose = () => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(SURVEY_STORAGE_KEY, 'dismissed')
        }
        onClose()
    }

    const handleSubmit = async (skipFeedback = false) => {
        setSubmitting(true)
        try {
            const response = await fetch('/api/survey', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    use_case: useCase,
                    satisfaction,
                    feedback_text: skipFeedback ? '' : feedbackText.trim(),
                    page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
                    project_count: projectCount,
                    app_version: '0.1.0',
                }),
            })
            if (!response.ok) {
                throw new Error('Survey save failed')
            }
            if (typeof window !== 'undefined') {
                localStorage.setItem(SURVEY_STORAGE_KEY, 'completed')
            }
            toast.success('Thanks for the feedback!', {
                description: "It really helps shape where Storyline goes next.",
            })
            onClose()
        } catch {
            toast.error('Survey could not be saved. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                onClick={handleClose}
            />
            <div className="relative w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-200/50 sm:p-8">
                {/* Close */}
                <button
                    type="button"
                    onClick={handleClose}
                    className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Close"
                >
                    <X className="h-4 w-4" />
                </button>

                {/* Step indicator */}
                <div className="mb-6 flex items-center gap-1.5">
                    {[1, 2, 3].map((s) => (
                        <div
                            key={s}
                            className={cn(
                                'h-1.5 rounded-full transition-all',
                                s === step ? 'w-6 bg-slate-700' : s < step ? 'w-4 bg-slate-300' : 'w-4 bg-slate-100'
                            )}
                        />
                    ))}
                </div>

                {step === 1 && (
                    <>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Quick question</p>
                        <h2 className="mt-3 font-serif text-2xl italic text-slate-900">What are you mainly using Storyline for?</h2>

                        <div className="mt-6 grid grid-cols-2 gap-3">
                            {USE_CASE_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setUseCase(opt.value)}
                                    className={cn(
                                        'flex flex-col items-start gap-1 rounded-2xl border p-4 text-left text-sm font-medium transition',
                                        useCase === opt.value
                                            ? 'border-slate-700 bg-slate-50 text-slate-900 shadow-sm'
                                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/80'
                                    )}
                                >
                                    <span className="text-xl">{opt.emoji}</span>
                                    <span>{opt.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                disabled={!useCase}
                                onClick={() => setStep(2)}
                                className="flex items-center gap-1.5 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </>
                )}

                {step === 2 && (
                    <>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">So far</p>
                        <h2 className="mt-3 font-serif text-2xl italic text-slate-900">How's it going?</h2>

                        <div className="mt-6 flex gap-3">
                            {SATISFACTION_OPTIONS.map((opt) => {
                                const Icon = opt.Icon
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setSatisfaction(opt.value)}
                                        className={cn(
                                            'flex flex-1 flex-col items-center gap-2 rounded-2xl border py-5 text-xs font-medium transition',
                                            satisfaction === opt.value
                                                ? 'border-slate-700 bg-slate-50 text-slate-900 shadow-sm'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/80'
                                        )}
                                    >
                                        <Icon className="h-6 w-6" strokeWidth={1.5} />
                                        {opt.label}
                                    </button>
                                )
                            })}
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                disabled={!satisfaction}
                                onClick={() => setStep(3)}
                                className="flex items-center gap-1.5 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </>
                )}

                {step === 3 && (
                    <>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Optional</p>
                        <h2 className="mt-3 font-serif text-2xl italic text-slate-900">Anything you'd like to see?</h2>
                        <p className="mt-2 text-sm text-slate-500">A feature, improvement, or anything on your mind. Totally optional.</p>

                        <textarea
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="I'd love it if…"
                            rows={4}
                            maxLength={2000}
                            className="mt-4 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:outline-none"
                        />

                        <div className="mt-5 flex items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={() => handleSubmit(true)}
                                disabled={submitting}
                                className="text-sm text-slate-400 underline-offset-2 transition hover:text-slate-600 hover:underline disabled:opacity-40"
                            >
                                Skip
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSubmit(false)}
                                disabled={submitting}
                                className="flex items-center gap-1.5 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {submitting ? 'Sending…' : 'Send feedback'}
                                {!submitting && <Heart className="h-3.5 w-3.5" />}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
