'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useCompletion } from '@ai-sdk/react'
import Link from 'next/link'
import { Sparkles, Send, Loader2, Plus, MessageSquare, AlertCircle, RefreshCcw, Copy, X, Check, ChevronDown, ChevronUp, Info, Settings, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface AiHelperPanelProps {
    projectId: string
    sceneText: string
    linkedCharacters?: any[]
    linkedIdeas?: any[]
    linkedLocations?: any[]
    linkedObjects?: any[]
    projectRelationships?: any[]
    selectedNodes?: any[]
    allNodes?: any[]
    allScenes?: any[]
    onClearSelection?: () => void
    onInsert: (text: string) => void
    projectType?: 'tv_script' | 'novel'
    aiSettings: {
        ai_enabled: boolean
        ai_provider: string
        ai_fallback_enabled: boolean
        ollama_model: string
        ollama_url: string
        api_key: string | null
    }
}

function extractTextFromJson(content: any): string {
    if (typeof content === 'string') return content
    if (!content) return ''
    if (content.content && Array.isArray(content.content)) {
        return content.content.map((c: any) => extractTextFromJson(c)).join('\n')
    }
    if (content.type === 'text') return content.text || ''
    if (Array.isArray(content)) {
        return content.map((c: any) => extractTextFromJson(c)).join('\n')
    }
    return ''
}

function getDescendantScenes(nodeId: string, allNodes: any[], allScenes: any[]): any[] {
    const node = allNodes.find(n => n.id === nodeId)
    if (!node) return []
    if (node.type === 'scene') {
        const scene = allScenes.find(s => s.node_id === nodeId)
        return scene ? [scene] : []
    }
    const children = allNodes.filter(n => n.parent_id === nodeId)
    return children.flatMap(c => getDescendantScenes(c.id, allNodes, allScenes))
}

const EMPTY_HINTS = [
    'What could happen next in this scene?',
    'How should this scene end?',
    'What detail would make this scene more vivid?',
    'What is my character feeling right now?',
]

const MODE_EXPLANATIONS: Record<string, string> = {
    'Continue Writing': 'Seamlessly continues the scene based on your prompt.',
    'Improve Scene': 'Refines the clarity, flow, and overall prose quality.',
    'Add Conflict': 'Introduces new tension, higher stakes, or drama.',
    'Rewrite with Emotion': 'Deepens emotional resonance and character expressions.',
    'Review / Chat': 'Ask questions about your story elements or critique your work.'
}

const PROMPT_TEMPLATES = [
    { label: 'What happens next?', value: 'What could happen next in this scene?' },
    { label: 'More tense', value: 'Rewrite this scene to feel more tense and urgent.' },
    { label: 'More natural', value: 'How could I rewrite this to sound more natural?' },
    { label: 'Dialogue idea', value: 'Write a short dialogue exchange that could fit here.' },
    { label: 'How to end it?', value: 'How could I end this scene effectively?' },
]

export default function AiHelperPanel({
    projectId, sceneText, onInsert, linkedCharacters = [], linkedIdeas = [], linkedLocations = [], linkedObjects = [],
    projectRelationships = [],
    selectedNodes = [], allNodes = [], allScenes = [], onClearSelection, aiSettings, projectType
}: AiHelperPanelProps) {
    const isNovel = projectType === 'novel'
    const label = isNovel ? 'Chapter' : 'Scene'

    const [prompt, setPrompt] = useState('')
    const [lastPrompt, setLastPrompt] = useState('')
    const [copied, setCopied] = useState(false)
    // Holds the previous response while a new one is loading — avoids blank flash
    const [previousCompletion, setPreviousCompletion] = useState('')
    const [previewOpen, setPreviewOpen] = useState(false)
    const [promptMode, setPromptMode] = useState('Review / Chat')
    const [isOllamaLoading, setIsOllamaLoading] = useState(false)
    const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'online' | 'offline'>('checking')
    const [lastUsedProvider, setLastUsedProvider] = useState<'gemini' | 'ollama' | null>(null)

    // Snapshot scene text at submit time so the hook body stays stable during streaming
    const sceneTextRef = useRef(sceneText)
    sceneTextRef.current = sceneText

    const storySelectionContext = useMemo(() => {
        if (!selectedNodes?.length || !allNodes?.length || !allScenes?.length) return []
        const sceneIds = new Set<string>()
        const results: { title: string, content: string, node_id: string }[] = []
        
        for (const node of selectedNodes) {
             const scenesInside = getDescendantScenes(node.id, allNodes, allScenes)
             for (const s of scenesInside) {
                  if (!sceneIds.has(s.id)) {
                       sceneIds.add(s.id)
                       const nodeRef = allNodes.find(n => n.id === s.node_id)
                       results.push({
                           title: nodeRef?.title || 'Unknown Scene',
                           content: extractTextFromJson(s.content),
                           node_id: s.node_id
                       })
                  }
             }
        }
        return results
    }, [selectedNodes, allNodes, allScenes])

    const contextSizeChars = useMemo(() => {
        return storySelectionContext.reduce((acc, s) => acc + s.title.length + s.content.length, 0)
    }, [storySelectionContext])

    const isContextTooLarge = contextSizeChars > 30000 // Blocking over 30k chars

    const { completion, complete, isLoading, error, setCompletion } = useCompletion({
        api: '/api/ai',
        streamProtocol: 'text',
        body: useMemo(() => ({ action: 'helper', projectId }), [projectId]),
        onError: (err) => {
            console.error('AI Error:', err)
        }
    })

    // What to display: live completion takes priority; fall back to previous while loading
    const actualLoading = isLoading || isOllamaLoading
    const displayedCompletion = completion || (actualLoading ? previousCompletion : '')
    const isShowingPrevious = actualLoading && !completion && !!previousCompletion

    const handleInsert = () => {
        onInsert(displayedCompletion)
        handleClear()
    }

    const handleTemplate = (value: string) => {
        setPrompt(value)
    }

    // --- Provider Orchestration ---
    const runGeminiCloud = async (finalPrompt: string) => {
        setLastUsedProvider('gemini')
        await complete(finalPrompt, {
            body: {
                action: 'helper',
                projectId,
                input: sceneTextRef.current.slice(-10000),
                linkedCharacters: linkedCharacters.map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    description: c.description,
                    notes: c.notes
                })),
                linkedIdeas: linkedIdeas.map((i: any) => ({
                    id: i.id,
                    title: i.title,
                    content: i.content
                })),
                linkedLocations: linkedLocations.map((l: any) => ({
                    id: l.id,
                    name: l.name,
                    description: l.description,
                    atmosphere: l.atmosphere
                })),
                linkedObjects: linkedObjects.map((o: any) => ({
                    id: o.id,
                    name: o.name,
                    description: o.description,
                    significance: o.significance
                })),
                projectRelationships: projectRelationships.map((r: any) => ({
                    id: r.id,
                    source_id: r.source_id,
                    target_id: r.target_id,
                    relation_label: r.relation_label,
                    is_symmetrical: r.is_symmetrical
                })),
                storyContext: storySelectionContext.map(s => ({
                    title: s.title,
                    content: s.content.slice(0, 10000) // Safety truncation per scene
                }))
            }
        })
    }

    const runLocalOllama = async (finalPrompt: string) => {
        // Build the prompt with context
        const projectContext = `Project: ${projectId}. `
        const charactersContext = linkedCharacters.length > 0 
            ? `Characters: ${linkedCharacters.map(c => c.name).join(', ')}. ` 
            : ''
        const ideasContext = linkedIdeas.length > 0 
            ? `Ideas: ${linkedIdeas.map(i => i.title).join(', ')}. ` 
            : ''
        const locationsContext = linkedLocations.length > 0 
            ? `Locations: ${linkedLocations.map(l => l.name).join(', ')}. ` 
            : ''
        
        const storyContextString = storySelectionContext.length > 0
            ? `STORY CONTEXT:\n${storySelectionContext.map(s => `[${s.title}]\n${s.content.slice(0, 5000)}`).join('\n\n')}\n\n`
            : ''
        
        const fullInternalPrompt = `${projectContext}${charactersContext}${ideasContext}${locationsContext}\n\n${storyContextString}SCENE:\n${sceneTextRef.current.slice(-6000)}\n\nUSER REQUEST: ${finalPrompt}`

        setIsOllamaLoading(true)
        try {
            const response = await fetch(`${aiSettings.ollama_url}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: aiSettings.ollama_model,
                    prompt: fullInternalPrompt,
                    stream: true
                })
            })

            if (!response.ok || !response.body) {
                throw new Error(response.status === 404 ? 'Ollama model not found' : 'Ollama connection failed')
            }

            setLastUsedProvider('ollama')
            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let accumulated = ''
            let buffer = ''

            // Better stream handling for Ollama's NDJSON
            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value, { stream: true })
                buffer += chunk
                
                const lines = buffer.split('\n')
                // Keep the last partial line in the buffer
                buffer = lines.pop() || ''
                
                for (const line of lines) {
                    if (!line.trim()) continue
                    try {
                        const json = JSON.parse(line)
                        if (json.response) {
                            accumulated += json.response
                            setCompletion(accumulated)
                        }
                    } catch (e) {
                        // Malformed line - usually shouldn't happen with .pop() strategy
                    }
                }
            }
        } catch (err: any) {
            if (aiSettings.ai_fallback_enabled && aiSettings.api_key) {
                console.warn('Ollama failed, falling back to Gemini:', err.message)
                await runGeminiCloud(finalPrompt)
            } else {
                throw err
            }
        } finally {
            setIsOllamaLoading(false)
        }
    }

    const handleCopy = async () => {
        if (!displayedCompletion) return
        try {
            await navigator.clipboard.writeText(displayedCompletion)
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!aiSettings.ai_enabled) return
        const currentPrompt = prompt.trim()
        if (actualLoading || isContextTooLarge) return

        const modeRules = projectType === 'tv_script'
            ? `\n\nWrite in professional screenplay format (scene headings, character names in caps, dialogue, etc.).\nDo not give advice, suggestions, or explanations.\nOutput only the script.`
            : `\n\nWrite in narrative prose.\nDo not give advice, suggestions, or explanations.\nOutput only the story.`
        
        let finalPrompt = ''

        if (promptMode === 'Continue Writing') {
            finalPrompt = currentPrompt 
                ? `Continue the scene based on these instructions: ${currentPrompt}${modeRules}`
                : `Continue the scene.${modeRules}`
        } else if (promptMode === 'Improve Scene') {
            finalPrompt = currentPrompt 
                ? `Continue the scene by improving clarity, flow, and quality.\n\nUser instructions: ${currentPrompt}${modeRules}`
                : `Continue the scene by improving clarity, flow, and quality.${modeRules}`
        } else if (promptMode === 'Add Conflict') {
            finalPrompt = currentPrompt 
                ? `Continue the scene by introducing tension, stakes, or conflict.\n\nUser instructions: ${currentPrompt}${modeRules}`
                : `Continue the scene by introducing tension, stakes, or conflict.${modeRules}`
        } else if (promptMode === 'Rewrite with Emotion') {
            finalPrompt = currentPrompt 
                ? `Continue the scene by enhancing emotional depth and character expression.\n\nUser instructions: ${currentPrompt}${modeRules}`
                : `Continue the scene by enhancing emotional depth and character expression.${modeRules}`
        } else if (promptMode === 'Review / Chat') {
            finalPrompt = currentPrompt || 'Review the selected context and offer thoughtful insights.'
        }

        setLastPrompt(currentPrompt || promptMode)
        setPrompt('')
        setCopied(false)
        setCompletion('') // Clear for new run
        setLastUsedProvider(null)
        
        if (displayedCompletion) setPreviousCompletion(displayedCompletion)
        
        try {
            if (aiSettings.ai_provider === 'ollama') {
                // We use a manual fetch for Ollama to handle the 127.0.0.1 browser routing requirement
                // useCompletion is used for Gemini
                await runLocalOllama(finalPrompt)
            } else {
                await runGeminiCloud(finalPrompt)
            }
        } catch (err: any) {
            console.error('AI Processing Error:', err)
        } finally {
            setPreviousCompletion('')
        }
    }

    // Check Ollama status on mount
    useEffect(() => {
        const checkStatus = async () => {
            if (aiSettings.ai_provider !== 'ollama') return
            
            try {
                const response = await fetch(`${aiSettings.ollama_url}/api/tags`, {
                    method: 'GET',
                    signal: AbortSignal.timeout(3000)
                })
                setOllamaStatus(response.ok ? 'online' : 'offline')
            } catch {
                setOllamaStatus('offline')
            }
        }
        checkStatus()
    }, [aiSettings.ai_provider, aiSettings.ollama_url])

    // Pick a random hint on mount
    const [hint, setHint] = useState('')
    useEffect(() => {
        setHint(EMPTY_HINTS[Math.floor(Math.random() * EMPTY_HINTS.length)])
    }, [])

    return (
        <div className="flex flex-col h-full bg-[#fcfbf9] border-l border-slate-200/60 shadow-[-20px_0_50px_rgba(0,0,0,0.02)]">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-200/60 flex items-center gap-3 bg-white/50 backdrop-blur-sm">
                <div className="p-2 bg-indigo-50 rounded-xl">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-serif font-bold text-slate-800">{label} Helper</h3>
                    <div className="flex items-center gap-2">
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                            {aiSettings.ai_provider === 'ollama' ? `Ollama (${aiSettings.ollama_model})` : 'Gemini'}
                        </p>
                        {aiSettings.ai_provider === 'ollama' && (
                            <div className="flex items-center gap-1">
                                <div className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    ollamaStatus === 'online' ? "bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.5)]" : 
                                    ollamaStatus === 'checking' ? "bg-slate-300 animate-pulse" : "bg-red-400"
                                )} />
                                <span className={cn(
                                    "text-[9px] font-bold uppercase tracking-tight",
                                    ollamaStatus === 'online' ? "text-green-600" : 
                                    ollamaStatus === 'checking' ? "text-slate-400" : "text-red-500"
                                )}>
                                    {ollamaStatus}
                                </span>
                            </div>
                        )}
                    </div>
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
            <div className="bg-[#fcfbf9] px-6 py-2 border-b border-slate-200/60 flex flex-wrap items-center gap-2 text-[10px] text-slate-400 font-medium">
                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-slate-200 rounded-full"></div>Current {label.toLowerCase()}</span>
                {linkedCharacters.length > 0 && (
                    <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-indigo-200 rounded-full"></div>{linkedCharacters.length} character{linkedCharacters.length !== 1 ? 's' : ''}</span>
                )}
                {linkedIdeas.length > 0 && (
                    <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-amber-200 rounded-full"></div>{linkedIdeas.length} idea{linkedIdeas.length !== 1 ? 's' : ''}</span>
                )}
                {linkedLocations.length > 0 && (
                    <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-200 rounded-full"></div>{linkedLocations.length} location{linkedLocations.length !== 1 ? 's' : ''}</span>
                )}
                {linkedObjects.length > 0 && (
                    <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-blue-200 rounded-full"></div>{linkedObjects.length} object{linkedObjects.length !== 1 ? 's' : ''}</span>
                )}
                {selectedNodes.length > 0 && (
                    <span className="flex items-center gap-1.5 text-indigo-500 bg-indigo-50/50 px-2 py-0.5 rounded-full border border-indigo-100">
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                        {selectedNodes.length} story element{selectedNodes.length !== 1 ? 's' : ''}
                    </span>
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
                        {error.message?.includes('NO_API_KEY') ? (
                            <>
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-red-900">API Key Missing</p>
                                    <p className="text-xs text-red-500 leading-relaxed font-serif italic">
                                        Please provide an AI API key in your account settings to use the Scene Helper.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-full bg-white border-red-200 text-red-700 hover:bg-red-50 rounded-xl gap-2 text-xs"
                                >
                                    <Link href="/settings" className="flex items-center gap-2 w-full justify-center">
                                        <Settings className="w-3 h-3" />
                                        Go to Settings
                                    </Link>
                                </Button>
                            </>
                        ) : (
                            <>
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-red-900">Something went wrong</p>
                                    <p className="text-xs text-red-500 leading-relaxed font-serif italic">
                                        The AI partner ran into an issue. Your prompt is saved — you can retry below.
                                        {error.message ? ` (${error.message})` : ''}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    onClick={() => lastPrompt && handleSubmit({ preventDefault: () => {} } as any)}
                                    variant="outline"
                                    size="sm"
                                    disabled={!lastPrompt || isLoading}
                                    className="w-full bg-white border-red-200 text-red-700 hover:bg-red-50 rounded-xl gap-2 text-xs"
                                >
                                    <RefreshCcw className="w-3 h-3" />
                                    Try again
                                </Button>
                            </>
                        )}
                    </div>
                )}

                {/* Response — shown during streaming, with previous faded while waiting */}
                {displayedCompletion && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* Prompt label */}
                        {lastPrompt && (
                            <div className="flex items-center justify-between px-1">
                                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                                    {lastPrompt.length > 50 ? lastPrompt.slice(0, 50) + '…' : lastPrompt}
                                </p>
                                {lastUsedProvider && !actualLoading && (
                                    <div className={cn(
                                        "text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md border",
                                        lastUsedProvider === 'ollama' 
                                            ? "bg-indigo-50 border-indigo-100 text-indigo-400" 
                                            : "bg-blue-50 border-blue-100 text-blue-400"
                                    )}>
                                        {lastUsedProvider}
                                    </div>
                                )}
                            </div>
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
                        <span>AI {label} Context Preview</span>
                        {previewOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </button>
                    
                    {previewOpen && (
                        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 max-h-48 overflow-y-auto text-[11px] font-mono whitespace-pre-wrap text-slate-600 space-y-4">
                            <div>
                                <div className="font-bold text-slate-400 mb-1">{label.toUpperCase()}:</div>
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

                            {linkedLocations.length > 0 && (
                                <div>
                                    <div className="font-bold text-slate-400 mb-1">LOCATIONS:</div>
                                    <ul className="list-disc pl-4 space-y-1 bg-white p-2 border border-slate-100 rounded-lg">
                                        {linkedLocations.map(l => (
                                            <li key={l.id}>
                                                <span className="font-bold">{l.name}</span>: {l.atmosphere || l.description || 'No description'}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {linkedObjects.length > 0 && (
                                <div>
                                    <div className="font-bold text-slate-400 mb-1">OBJECTS/ITEMS:</div>
                                    <ul className="list-disc pl-4 space-y-1 bg-white p-2 border border-slate-100 rounded-lg">
                                        {linkedObjects.map(o => (
                                            <li key={o.id}>
                                                <span className="font-bold">{o.name}</span>: {o.significance || o.description || 'No description'}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {(() => {
                                const relevantIds = [
                                    ...linkedCharacters.map(c => c.id),
                                    ...linkedLocations.map(l => l.id),
                                    ...linkedObjects.map(o => o.id)
                                ]
                                const ties = projectRelationships.filter(r => relevantIds.includes(r.source_id) && relevantIds.includes(r.target_id)).slice(0, 5)
                                if (ties.length === 0) return null
                                
                                return (
                                    <div className="animate-in fade-in slide-in-from-top-1 duration-500">
                                        <div className="font-bold text-indigo-400 mb-1">WORLD TIES ({label} Relevant):</div>
                                        <ul className="list-disc pl-4 space-y-1 bg-indigo-50/30 p-2 border border-indigo-100 rounded-lg text-indigo-900 italic">
                                            {ties.map(t => {
                                                const source = [...linkedCharacters, ...linkedLocations, ...linkedObjects].find(e => e.id === t.source_id)
                                                const target = [...linkedCharacters, ...linkedLocations, ...linkedObjects].find(e => e.id === t.target_id)
                                                return (
                                                    <li key={t.id}>
                                                        <span className="font-bold not-italic">{source?.name || 'Unknown'}</span> 
                                                        {t.is_symmetrical ? ' and ' : ` is ${t.relation_label} to `}
                                                        <span className="font-bold not-italic">{target?.name || 'Unknown'}</span>
                                                        {t.is_symmetrical && ` are ${t.relation_label}`}
                                                    </li>
                                                )
                                            })}
                                        </ul>
                                    </div>
                                )
                            })()}

                            {storySelectionContext.length > 0 && (
                                <div>
                                    <div className="font-bold text-slate-400 mb-1 flex items-center justify-between">
                                        <span>STORY CONTEXT ({storySelectionContext.length} scenes):</span>
                                        {onClearSelection && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onClearSelection() }} 
                                                className="text-indigo-500 hover:text-indigo-600 transition-colors"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-2 bg-white p-2 border border-slate-100 rounded-lg">
                                        {storySelectionContext.slice(0, 3).map(s => (
                                            <div key={s.node_id} className="border-b border-slate-50 last:border-0 pb-1.5 mb-1.5">
                                                <div className="font-bold text-slate-700 truncate">{s.title}</div>
                                                <div className="line-clamp-2 text-slate-400 italic text-[10px]">
                                                    {s.content || '(No text yet)'}
                                                </div>
                                            </div>
                                        ))}
                                        {storySelectionContext.length > 3 && (
                                            <div className="text-center py-1 text-slate-300 italic">+ {storySelectionContext.length - 3} more elements</div>
                                        )}
                                    </div>
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
                        {isContextTooLarge && (
                            <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-[10px] leading-snug animate-in fade-in zoom-in duration-300">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <p>This selection is too large to send directly. Reduce the selection or use summarized context.</p>
                            </div>
                        )}
                        {actualLoading && (
                            <div className="flex items-center gap-2 mb-2 px-2 text-[10px] text-indigo-500/80 font-bold uppercase tracking-wider animate-in slide-in-from-top-1 duration-500">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>
                                </span>
                                {aiSettings.ai_provider === 'ollama' ? "Thinking with Ollama..." : "Generating with Gemini..."}
                            </div>
                        )}
                        <div className={cn(
                            "relative group transition-all duration-500",
                            actualLoading && "ring-2 ring-indigo-500/10 rounded-2xl animate-pulse"
                        )}>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        handleSubmit(e as any)
                                    }
                                }}
                                placeholder={actualLoading ? "" : `Ask anything about this ${label.toLowerCase()}…`}
                                rows={3}
                                className={cn(
                                    "w-full border border-slate-200 rounded-2xl py-3.5 pl-4 pr-12 text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all resize-none outline-none placeholder:text-slate-400 font-serif leading-relaxed shadow-sm",
                                    actualLoading ? "bg-white cursor-wait" : "bg-slate-50"
                                )}
                            ></textarea>
                            <button
                                type="submit"
                                disabled={actualLoading || (!prompt.trim() && promptMode !== 'Review / Chat') || isContextTooLarge}
                                className={cn(
                                    "absolute bottom-3.5 right-3.5 p-2 rounded-xl transition-all active:scale-95 flex items-center justify-center min-w-[34px] min-h-[34px]",
                                    !actualLoading && !isContextTooLarge && (prompt.trim() || promptMode === 'Review / Chat')
                                        ? "bg-indigo-500 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-100"
                                        : "bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200"
                                )}
                            >
                                {actualLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center">
                                    AI Mode:
                                    <TooltipProvider delay={300}>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Info className="w-3.5 h-3.5 ml-1.5 text-slate-300 hover:text-slate-500 cursor-help transition-colors" />
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="text-xs">
                                                {MODE_EXPLANATIONS[promptMode]}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </label>
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
