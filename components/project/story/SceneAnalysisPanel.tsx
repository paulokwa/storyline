import { useEffect, useState } from 'react'
import { getProjectTypeLabel } from '@/lib/constants'
import { X, Sparkles, FileText, Zap, Timer, MessageSquare, Lightbulb, Bookmark, Check, Loader2, BrainCircuit, PlusCircle } from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from '@/lib/utils'
import { saveAiResponse } from '@/lib/persistence/ai-feedback'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { getAiProviderLabel } from '@/lib/ai/providers'
import { useComments } from '@/components/project/CommentsContext'

interface AnalysisResult {
    summary: string
    tension: string
    pacing: string
    dialogue: string
    suggestions: string[]
    provider?: string
}

interface SceneAnalysisPanelProps {
    result: AnalysisResult | null
    onClose: () => void
    projectType?: 'tv_script' | 'novel'
    projectId?: string
    sceneId?: string
    nodeId?: string
}

const SECTIONS = [
    { key: 'summary',   label: 'Summary',    icon: FileText,      color: 'text-slate-500',   bg: 'bg-slate-50',    border: 'border-slate-100' },
    { key: 'tension',   label: 'Tension',    icon: Zap,           color: 'text-amber-500',   bg: 'bg-amber-50/60', border: 'border-amber-100' },
    { key: 'pacing',    label: 'Pacing',     icon: Timer,         color: 'text-blue-500',    bg: 'bg-blue-50/60',  border: 'border-blue-100' },
    { key: 'dialogue',  label: 'Dialogue',   icon: MessageSquare, color: 'text-violet-500',  bg: 'bg-violet-50/60',border: 'border-violet-100' },
] as const

