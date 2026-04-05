'use client'

import React, { useState, useMemo, useRef } from 'react'
import { useCompletion } from '@ai-sdk/react'
import { Sparkles, Send, Loader2, Plus, MessageSquare, AlertCircle, RefreshCcw, Copy, X, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AiHelperPanelProps {
    projectId: string
    sceneText: string
    linkedCharacters?: any[]
    linkedIdeas?: any[]
    onInsert: (text: string) => void
}

const EMPTY_HINTS = [
    'What could happen next in this scene?',
    'How should this scene end?',
    'What detail would make this scene more vivid?',
    'What is my character feeling right now?',
]

const PROMPT_TEMPLATES = [
    { label: 'What happens next?', value: 'What could happen next in this scene?' },
    { label: 'More tense', value: 'Rewrite this scene to feel more tense and urgent.' },
    { label: 'More natural', value: 'How could I rewrite this to sound more natural?' },
    { label: 'Dialogue idea', value: 'Write a short dialogue exchange that could fit here.' },
    { label: 'How to end it?', value: 'How could I end this scene effectively?' },
]

export default function AiHelperPanel({ projectId, sceneText, onInsert, linkedCharacters = [], linkedIdeas = [] }: AiHelperPanelProps) {
    const [prompt, setPrompt] = useState('')
    const [lastPrompt, setLastPrompt] = useState('')
    const [copied, setCopied] = useState(false)
    // Holds the previous response while a new one is loading — avoids blank flash
    const [previousCompletion, setPreviousCompletion] = useState('')
    const [previewOpen, setPreviewOpen] = useState(false)
    const [promptMode, setPromptMode] = useState('Continue Writing')

    // Snapshot scene text at submit time so the hook body stays stable during streaming
    const sceneTextRef = useRef(sceneText)
    sceneTextRef.current = sceneText

    const { completion, complete, isLoading, error, setCompletion } = useCompletion({
        api: '/api/ai',
        streamProtocol: 'text',
        body: useMemo(() => ({ action: 'helper', projectId }), [projectId]),
        onError: (err) => {
            console.error('AI Error:', err)
        }
    })

    // What to display: live completion takes priority; fall back to previous while loading
    const displayedCompletion = completion || (isLoading ? previousCompletion : '')
    const isShowingPrevious = isLoading && !completion && !!previousCompletion

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const currentPrompt = prompt.trim()
        if (!currentPrompt && promptMode === 'Continue Writing') return
        if (isLoading) return

        let finalPrompt = currentPrompt
        if (promptMode === 'Improve Scene') {
            finalPrompt = currentPrompt 
                ? `Improve clarity, flow, and quality of this scene.\n\nUser instructions: ${currentPrompt}`
                : `Improve clarity, flow, and quality of this scene.`
        } else if (promptMode === 'Add Conflict') {
            finalPrompt = currentPrompt 
                ? `Introduce tension, stakes, or conflict.\n\nUser instructions: ${currentPrompt}`
                : `Introduce tension, stakes, or conflict.`
        } else if (promptMode === 'Rewrite with Emotion') {
            finalPrompt = currentPrompt 
                ? `Enhance emotional depth and character expression.\n\nUser instructions: ${currentPrompt}`
                : `Enhance emotional depth and character expression.`
        }

        setLastPrompt(currentPrompt || promptMode)
        setPrompt('')
        setCopied(false)
        // Preserve current response while new one loads
        if (completion) setPreviousCompletion(completion)
        try {
            await complete(finalPrompt, {
                body: {
                    action: 'helper',
                    projectId,
                    input: sceneTextRef.current.slice(-10000),
                    linkedCharacters: linkedCharacters.map((c: any) => ({
                        name: c.name,
                        description: c.description,
                        notes: c.notes
                    })),
                    linkedIdeas: linkedIdeas.map((i: any) => ({
                        title: i.title,
                        content: i.content
                    }))
                }
            })
        } catch {
            // error state handled by useCompletion's onError / error field
        } finally {
            setPreviousCompletion('')
        }
    }

    const handleCopy = async () => {
        if (!completion) return
        try {
            await navigator.clipboard.writeText(completion)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Clipboard not available - silently fail
        }
    }

    const handleClear = () => {
        setCompletion('')
        setPreviousCompletion('')
        setLastPrompt('')
        setCopied(false)
    }

    const handleInsert = () => {
        onInsert(completion)
        handleClear()
    }

    const handleTemplate = (value: string) => {
        setPrompt(value)
    }

    // Pick a random hint on mount
    const hint = useMemo(() => EMPTY_HINTS[Math.floor(Math.random() * EMPTY_HINTS.length)], [])

    return (
        <div className="flex flex-col h-full bg-[#fcfbf9] border-l border-slate-200/60 shadow-[-20px_0_50px_rgba(0,0,0,0.02)]">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-200/60 flex items-center gap-3 bg-white/50 backdrop-blur-sm">
                <div className="p-2 bg-indigo-50 rounded-xl">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-serif font-bold text-slate-800">Scene Helper</h3>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Powered by Gemini</p>
                </div>
                {(completion || previousCompletion) && !isLoading && (
                    <button
                        onClick={handleClear}
                        title="Clear response"
                        className="p-1.5 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-all"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* Context Indicator */}
            <div className="bg-[#fcfbf9] px-6 py-2 border-b border-slate-200/60 flex items-center gap-2 text-xs text-slate-400 font-medium">
                <span>Using current scene</span>
                {linkedCharacters.length > 0 && (
                    <>
                        <span className="w-1 h-1 bg-slate-200 rounded-full mx-1"></span>
                        <span>{linkedCharacters.length} linked character{linkedCharacters.length !== 1 ? 's' : ''}</span>
                    </>
                )}
                {linkedIdeas.length > 0 && (
                    <>
                        <span className="w-1 h-1 bg-slate-200 rounded-full mx-1"></span>
                        <span>{linkedIdeas.length} linked idea{linkedIdeas.length !== 1 ? 's' : ''}</span>
                    </>
                )}
            </div>

            {/* Response Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">

                {/* Empty state */}
                {!displayedCompletion && !isLoading && !error && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-5 opacity-50">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-indigo-300" />
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-sm font-serif font-medium text-slate-600">
                                Ask your writing partner
                            </p>
                            <p className="text-xs text-slate-400 font-serif italic max-w-[180px] leading-relaxed">
                                "{hint}"
                            </p>
                        </div>
                    </div>
                )}

                {/* Loading skeleton — only when truly no content to show yet */}
                {isLoading && !displayedCompletion && (
                    <div className="space-y-2 animate-in fade-in duration-300">
                        <div className="h-3 bg-slate-100 rounded-full w-3/4 animate-pulse" />
                        <div className="h-3 bg-slate-100 rounded-full w-full animate-pulse" />
                        <div className="h-3 bg-slate-100 rounded-full w-5/6 animate-pulse" />
                    </div>
                )}

                {/* Error state */}
                {error && !isLoading && (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-center space-y-3 animate-in fade-in slide-in-from-top-2">
                        <div className="bg-white w-9 h-9 rounded-full flex items-center justify-center mx-auto shadow-sm">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-semibold text-red-900">Something went wrong</p>
                            <p className="text-xs text-red-500 leading-relaxed font-serif italic">
                                The AI partner ran into an issue. Your prompt is saved — you can retry below.
                            </p>
                        </div>
                        <Button
                            onClick={() => lastPrompt && handleSubmit({ preventDefault: () => {} } as any)}
                            variant="outline"
                            size="sm"
                            disabled={!lastPrompt || isLoading}
                            className="w-full bg-white border-red-200 text-red-700 hover:bg-red-50 rounded-xl gap-2 text-xs"
                        >
                            <RefreshCcw className="w-3 h-3" />
                            Try again
                        </Button>
                    </div>
                )}

                {/* Response — shown during streaming, with previous faded while waiting */}
                {displayedCompletion && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* Prompt label */}
                        {lastPrompt && (
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold px-1">
                                {lastPrompt.length > 50 ? lastPrompt.slice(0, 50) + '…' : lastPrompt}
                            </p>
                        )}

                        {/* Response bubble — dimmed when showing previous while new loads */}
                        <div className={cn(
                            "bg-white rounded-2xl p-5 shadow-sm border border-slate-100/80 text-sm leading-relaxed text-slate-700 font-serif whitespace-pre-wrap italic min-h-[4rem] transition-opacity duration-300",
                            isShowingPrevious && "opacity-40"
                        )}>
                            {displayedCompletion}
                            {isLoading && completion && (
                                <span className="inline-block w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse ml-1 align-middle" />
                            )}
                        </div>

                        {/* "Thinking…" label when re-requesting with previous visible */}
                        {isShowingPrevious && (
                            <p className="text-[10px] text-slate-400 text-center font-medium animate-pulse">
                                Writing a new response…
                            </p>
                        )}

                        {/* Action buttons — only when complete */}
                        {!isLoading && completion && (
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleInsert}
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 rounded-xl border-indigo-100 hover:border-indigo-200 hover:bg-indigo-50/50 text-indigo-600 gap-2 h-9 font-serif italic transition-all active:scale-95"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Add to Scene
                                </Button>
                                <Button
                                    onClick={handleCopy}
                                    variant="outline"
                                    size="sm"
                                    title="Copy to clipboard"
                                    className={cn(
                                        "rounded-xl gap-1.5 h-9 px-3 transition-all active:scale-95",
                                        copied
                                            ? "border-green-200 text-green-600 bg-green-50"
                                            : "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                                    )}
                                >
                                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    {copied ? 'Copied' : 'Copy'}
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="bg-white border-t border-slate-200/60 z-10">
                {/* Context Preview */}
                <div className="border-b border-slate-100">
                    <button
                        type="button"
                        onClick={() => setPreviewOpen(!previewOpen)}
                        className="w-full px-4 py-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        <span>AI Context Preview</span>
                        {previewOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </button>
                    
                    {previewOpen && (
                        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 max-h-48 overflow-y-auto text-[11px] font-mono whitespace-pre-wrap text-slate-600 space-y-4">
                            <div>
                                <div className="font-bold text-slate-400 mb-1">SCENE:</div>
                                <div className="line-clamp-4 hover:line-clamp-none italic bg-white p-2 border border-slate-100 rounded-lg">{sceneTextRef.current.slice(-1000) || '(empty)'}</div>
                            </div>
                            
                            {linkedCharacters.length > 0 && (
                                <div>
                                    <div className="font-bold text-slate-400 mb-1">CHARACTERS:</div>
                                    <ul className="list-disc pl-4 space-y-1 bg-white p-2 border border-slate-100 rounded-lg">
                                        {linkedCharacters.map(c => (
                                            <li key={c.id}>
                                                <span className="font-bold">{c.name}</span>: {c.description || 'No description'}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {linkedIdeas.length > 0 && (
                                <div>
                                    <div className="font-bold text-slate-400 mb-1">IDEAS:</div>
                                    <ul className="list-disc pl-4 space-y-1 bg-white p-2 border border-slate-100 rounded-lg">
                                        {linkedIdeas.map(i => (
                                            <li key={i.id}>
                                                <span className="font-bold">{i.title}</span>
                                                {i.content && <span className="text-slate-400"> - {i.content.length > 50 ? i.content.slice(0, 50) + '...' : i.content}</span>}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Prompt templates */}
                <div className="px-4 pt-3 pb-2 flex flex-wrap gap-1.5">
                    {PROMPT_TEMPLATES.map((t) => (
                        <button
                            key={t.label}
                            type="button"
                            onClick={() => handleTemplate(t.value)}
                            className="px-2.5 py-1 text-[11px] font-medium rounded-full border border-slate-200 text-slate-500 bg-slate-50 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-95"
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="px-4 pb-4">
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div className="relative">
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        handleSubmit(e as any)
                                    }
                                }}
                                placeholder="Ask anything about this scene…"
                                rows={3}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pl-4 pr-12 text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-300 transition-all resize-none outline-none placeholder:text-slate-300 font-serif leading-relaxed"
                            ></textarea>
                            <button
                                type="submit"
                                disabled={(!prompt.trim() && promptMode === 'Continue Writing') || isLoading}
                                className={cn(
                                    "absolute bottom-3.5 right-3.5 p-2 rounded-xl transition-all active:scale-90",
                                    (prompt.trim() || promptMode !== 'Continue Writing') && !isLoading
                                        ? "bg-indigo-500 text-white hover:bg-indigo-600 shadow-md shadow-indigo-200"
                                        : "bg-slate-100 text-slate-300 cursor-not-allowed"
                                )}
                            >
                                {isLoading ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Send className="w-3.5 h-3.5" />
                                )}
                            </button>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AI Mode:</label>
                                <select 
                                    value={promptMode}
                                    onChange={(e) => setPromptMode(e.target.value)}
                                    className="bg-transparent text-slate-600 text-[11px] font-medium outline-none cursor-pointer appearance-none border-b border-transparent hover:border-slate-300 transition-colors"
                                >
                                    <option value="Continue Writing">Continue Writing</option>
                                    <option value="Improve Scene">Improve Scene</option>
                                    <option value="Add Conflict">Add Conflict</option>
                                    <option value="Rewrite with Emotion">Rewrite with Emotion</option>
                                </select>
                            </div>
                            <p className="text-[10px] text-center text-slate-300 font-bold uppercase tracking-tight">
                                Enter to send • Shift+Enter for new line
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
