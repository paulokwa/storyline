'use client'

import React, { useState, useRef } from 'react'
import { UploadCloud, FileText, SplitSquareHorizontal, CheckCircle2, AlertCircle, Loader2, Info, Sparkles, Wand2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { ProjectType, WritingMode } from '@/lib/supabase/types'

interface ImportWizardProps {
    projectType: ProjectType
    onComplete: (chunks: { title: string; content: string }[]) => void
    onBack: () => void
    creating: boolean
}

export default function ImportWizard({ projectType, onComplete, onBack, creating }: ImportWizardProps) {
    const [file, setFile] = useState<File | null>(null)
    const [rawText, setRawText] = useState('')
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState('')
    
    // Split settings
    const [splitStrategy, setSplitStrategy] = useState<'single' | 'chapter_keyword' | 'custom'>('chapter_keyword')
    const [customDelimiter, setCustomDelimiter] = useState('***')
    
    // Chunk Preview
    const [chunks, setChunks] = useState<{ title: string; content: string }[]>([])
    
    // AI Detection State
    const [aiDetecting, setAiDetecting] = useState(false)
    const [showSanityModal, setShowSanityModal] = useState(false)
    const [sanityInput, setSanityInput] = useState('')
    const [aiStatus, setAiStatus] = useState('')

    const fileInputRef = useRef<HTMLInputElement>(null)

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
        } catch (err: any) {
            setError(err.message)
            setFile(null)
        } finally {
            setUploading(false)
        }
    }

    const processChunks = (text: string, strategy: typeof splitStrategy, delimiter: string = '***') => {
        if (!text) return

        let outputChunks: { title: string; content: string }[] = []

        if (strategy === 'single') {
            outputChunks = [{ title: 'Full Document', content: text }]
        } else if (strategy === 'chapter_keyword') {
            // Split natively where lines start with Chapter ignoring case
            // The split string captures the "Chapter X" to keep it, but split doesn't do that nicely
            // Let's use a regex that matches empty lines followed by Chapter, or line starts
            const parts = text.split(/\n(?=[ \t]*chapter\b)/i)
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

        setChunks(outputChunks.filter(c => c.content.length > 0))
    }

    const updateStrategy = (strat: typeof splitStrategy) => {
        setSplitStrategy(strat)
        processChunks(rawText, strat, customDelimiter)
    }

    const updateDelimiter = (val: string) => {
        setCustomDelimiter(val)
        processChunks(rawText, 'custom', val)
    }

    const updateChunkTitle = (index: number, newTitle: string) => {
        const updated = [...chunks]
        updated[index].title = newTitle
        setChunks(updated)
    }

    const triggerAiDetection = async () => {
        if (sanityInput !== 'IMPORT') return
        
        setAiDetecting(true)
        setShowSanityModal(false)
        setAiStatus('Identifying structural anchors...')
        setSanityInput('')
        setError('')

        try {
            const res = await fetch('/api/import/ai-detect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: rawText, projectType })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'AI Detection failed')

            const detected = data.chapters as { title: string, markerSnippet: string }[]
            setAiStatus(`Mapping ${detected.length} chapters...`)

            // Robust Mapping Slicer
            const indices: number[] = []
            let lastIdx = 0

            for (let i = 0; i < detected.length; i++) {
                const ch = detected[i]
                // Pass 1: Exact Match (search from lastIdx, allow idx === 0 for first chapter)
                let idx = rawText.indexOf(ch.markerSnippet, lastIdx)

                // Pass 2: Normalized Match (strip whitespace + punctuation, case-insensitive)
                if (idx === -1) {
                    const normalize = (s: string) => s.toLowerCase().replace(/[\s\p{P}]/gu, '')
                    const normSnippet = normalize(ch.markerSnippet)
                    const windowSize = Math.min(5000, rawText.length - lastIdx)
                    const searchWindow = rawText.substring(lastIdx, lastIdx + windowSize)
                    const normWindow = normalize(searchWindow)
                    const winIdx = normWindow.indexOf(normSnippet)
                    if (winIdx !== -1) {
                        // Estimate approximate position in raw text by ratio
                        const ratio = winIdx / normWindow.length
                        idx = lastIdx + Math.floor(ratio * windowSize)
                    }
                }

                // Accept idx >= lastIdx (not strictly >, to allow first chapter at position 0)
                if (idx !== -1 && idx >= lastIdx) {
                    indices.push(idx)
                    lastIdx = idx + 1
                }
            }

            if (indices.length === 0) {
                throw new Error('AI found structure, but it could not be mapped to your file. Try using manual markers.')
            }

            // Create Chunks
            const newChunks: { title: string, content: string }[] = []
            let start = 0
            for (let i = 0; i < indices.length; i++) {
                const end = indices[i]
                newChunks.push({
                    title: detected[i-1]?.title || 'Prologue / Start',
                    content: rawText.substring(start, end).trim()
                })
                start = end
            }
            // Final chunk
            newChunks.push({
                title: detected[indices.length - 1]?.title || 'Chapter ' + (indices.length + 1),
                content: rawText.substring(start).trim()
            })

            // Filter out empty segments and populate UI
            setChunks(newChunks.filter(c => c.content.length > 10))
            setSplitStrategy('custom') // Set to custom so delimiter box doesn't override it easily
            setAiStatus('')

        } catch (err: any) {
            setError(err.message)
        } finally {
            setAiDetecting(false)
        }
    }

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            <div className="space-y-4">
                <h2 className="text-4xl md:text-5xl font-serif text-slate-800 leading-tight">
                    Import your<br /><span className="text-slate-400 italic">manuscript</span>
                </h2>
                <p className="text-slate-500 font-medium">Upload a .docx, .epub, .pdf, .txt, or .md file to instantly structure your new project.</p>
            </div>

            {!rawText ? (
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
            ) : (
                <div className="space-y-8">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary shadow-sm">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="font-semibold text-slate-800">{file?.name}</div>
                                <div className="text-xs text-slate-500 font-medium">
                                    {(rawText.length / 5).toFixed(0).toLocaleString()} estimated words
                                </div>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setRawText('')} disabled={creating}>
                            Change File
                        </Button>
                    </div>

                    {/* Splitting engine */}
                    <div className="space-y-4">
                        <h3 className="font-serif text-xl font-medium text-slate-800">How should we split it?</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <StrategyCard active={splitStrategy === 'chapter_keyword'} onClick={() => updateStrategy('chapter_keyword')} title="By 'Chapter'" desc="Split when a line begins with 'Chapter'" />
                        <StrategyCard active={splitStrategy === 'custom'} onClick={() => updateStrategy('custom')} title="Custom Marker" desc="Split at a specific character (e.g. ***)" />
                        <StrategyCard active={splitStrategy === 'single'} onClick={() => updateStrategy('single')} title="Single Scene" desc="Don't split. Import as one bulk scene." />
                    </div>

                    <div className="pt-2">
                        <button 
                            onClick={() => setShowSanityModal(true)}
                            disabled={aiDetecting}
                            className="w-full relative group overflow-hidden bg-slate-900 text-white rounded-2xl p-5 hover:bg-slate-800 transition-all active:scale-[0.99] border border-slate-700 shadow-xl shadow-slate-900/10"
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
                                        </div>
                                        <div className="text-xs text-slate-400 font-medium leading-relaxed max-w-sm mt-1">
                                            Experimental. Use AI to suggest chapters. <span className="text-slate-300 font-semibold underline decoration-slate-600 underline-offset-2 italic">Manual import is typically more reliable</span> for complex formatting.
                                        </div>
                                    </div>
                                </div>
                                <div className="p-2 rounded-full border border-slate-700 bg-slate-800 group-hover:bg-indigo-500 group-hover:border-indigo-400 transition-all">
                                    {aiDetecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                </div>
                            </div>
                            
                            {/* Animated Background Flair */}
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-indigo-500/30 transition-all duration-700" />
                        </button>
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
                                • PDF and EPUB files may include extra "noise" such as page numbers, headers, or metadata.<br />
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
                        
                        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar border rounded-2xl bg-stone-50/50 p-2">
                            {chunks.length === 0 ? (
                                <div className="text-center p-8 text-slate-400 text-sm">No segments found</div>
                            ) : chunks.map((chunk, idx) => (
                                <div key={idx} className="bg-white border rounded-xl p-4 flex gap-4 hover:shadow-md transition-all group">
                                    <div className="flex-shrink-0 w-8 h-8 bg-[#546354]/10 text-[#546354] rounded-full flex items-center justify-center font-bold text-xs">
                                        {idx + 1}
                                    </div>
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
                            {creating ? 'Building Project...' : 'Finalize Import'}
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
                    <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl shadow-indigo-100 animate-bounce-slow">
                        <Sparkles className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-serif text-slate-800 mb-2">Analyzing your soul's work…</h3>
                    <p className="text-slate-500 font-medium mb-6 animate-pulse">{aiStatus}</p>
                    <div className="w-64 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 animate-[loading-bar_3s_infinite_ease-in-out]" style={{width: '60%'}} />
                    </div>
                </div>
            )}

            {/* Sanity Check Modal */}
            {showSanityModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] p-10 md:p-14 max-w-lg w-full shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-500 border border-slate-100">
                        <button 
                            onClick={() => setShowSanityModal(false)}
                            className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-50 text-slate-400 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="space-y-8">
                            <div className="space-y-4">
                                <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 mb-6">
                                    <AlertCircle className="w-8 h-8" />
                                </div>
                                <h3 className="text-3xl font-serif text-slate-800 leading-tight">Confirmation <span className="text-slate-400 italic">Required</span></h3>
                                <p className="text-slate-600 leading-relaxed font-bold bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 text-sm">
                                    <Sparkles className="w-4 h-4 inline-block mr-2 text-indigo-500" />
                                    ✨ Magic Detect is an experimental feature. We recommend manual import for the highest reliability.
                                </p>
                                <p className="text-slate-500 text-sm leading-relaxed font-medium px-1">
                                    Your manuscript text will be processed across **one or more** AI requests to automatically identify chapters. 
                                </p>
                                <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                        <p className="text-sm text-amber-900 font-medium leading-relaxed">
                                            This action uses your AI API quota for <span className="font-bold underline">~{Math.round(rawText.length / 4.7).toLocaleString()} words</span>.
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                        <p className="text-sm text-amber-900 font-medium leading-relaxed">
                                            Approximate cost: <span className="font-bold">~${Math.max(1, Math.ceil((rawText.length / 1000000) * 1.5))}.00 USD</span> (or 0 credits on free-tier keys).
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
                                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Type "IMPORT" to continue</label>
                                <Input 
                                    autoFocus
                                    value={sanityInput}
                                    onChange={(e) => setSanityInput(e.target.value)}
                                    placeholder="IMPORT"
                                    className="h-14 bg-stone-50/50 border-stone-200 focus:border-indigo-400 focus:bg-white text-lg font-bold tracking-widest text-center"
                                />
                                <Button 
                                    onClick={triggerAiDetection}
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
