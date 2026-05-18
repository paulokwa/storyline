'use client'

import React, { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, Info, Sparkles, Wand2, X, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from '@/lib/utils'
import type { ProjectType } from '@/lib/supabase/types'
import { getProjectTypeLabel } from '@/lib/constants'
import { getDeviceFingerprint } from '@/lib/client/device-fingerprint'

interface ImportWizardProps {
    projectType: ProjectType
    onComplete: (chunks: { title: string; content: string }[]) => void
    onBack: () => void
    creating: boolean
    creatingLabel?: string
    magicDetectBlockReason?: null | 'ai_disabled' | 'ollama_unsupported' | 'ollama_fallback_available'
    ollamaFallbackProvider?: string | null
}

type ImportChunk = { title: string; content: string }
type SplitStrategy = 'single' | 'chapter_keyword' | 'custom' | 'ai_detect'

const AI_WAITING_MESSAGES = [
    { seconds: 0, text: 'Identifying structural anchors...' },
    { seconds: 8, text: 'Reading for chapter breaks and scene boundaries...' },
    { seconds: 18, text: 'Checking the structure against the manuscript text...' },
    { seconds: 35, text: 'Still working. Larger manuscripts can take a little longer.' },
    { seconds: 60, text: 'Almost there. Keeping the request open while the structure is prepared.' },
]

function getAiWaitingMessage(elapsedSeconds: number) {
    return AI_WAITING_MESSAGES.reduce((current, message) => (
        elapsedSeconds >= message.seconds ? message : current
    ), AI_WAITING_MESSAGES[0]).text
}

export default function ImportWizard({ projectType, onComplete, onBack, creating, creatingLabel = 'Building Project...', magicDetectBlockReason = null, ollamaFallbackProvider = null }: ImportWizardProps) {
    const [file, setFile] = useState<File | null>(null)
    const [rawText, setRawText] = useState('')
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState('')
    
    // Split settings
    const [splitStrategy, setSplitStrategy] = useState<SplitStrategy>('chapter_keyword')
    const [customDelimiter, setCustomDelimiter] = useState('***')
    
    // Chunk Preview
    const [chunks, setChunks] = useState<ImportChunk[]>([])
    const [aiChunks, setAiChunks] = useState<ImportChunk[] | null>(null)
    
    // AI Detection State
    const [aiDetecting, setAiDetecting] = useState(false)
    const [showSanityModal, setShowSanityModal] = useState(false)
    const [showOllamaFallbackModal, setShowOllamaFallbackModal] = useState(false)
    const [sanityInput, setSanityInput] = useState('')
    const [aiStatus, setAiStatus] = useState('')
    const [aiProgress, setAiProgress] = useState(0)
    const [aiElapsedSeconds, setAiElapsedSeconds] = useState(0)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const displayedAiProgress = aiDetecting
        ? Math.max(aiProgress, Math.min(64, 35 + Math.floor(aiElapsedSeconds / 2)))
        : aiProgress
    const aiWaitingMessage = getAiWaitingMessage(aiElapsedSeconds)

    useEffect(() => {
        if (!aiDetecting) {
            setAiElapsedSeconds(0)
            return
        }

        const startedAt = Date.now()
        const interval = window.setInterval(() => {
            setAiElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000))
        }, 1000)

        return () => window.clearInterval(interval)
    }, [aiDetecting])

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0]
        if (!selected) return

        setFile(selected)
        setUploading(true)
        setError('')

        const formData = new FormData()
        formData.append('file', selected)

        try {
            const res = await fetch('/api/import', {
                method: 'POST',
                body: formData
            })
            const data = await res.json()
            
            if (!res.ok) throw new Error(data.error || 'Upload failed')
            
            setRawText(data.text)
            processChunks(data.text, 'chapter_keyword')
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Upload failed')
            setFile(null)
        } finally {
            setUploading(false)
        }
    }

    const buildChunks = (text: string, strategy: Exclude<SplitStrategy, 'ai_detect'>, delimiter: string = '***') => {
        if (!text) return []

        let outputChunks: ImportChunk[] = []

        if (strategy === 'single') {
            outputChunks = [{ title: 'Full Document', content: text }]
        } else if (strategy === 'chapter_keyword') {
            // chapter/prologue/epilogue/interlude are safe to split on unconditionally.
            // part/act/book/section require a structured suffix (number, roman numeral, or colon)
            // to avoid false splits on prose like "part of the reason" or "section by section".
            const structured = '(?:part|act|book|section)(?=[ \\t]*[:\\n]|\\s+(?:\\d+|[IVXivxLCDMlcdm]+|one|two|three|four|five|six|seven|eight|nine|ten)\\b)'
            const parts = text.split(new RegExp(`\\n(?=[ \\t]*(?:(?:chapter|prologue|epilogue|interlude)\\b|${structured}))`, 'i'))
            outputChunks = parts.map((part, i) => {
                const lines = part.split('\n')
                const firstLine = lines[0].trim().substring(0, 50) || `Segment ${i + 1}`
                return { title: firstLine, content: part.trim() }
            })
        } else if (strategy === 'custom') {
            // Split by literal delimiter
            const escapedDelim = delimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const regex = new RegExp(`\\n*(?:${escapedDelim})\\n*`, 'g')
            const parts = text.split(regex)
            outputChunks = parts.map((part, i) => {
                return { title: `Segment ${i + 1}`, content: part.trim() }
            })
        }

        return outputChunks.filter(c => c.content.length > 0)
    }

    const processChunks = (text: string, strategy: Exclude<SplitStrategy, 'ai_detect'>, delimiter: string = '***') => {
        setChunks(buildChunks(text, strategy, delimiter))
    }

    const updateStrategy = (strat: SplitStrategy) => {
        setSplitStrategy(strat)
        if (strat === 'ai_detect') {
            if (aiChunks) setChunks(aiChunks)
            return
        }
        processChunks(rawText, strat, customDelimiter)
    }

    const updateDelimiter = (val: string) => {
        setCustomDelimiter(val)
        setSplitStrategy('custom')
        processChunks(rawText, 'custom', val)
    }

    const updateChunkTitle = (index: number, newTitle: string) => {
        const updated = [...chunks]
        updated[index].title = newTitle
        setChunks(updated)
        if (splitStrategy === 'ai_detect') {
            setAiChunks(updated)
        }
    }

    const resetSelectedFile = () => {
        setRawText('')
        setChunks([])
        setAiChunks(null)
        setSplitStrategy('chapter_keyword')
        setCustomDelimiter('***')
    }

    const triggerAiDetection = async (useFallback = false) => {
        if (!useFallback && sanityInput !== 'IMPORT') return

        setAiDetecting(true)
        setShowSanityModal(false)
        setShowOllamaFallbackModal(false)
        setAiStatus('Preparing manuscript text...')
        setAiProgress(12)
        setAiElapsedSeconds(0)
        setSanityInput('')
        setError('')

        try {
            const deviceFingerprint = await getDeviceFingerprint()
            setAiStatus('Identifying structural anchors...')
            setAiProgress(35)
            const res = await fetch('/api/import/ai-detect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: rawText,
                    projectType,
                    requestId: crypto.randomUUID(),
                    deviceFingerprint,
                    ...(useFallback ? { useFallback: true } : {}),
                })
            })
            const data = await res.json()
            if (!res.ok) {
                if (data.error === 'AI_PARTNER_DISABLED') {
                    throw new Error('AI Partner is turned off. Enable it in Account Settings to use Magic Detect.')
                }
                throw new Error(data.error || 'AI Detection failed')
            }

            const detected = data.chapters as { title: string, markerSnippet: string }[]
            setAiStatus(`Mapping ${detected.length} chapters...`)
            setAiProgress(68)

            // Robust Mapping Slicer
            const mappedAnchors: { index: number; detection: { title: string; markerSnippet: string } }[] = []
            let lastIdx = 0

            for (let i = 0; i < detected.length; i++) {
                const ch = detected[i]
                let idx = rawText.indexOf(ch.markerSnippet, lastIdx)

                if (idx === -1) {
                    const normalize = (s: string) => s.toLowerCase().replace(/[\s\p{P}]/gu, '')
                    const normSnippet = normalize(ch.markerSnippet)
                    const windowSize = Math.min(5000, rawText.length - lastIdx)
                    const searchWindow = rawText.substring(lastIdx, lastIdx + windowSize)
                    const normWindow = normalize(searchWindow)
                    const winIdx = normWindow.indexOf(normSnippet)
                    if (winIdx !== -1) {
                        const ratio = winIdx / normWindow.length
                        idx = lastIdx + Math.floor(ratio * windowSize)
                    }
                }

                if (idx !== -1 && idx >= lastIdx) {
                    mappedAnchors.push({ index: idx, detection: ch })
                    lastIdx = idx + Math.max(ch.markerSnippet.length, 1)
                }
            }

            if (mappedAnchors.length === 0) {
                throw new Error('AI found structure, but it could not be mapped to your file. Try using manual markers.')
            }

            const newChunks: ImportChunk[] = []
            let start = 0
            setAiStatus('Building import preview...')
            setAiProgress(88)
            for (let i = 0; i < mappedAnchors.length; i++) {
                const end = mappedAnchors[i].index
                newChunks.push({
                    title: i === 0 ? 'Prologue / Start' : mappedAnchors[i - 1].detection.title,
                    content: rawText.substring(start, end).trim()
                })
                start = end
            }
            newChunks.push({
                title: mappedAnchors[mappedAnchors.length - 1].detection.title || 'Chapter ' + (mappedAnchors.length + 1),
                content: rawText.substring(start).trim()
            })

            const aiPreviewChunks = newChunks.filter(c => c.content.length > 10)
            setAiChunks(aiPreviewChunks)
            setChunks(aiPreviewChunks)
            setSplitStrategy('ai_detect')
            setAiStatus('')
            setAiProgress(100)

        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'AI Detection failed')
        } finally {
            setAiDetecting(false)
            setAiProgress(0)
        }
    }

    const label = getProjectTypeLabel(projectType)

    return (
        <div className="import-wizard-shell space-y-10 animate-in fade-in duration-500">
            <div className="space-y-4">
                <h2 className="text-4xl md:text-5xl font-serif text-slate-800 leading-tight">
                    Import your<br /><span className="text-slate-400 italic">manuscript</span>
                </h2>
                <p className="text-slate-500 font-medium">Upload a document to instantly structure your new {label.toLowerCase()}.</p>
            </div>

            {!rawText ? (
                <div className="space-y-8">
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                            "border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300",
                            uploading 
                                ? "border-primary/50 bg-primary/5" 
                                : "border-slate-200 hover:border-primary/50 hover:bg-stone-50"
                        )}
                    >
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            className="hidden" 
                            accept=".docx,.txt,.md,.pdf,.epub"
                        />
                        
                        {uploading ? (
                            <div className="flex flex-col items-center gap-4 text-primary">
                                <Loader2 className="w-10 h-10 animate-spin" />
                                <div className="font-medium">Extracting manuscript magic...</div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4 text-slate-500">
                                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                                    <UploadCloud className="w-8 h-8" />
                                </div>
                                <div className="font-semibold text-slate-700 text-lg">Click to select your file</div>
                                <div className="text-sm">Supports .docx, .epub, .pdf, .txt, and .md</div>
                            </div>
                        )}
                    </div>

                    <button onClick={onBack} disabled={creating || uploading} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-primary transition-colors disabled:opacity-50">
                        <ChevronLeft className="w-4 h-4" /> Go Back
                    </button>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Header */}
                    <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="w-10 h-10 shrink-0 bg-white rounded-full flex items-center justify-center text-primary shadow-sm">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <div className="truncate font-semibold text-slate-800">{file?.name}</div>
                                    <div className="text-xs text-slate-500 font-medium">
                                        ~{rawText.length.toLocaleString()} characters extracted
                                    </div>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={resetSelectedFile}
                                disabled={creating}
                                className="w-full sm:w-auto"
                            >
                                Change File
                            </Button>
                        </div>
                    </div>

                    {/* Splitting engine */}
                    <div className="space-y-4">
                        <h3 className="font-serif text-xl font-medium text-slate-800">How should we split it?</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <StrategyCard active={splitStrategy === 'chapter_keyword'} onClick={() => updateStrategy('chapter_keyword')} title="By Heading" desc="Split on Chapter, Prologue, Epilogue, Part, and other common headings" />
                        <StrategyCard active={splitStrategy === 'custom'} onClick={() => updateStrategy('custom')} title="Custom Marker" desc="Split at a specific character (e.g. ***)" />
                        <StrategyCard active={splitStrategy === 'single'} onClick={() => updateStrategy('single')} title="Single Scene" desc="Don't split. Import as one bulk scene." />
                    </div>

                    <div className="pt-2">
                        {magicDetectBlockReason === 'ai_disabled' && (
                            <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-500 flex-shrink-0">
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="flex items-center gap-2">
                                            <div className="font-serif text-lg font-medium tracking-tight text-amber-800">✨ Magic Detect</div>
                                            <span className="text-[10px] font-bold uppercase tracking-widest bg-amber-200/60 text-amber-600 px-2 py-0.5 rounded-full border border-amber-300/50">Beta</span>
                                        </div>
                                        <p className="text-xs text-amber-700 mt-1">
                                            AI Partner is off.{' '}
                                            <Link href="/settings" className="font-semibold underline underline-offset-2 hover:text-amber-900">
                                                Enable it in Account Settings
                                            </Link>{' '}
                                            to use AI chapter detection.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {magicDetectBlockReason === 'ollama_unsupported' && (
                            <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-500 flex-shrink-0">
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="flex items-center gap-2">
                                            <div className="font-serif text-lg font-medium tracking-tight text-amber-800">✨ Magic Detect</div>
                                            <span className="text-[10px] font-bold uppercase tracking-widest bg-amber-200/60 text-amber-600 px-2 py-0.5 rounded-full border border-amber-300/50">Beta</span>
                                        </div>
                                        <p className="text-xs text-amber-700 mt-1">
                                            Magic Detect does not support local Ollama yet. Ollama runs on your device, while Magic Detect currently runs through a cloud AI route.{' '}
                                            <Link href="/settings" className="font-semibold underline underline-offset-2 hover:text-amber-900">
                                                Configure a cloud provider in Account Settings
                                            </Link>{' '}
                                            to use it, or use one of the split options above.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {magicDetectBlockReason === 'ollama_fallback_available' && (
                            <button
                                onClick={() => aiChunks ? updateStrategy('ai_detect') : setShowOllamaFallbackModal(true)}
                                disabled={aiDetecting}
                                className={cn(
                                    "w-full relative group overflow-hidden bg-amber-950 text-amber-50 rounded-2xl p-5 hover:bg-amber-900 transition-all active:scale-[0.99] border shadow-xl shadow-amber-900/10",
                                    splitStrategy === 'ai_detect' ? "border-amber-400 ring-2 ring-amber-400/30" : "border-amber-800"
                                )}
                            >
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-[0_0_15px_rgba(245,158,11,0.4)] group-hover:scale-110 transition-transform duration-500">
                                            <Sparkles className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <div className="flex items-center gap-2">
                                                <div className="font-serif text-lg font-medium tracking-tight">✨ Magic Detect</div>
                                                <span className="text-[10px] font-bold uppercase tracking-widest bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">Beta</span>
                                                {aiChunks && (
                                                    <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/25">Saved</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-amber-200/70 font-medium leading-relaxed max-w-sm mt-1">
                                                {aiChunks
                                                    ? <>View the saved AI structure without sending another request.</>
                                                    : <>Available via your configured cloud fallback — requires your confirmation.</>
                                                }
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-2 rounded-full border border-amber-700 bg-amber-900 group-hover:bg-amber-500 group-hover:border-amber-400 transition-all">
                                        {aiDetecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                    </div>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                            </button>
                        )}

                        {!magicDetectBlockReason && (
                            <button
                                onClick={() => aiChunks ? updateStrategy('ai_detect') : setShowSanityModal(true)}
                                disabled={aiDetecting}
                                className={cn(
                                    "w-full relative group overflow-hidden bg-slate-900 text-white rounded-2xl p-5 hover:bg-slate-800 transition-all active:scale-[0.99] border shadow-xl shadow-slate-900/10",
                                    splitStrategy === 'ai_detect' ? "border-indigo-300 ring-2 ring-indigo-400/30" : "border-slate-700"
                                )}
                            >
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] group-hover:scale-110 transition-transform duration-500">
                                            <Sparkles className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <div className="flex items-center gap-2">
                                                <div className="font-serif text-lg font-medium tracking-tight">✨ Magic Detect</div>
                                                <span className="text-[10px] font-bold uppercase tracking-widest bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/30">Beta</span>
                                                {aiChunks && (
                                                    <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/25">Saved</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-400 font-medium leading-relaxed max-w-sm mt-1">
                                                {aiChunks ? (
                                                    <>View the saved AI structure without sending another request.</>
                                                ) : (
                                                    <>Experimental. Use AI to detect and suggest chapter structure from your manuscript.</>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-2 rounded-full border border-slate-700 bg-slate-800 group-hover:bg-indigo-500 group-hover:border-indigo-400 transition-all">
                                        {aiDetecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                    </div>
                                </div>

                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-indigo-500/30 transition-all duration-700" />
                            </button>
                        )}
                    </div>

                        {splitStrategy === 'custom' && (
                            <div className="flex items-center gap-4 mt-4 animate-in fade-in slide-in-from-top-2 p-4 bg-stone-50 rounded-xl border border-stone-200">
                                <span className="text-sm font-medium text-slate-600">Delimiter:</span>
                                <Input 
                                    className="max-w-[200px]" 
                                    value={customDelimiter} 
                                    onChange={(e) => updateDelimiter(e.target.value)}
                                    placeholder="***"
                                />
                            </div>
                        )}
                    </div>

                    {/* Formatting Warning */}
                    <div className="p-5 bg-amber-50/50 border border-amber-100 rounded-2xl flex gap-4">
                        <div className="mt-1">
                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
                                <Info className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <h4 className="font-semibold text-amber-900 text-sm">Formatting Caveats</h4>
                            <p className="text-xs text-amber-800/70 leading-relaxed">
                                • Images, tables, and complex styling (bold/italic) may not import perfectly.<br />
                                • PDF and EPUB files may include extra &quot;noise&quot; such as page numbers, headers, or metadata.<br />
                                • Please review your content in the editor after finishing the import.
                            </p>
                        </div>
                    </div>

                    {/* Chunk preview */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-serif text-xl font-medium text-slate-800">Import Preview</h3>
                            <span className="text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
                                {chunks.length} {projectType === 'tv_script' ? 'Scenes' : 'Chapters'}
                            </span>
                        </div>
                        
                        <div className="border rounded-2xl bg-stone-50/50 overflow-hidden">
                        <div className="max-h-[300px] overflow-y-auto space-y-2 custom-scrollbar p-2">
                            {chunks.length === 0 ? (
                                <div className="text-center p-8 text-slate-400 text-sm">No segments found</div>
                            ) : chunks.map((chunk, idx) => (
                                <div key={idx} className="bg-white border rounded-xl p-4 flex gap-4 hover:shadow-md transition-all group">
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <div className="flex-shrink-0 w-8 h-8 bg-[#546354]/10 text-[#546354] rounded-full flex items-center justify-center font-bold text-xs">
                                                {idx + 1}
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">Segment order</TooltipContent>
                                    </Tooltip>
                                    <div className="flex-1 min-w-0">
                                        <div className="mb-2">
                                            <Input
                                                value={chunk.title}
                                                onChange={(e) => updateChunkTitle(idx, e.target.value)}
                                                className="h-9 text-sm font-semibold bg-stone-50/50 border-stone-200 focus:bg-white"
                                                placeholder="Untitled Segment"
                                            />
                                        </div>
                                        <div className="text-xs text-slate-400 line-clamp-2 px-1">
                                            {chunk.content.substring(0, 150)}...
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-slate-100 gap-4 mt-8">
                        <button onClick={onBack} disabled={creating} className="flex flex-shrink-0 items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-800 transition-colors disabled:opacity-50">
                            Go Back
                        </button>
                        <Button 
                            className="sanctuary-btn-primary h-14 px-10 rounded-full text-base font-semibold gap-3 w-full sm:w-auto"
                            onClick={() => onComplete(chunks)}
                            disabled={creating || chunks.length === 0}
                        >
                            {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                            {creating ? creatingLabel : 'Finalize Import'}
                        </Button>
                    </div>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-xl text-sm font-medium">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* AI Progress Overlay */}
            {aiDetecting && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-md z-40 flex flex-col items-center justify-center p-12 text-center rounded-[2.5rem] animate-in fade-in duration-500">
                    <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl shadow-indigo-100">
                        <Sparkles className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-serif text-slate-800 mb-2">Analyzing your soul&apos;s work…</h3>
                    <div className="mb-6 space-y-2">
                        <p className="text-slate-500 font-medium animate-pulse">{aiStatus}</p>
                        <p className="min-h-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            {aiElapsedSeconds >= 3 ? aiWaitingMessage : 'Starting the organizer...'}
                            <span className="ml-1 inline-flex w-5 justify-between align-middle">
                                <span className="h-1 w-1 rounded-full bg-slate-300 animate-pulse" />
                                <span className="h-1 w-1 rounded-full bg-slate-300 animate-pulse [animation-delay:160ms]" />
                                <span className="h-1 w-1 rounded-full bg-slate-300 animate-pulse [animation-delay:320ms]" />
                            </span>
                        </p>
                    </div>
                    <div
                        className="w-64 h-1.5 bg-slate-100 rounded-full overflow-hidden"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={displayedAiProgress}
                    >
                        <div
                            className="h-full bg-indigo-500 transition-all duration-500 ease-out"
                            style={{ width: `${Math.max(displayedAiProgress, 8)}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Sanity Check Modal */}
            {showSanityModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-start justify-center overflow-hidden p-4 md:p-6 animate-in fade-in duration-300 sm:items-center">
                    <div className="import-wizard-sanity-modal bg-white rounded-[2rem] md:rounded-[2.5rem] max-w-lg w-full max-h-[calc(100dvh-2rem)] md:max-h-[calc(100dvh-3rem)] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-500 border border-slate-100">
                        <button 
                            onClick={() => setShowSanityModal(false)}
                            className="absolute top-6 right-6 z-10 p-2 rounded-full hover:bg-slate-50 text-slate-400 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="max-h-[calc(100dvh-2rem)] md:max-h-[calc(100dvh-3rem)] overflow-y-auto overscroll-contain p-8 pr-10 md:p-14 md:pr-16">
                            <div className="space-y-8">
                            <div className="space-y-4">
                                <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 mb-6">
                                    <AlertCircle className="w-8 h-8" />
                                </div>
                                <h3 className="text-3xl font-serif text-slate-800 leading-tight">Confirmation <span className="text-slate-400 italic">Required</span></h3>
                                <p className="text-slate-600 leading-relaxed font-bold bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 text-sm">
                                    <Sparkles className="w-4 h-4 inline-block mr-2 text-indigo-500" />
                                    ✨ Magic Detect is an experimental feature.
                                </p>
                                <p className="text-slate-500 text-sm leading-relaxed font-medium px-1">
                                    Your manuscript text will be processed across one or more AI requests to automatically identify chapters.
                                </p>
                                <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                        <p className="text-sm text-amber-900 font-medium leading-relaxed">
                                            About <span className="font-bold">{rawText.length.toLocaleString()} characters</span> of extracted manuscript text will be sent to AI across one or more requests.
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                        <p className="text-sm text-amber-900 font-medium leading-relaxed">
                                            Cost and limits depend on your AI setup. Trial AI uses trial allowance, BYOK providers may charge your account, and OpenRouter pricing or free-tier quotas depend on the selected model. Very large manuscripts can use more credits or hit provider limits.
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5 shrink-0" />
                                        <p className="text-sm text-amber-900 font-bold leading-relaxed">
                                            IMPORTANT: AI results are suggestions. You must review and edit all suggested chapters before finalizing.
                                        </p>
                                    </div>
                                    <div className="pt-2 border-t border-amber-200/50">
                                        <p className="text-[11px] text-amber-700/70 font-medium italic">
                                            Note: If the AI detection feels inaccurate, we recommend using a Manual Marker (like ***) instead.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Type &quot;IMPORT&quot; to continue</label>
                                <Input 
                                    autoFocus
                                    value={sanityInput}
                                    onChange={(e) => setSanityInput(e.target.value)}
                                    placeholder="IMPORT"
                                    className="h-14 bg-stone-50/50 border-stone-200 focus:border-indigo-400 focus:bg-white text-lg font-bold tracking-widest text-center"
                                />
                                <Button
                                    onClick={() => triggerAiDetection()}
                                    disabled={sanityInput !== 'IMPORT'}
                                    className={cn(
                                        "w-full h-14 rounded-full text-base font-semibold gap-3 transition-all duration-500",
                                        sanityInput === 'IMPORT' ? "bg-indigo-600 text-white shadow-xl shadow-indigo-200" : "bg-slate-100 text-slate-300"
                                    )}
                                >
                                    Proceed with AI Detection
                                </Button>
                            </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Ollama Fallback Confirmation Modal (State A) */}
            {showOllamaFallbackModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-start justify-center overflow-hidden p-4 md:p-6 animate-in fade-in duration-300 sm:items-center">
                    <div className="import-wizard-sanity-modal bg-white rounded-[2rem] md:rounded-[2.5rem] max-w-lg w-full max-h-[calc(100dvh-2rem)] md:max-h-[calc(100dvh-3rem)] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-500 border border-slate-100">
                        <button
                            onClick={() => setShowOllamaFallbackModal(false)}
                            className="absolute top-6 right-6 z-10 p-2 rounded-full hover:bg-slate-50 text-slate-400 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="max-h-[calc(100dvh-2rem)] md:max-h-[calc(100dvh-3rem)] overflow-y-auto overscroll-contain p-8 pr-10 md:p-14 md:pr-16">
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 mb-6">
                                        <Sparkles className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-3xl font-serif text-slate-800 leading-tight">
                                        Use cloud fallback <span className="text-slate-400 italic">for this import?</span>
                                    </h3>
                                    <p className="text-slate-500 text-sm leading-relaxed font-medium px-1">
                                        Magic Detect cannot run through local Ollama yet. Ollama runs on your device, while Magic Detect currently runs through a cloud AI route.
                                    </p>
                                    <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                            <p className="text-sm text-amber-900 font-medium leading-relaxed">
                                                About <span className="font-bold">{rawText.length.toLocaleString()} characters</span> of manuscript text will be sent to your configured cloud fallback provider{ollamaFallbackProvider ? ` (${ollamaFallbackProvider.charAt(0).toUpperCase() + ollamaFallbackProvider.slice(1)})` : ''} for detection.
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5 shrink-0" />
                                            <p className="text-sm text-amber-900 font-bold leading-relaxed">
                                                Ollama will remain your default AI provider after this import. This only applies to this one detection request.
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                            <p className="text-sm text-amber-900 font-medium leading-relaxed">
                                                AI results are suggestions. Review and edit all suggested chapters before finalizing.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Button
                                        onClick={() => triggerAiDetection(true)}
                                        className="w-full h-14 rounded-full text-base font-semibold gap-3 bg-amber-600 hover:bg-amber-700 text-white shadow-xl shadow-amber-200 transition-all duration-300"
                                    >
                                        <Sparkles className="w-5 h-5" />
                                        Use cloud fallback for this import
                                    </Button>
                                    <Link
                                        href="/settings"
                                        className="flex items-center justify-center w-full h-12 rounded-full text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
                                    >
                                        Open Account Settings
                                    </Link>
                                    <button
                                        onClick={() => setShowOllamaFallbackModal(false)}
                                        className="w-full h-10 text-sm text-slate-400 hover:text-slate-600 transition-colors font-medium"
                                    >
                                        Continue without Magic Detect
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function StrategyCard({ active, onClick, title, desc }: { active: boolean, onClick: () => void, title: string, desc: string }) {
    return (
        <div 
            onClick={onClick}
            className={cn(
                "cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 text-left h-full",
                active 
                    ? "border-primary bg-primary/5 shadow-sm" 
                    : "border-slate-100 hover:border-primary/30 hover:bg-stone-50"
            )}
        >
            <div className={cn("font-medium mb-1", active ? "text-primary" : "text-slate-700")}>{title}</div>
            <div className="text-xs text-slate-500 leading-relaxed">{desc}</div>
        </div>
    )
}
