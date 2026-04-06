'use client'

import { useEffect } from 'react'
import { X, Sparkles, FileText, Zap, Timer, MessageSquare, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AnalysisResult {
    summary: string
    tension: string
    pacing: string
    dialogue: string
    suggestions: string[]
}

interface SceneAnalysisPanelProps {
    result: AnalysisResult | null
    onClose: () => void
}

const SECTIONS = [
    { key: 'summary',   label: 'Summary',    icon: FileText,      color: 'text-slate-500',   bg: 'bg-slate-50',    border: 'border-slate-100' },
    { key: 'tension',   label: 'Tension',    icon: Zap,           color: 'text-amber-500',   bg: 'bg-amber-50/60', border: 'border-amber-100' },
    { key: 'pacing',    label: 'Pacing',     icon: Timer,         color: 'text-blue-500',    bg: 'bg-blue-50/60',  border: 'border-blue-100' },
    { key: 'dialogue',  label: 'Dialogue',   icon: MessageSquare, color: 'text-violet-500',  bg: 'bg-violet-50/60',border: 'border-violet-100' },
] as const

export default function SceneAnalysisPanel({ result, onClose }: SceneAnalysisPanelProps) {
    // Close on Escape key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [onClose])

    const isOpen = result !== null

    return (
        <>
            {/* Backdrop — click to close */}
            <div
                className={cn(
                    'fixed inset-0 z-40 transition-all duration-300',
                    isOpen ? 'pointer-events-auto bg-slate-900/5 backdrop-blur-[1px]' : 'pointer-events-none bg-transparent'
                )}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Slide-in Panel */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Scene Analysis"
                className={cn(
                    'fixed right-0 top-0 h-full z-50 w-[420px] max-w-[92vw]',
                    'bg-[#fcfbf9] border-l border-slate-200/60 shadow-[-20px_0_60px_rgba(0,0,0,0.06)]',
                    'flex flex-col transition-transform duration-300 ease-in-out',
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                )}
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-200/60 flex items-center gap-3 bg-white/50 backdrop-blur-sm shrink-0">
                    <div className="p-2 bg-violet-50 rounded-xl">
                        <Sparkles className="w-4 h-4 text-violet-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-serif font-bold text-slate-800">Scene Analysis</h3>
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">AI Suggestions · Not Directives</p>
                    </div>
                    <button
                        onClick={onClose}
                        title="Close (Esc)"
                        className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-all shrink-0"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto">
                    {result && (
                        <div className="p-5 space-y-4">

                            {/* Disclaimer */}
                            <p className="text-[11px] text-slate-400 font-serif italic text-center px-2 leading-relaxed">
                                These observations are meant to inspire, not instruct.
                                Your story is yours — take what helps.
                            </p>

                            {/* Summary, Tension, Pacing, Dialogue */}
                            {SECTIONS.map(({ key, label, icon: Icon, color, bg, border }) => (
                                <div
                                    key={key}
                                    className={cn(
                                        'rounded-2xl p-4 border',
                                        bg, border
                                    )}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <Icon className={cn('w-3.5 h-3.5 shrink-0', color)} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                            {label}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-700 font-serif leading-relaxed">
                                        {result[key]}
                                    </p>
                                </div>
                            ))}

                            {/* Suggestions */}
                            {result.suggestions.length > 0 && (
                                <div className="rounded-2xl p-4 border bg-green-50/50 border-green-100">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Lightbulb className="w-3.5 h-3.5 shrink-0 text-green-500" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                            Suggestions
                                        </span>
                                    </div>
                                    <ul className="space-y-2.5">
                                        {result.suggestions.map((s, i) => (
                                            <li key={i} className="flex items-start gap-2.5">
                                                <span className="shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-600 text-[10px] font-bold flex items-center justify-center mt-0.5">
                                                    {i + 1}
                                                </span>
                                                <p className="text-sm text-slate-700 font-serif leading-relaxed">{s}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Footer note */}
                            <p className="text-[10px] text-slate-300 text-center pb-2 font-medium tracking-wide">
                                Analysis used {result.summary.length + result.tension.length + result.pacing.length + result.dialogue.length} characters · Scene text only
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