export default function SceneAnalysisPanel({ result, onClose, projectType, projectId, sceneId, nodeId }: SceneAnalysisPanelProps) {
    const router = useRouter()
    const label = getProjectTypeLabel(projectType)
    const [isSaving, setIsSaving] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [savingAssistantId, setSavingAssistantId] = useState<string | number | null>(null)
    const [savedToAssistantIds, setSavedToAssistantIds] = useState<Set<string | number>>(new Set())
    const [savingFeedbackId, setSavingFeedbackId] = useState<string | number | null>(null)
    const [savedToFeedbackIds, setSavedToFeedbackIds] = useState<Set<string | number>>(new Set())
    const { addComment } = useComments()

    // Close on Escape key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [onClose])

    const handleSave = async () => {
        if (!result || !projectId) return
        setIsSaving(true)
        try {
            const formattedResponse = `
=== SCENE ANALYSIS ===
SUMMARY:
${result.summary}

TENSION:
${result.tension}

PACING:
${result.pacing}

DIALOGUE:
${result.dialogue}

SUGGESTIONS:
${result.suggestions.map((s, i) => `${i+1}. ${s}`).join('\n')}
            `.trim()

            const { error } = await saveAiResponse({
                project_id: projectId,
                title: `${label} Analysis: ${new Date().toLocaleDateString()}`,
                prompt: 'Scene Analysis Action',
                response: formattedResponse,
                type: 'analysis',
                source_label: `Analysis: ${label}`,
                model: `${getAiProviderLabel(result.provider)} (Analysis)`,
                action: 'analyze_scene',
            })

            if (error) {
                const e = error as any
                console.error('Failed to save analysis:', { message: e?.message, code: e?.code, details: e?.details, hint: e?.hint })
                throw error
            }
            setSaveSuccess(true)
            toast.success('Analysis saved to project archive')
            setTimeout(() => setSaveSuccess(false), 3000)
        } catch (err: any) {
            console.error('Failed to save analysis:', err.message || err)
            toast.error('Failed to save analysis')
        } finally {
            setIsSaving(false)
        }
    }

    const handleAddToAssistant = async (content: string, id: string | number, typeLabel?: string) => {
        if (!projectId || !content) return
        setSavingAssistantId(id)
        
        try {
            const titleInitial = content.length > 30 ? content.slice(0, 27) + '...' : content
            const feedbackTitle = typeLabel ? `${typeLabel}: ${titleInitial}` : `Suggestion: ${titleInitial}`
            const { error } = await saveAiResponse({
                project_id: projectId,
                title: feedbackTitle,
                prompt: `${label} Analysis`,
                response: content,
                type: 'analysis',
                source_label: typeLabel ? `${label} Analysis · ${typeLabel}` : `${label} Analysis · Suggestion`,
                source_scene_id: sceneId ?? null,
                source_node_id: nodeId ?? null,
                model: result?.provider ? `${getAiProviderLabel(result.provider)} (Analysis)` : null,
                action: 'analysis_feedback',
            })

            if (error) {
                const e = error as any
                console.error('Failed to save analyzer feedback:', { message: e?.message, code: e?.code, details: e?.details, hint: e?.hint })
                throw error
            }

            setSavedToAssistantIds(prev => new Set(prev).add(id))
            toast.success('Added to Assistant', {
                description: 'This analyzer insight is now available in the AI Partner context drawer.'
            })
            router.refresh()
        } catch (err: any) {
            toast.error('Failed to add to assistant')
        } finally {
            setSavingAssistantId(null)
        }
    }

    const handleSaveToFeedback = async (content: string, id: string | number, typeLabel?: string) => {
        if (!projectId || !content) return

        setSavingFeedbackId(id)

        try {
            await addComment({
                project_id: projectId,
                node_id: nodeId || undefined,
                content,
                is_shared: false,
                anchor_data: {
                    type: 'ai-analysis',
                    source: 'analysis',
                    analysis_label: typeLabel ?? 'Suggestion',
                    source_scene_id: sceneId ?? null,
                    source_node_id: nodeId ?? null,
                    project_type: projectType ?? null,
                    model: result?.provider ? `${getAiProviderLabel(result.provider)} (Analysis)` : null,
                },
            })

            setSavedToFeedbackIds(prev => new Set(prev).add(id))
            toast.success('Saved to feedback', {
                description: 'You can find this under the AI filter in Feedback.'
            })
        } catch (err: any) {
            console.error('Failed to save analyzer feedback comment:', err)
            toast.error('Failed to save to feedback')
        } finally {
            setSavingFeedbackId(null)
        }
    }

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
                aria-label={`${label} Analysis`}
                className={cn(
                    'scene-analysis-panel fixed right-0 top-0 h-full z-50 w-[420px] max-w-[92vw]',
                    'bg-[#fcfbf9] border-l border-slate-200/60 shadow-[-20px_0_60px_rgba(0,0,0,0.06)]',
                    'flex flex-col min-h-0 transition-transform duration-300 ease-in-out',
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                )}
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-200/60 flex items-center gap-3 bg-white/50 backdrop-blur-sm shrink-0">
                    <div className="p-2 bg-violet-50 rounded-xl">
                        <Sparkles className="w-4 h-4 text-violet-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-serif font-bold text-slate-800 tracking-tight">{label} Analysis</h3>
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">AI Suggestions · Not Directives</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {saveSuccess ? (
                            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2 duration-500">
                                <Check className="w-3 h-3" />
                                Saved
                            </span>
                        ) : (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleSave}
                                        disabled={isSaving || !projectId}
                                        className="h-8 w-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                    >
                                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bookmark className="w-3.5 h-3.5" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Save to Project Archive</TooltipContent>
                            </Tooltip>
                        )}

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={onClose}
                                    className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-all shrink-0"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="left">Close (Esc)</TooltipContent>
                        </Tooltip>
                    </div>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto no-scrollbar">
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
                                        'analysis-section rounded-2xl p-4 border',
                                        `analysis-section-${key}`,
                                        bg, border
                                    )}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <Icon className={cn('w-3.5 h-3.5 shrink-0', color)} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                            {label}
                                        </span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-slate-700 font-serif leading-relaxed">
                                            {result[key]}
                                        </p>
                                        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                                            {savedToFeedbackIds.has(key) ? (
                                                <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
                                                    <Check className="w-3 h-3" />
                                                    Saved to Feedback
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleSaveToFeedback(result[key], key, label)}
                                                    disabled={savingFeedbackId !== null}
                                                    className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-[#546354]/40 hover:text-amber-600 transition-all group/btn"
                                                >
                                                    {savingFeedbackId === key ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <PlusCircle className="w-3 h-3 group-hover/btn:scale-110 transition-transform" />
                                                    )}
                                                    Save to Feedback
                                                </button>
                                            )}
                                            {savedToAssistantIds.has(key) ? (
                                                <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
                                                    <Check className="w-3 h-3" />
                                                    Added to Assistant
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => handleAddToAssistant(result[key], key, label)}
                                                    disabled={savingAssistantId !== null}
                                                    className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-[#546354]/40 hover:text-indigo-600 transition-all group/btn"
                                                >
                                                    {savingAssistantId === key ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <BrainCircuit className="w-3 h-3 group-hover/btn:scale-110 transition-transform" />
                                                    )}
                                                    Add to Assistant
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Suggestions */}
                            {result.suggestions.length > 0 && (
                                <div className="analysis-section analysis-section-suggestions rounded-2xl p-4 border bg-green-50/50 border-green-100">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Lightbulb className="w-3.5 h-3.5 shrink-0 text-green-500" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                            Suggestions
                                        </span>
                                    </div>
                                    <ul className="space-y-3">
                                        {result.suggestions.map((s, i) => (
                                            <li key={i} className="group flex items-start gap-2.5 bg-white/40 p-3 rounded-xl border border-green-100/50 hover:bg-white transition-all duration-300 shadow-sm hover:shadow-md">
                                                <span className="shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-600 text-[10px] font-bold flex items-center justify-center mt-0.5">
                                                    {i + 1}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-slate-700 font-serif leading-relaxed">{s}</p>
                                                    <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                                                        {savedToFeedbackIds.has(i) ? (
                                                            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
                                                                <Check className="w-3 h-3" />
                                                                Saved to Feedback
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleSaveToFeedback(s, i)}
                                                                disabled={savingFeedbackId !== null}
                                                                className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-[#546354]/40 hover:text-amber-600 transition-all group/btn"
                                                            >
                                                                {savingFeedbackId === i ? (
                                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                                ) : (
                                                                    <PlusCircle className="w-3 h-3 group-hover/btn:scale-110 transition-transform" />
                                                                )}
                                                                Save to Feedback
                                                            </button>
                                                        )}
                                                        {savedToAssistantIds.has(i) ? (
                                                            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
                                                                <Check className="w-3 h-3" />
                                                                Added to Assistant
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={() => handleAddToAssistant(s, i)}
                                                                disabled={savingAssistantId !== null}
                                                                className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-[#546354]/40 hover:text-indigo-600 transition-all group/btn"
                                                            >
                                                                {savingAssistantId === i ? (
                                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                                ) : (
                                                                    <BrainCircuit className="w-3 h-3 group-hover/btn:scale-110 transition-transform" />
                                                                )}
                                                                Add to Assistant
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Footer note */}
                            <div className="text-[10px] text-slate-300 text-center pb-2 font-medium tracking-wide">
                                Analysis used {result.summary.length + result.tension.length + result.pacing.length + result.dialogue.length} characters · {label} text only
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}

