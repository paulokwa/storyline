'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
    Search, 
    Bookmark, 
    Calendar, 
    ChevronRight, 
    Trash2, 
    Copy, 
    Check,
    Archive,
    Type,
    Sparkles,
    MousePointer2,
    Clock,
    Users,
    MapPin,
    Lightbulb,
    Package,
    Plus,
    Loader2
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { StableInput } from '@/components/ui/stable-input'
import { Button } from '@/components/ui/button'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from '@/lib/utils'
import { softDeleteEntity } from '@/lib/supabase/recovery'

interface SavedResponse {
    id: string
    title: string
    auto_title: string
    prompt: string
    response: string
    type: string
    source_label: string
    model: string
    action: string
    created_at: string
    linked_entities: any
    context_snapshot: string
    source_node_id: string | null
    source_scene_id: string | null
}

export default function SavedResponsesTab({ projectId }: { projectId: string }) {
    const [responses, setResponses] = useState<SavedResponse[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [typeFilter, setTypeFilter] = useState<string>('all')

    // Phase 4 states
    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [titleDraft, setTitleDraft] = useState('')
    const [isSavingAction, setIsSavingAction] = useState(false)
    const [isInserting, setIsInserting] = useState(false)
    const [insertSuccess, setInsertSuccess] = useState(false)
    const [availableScenes, setAvailableScenes] = useState<{ id: string, title: string }[]>([])
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false)

    const supabase = createClient()

    useEffect(() => {
        async function loadResponses() {
            try {
                setIsLoading(true)
                const { data, error } = await (supabase
                    .from('ai_responses' as any) as any)
                    .select('*')
                    .eq('project_id', projectId)
                    .is('deleted_at', null)
                    .order('created_at', { ascending: false })
                
                if (error) throw error
                if (data) {
                    setResponses(data as SavedResponse[])
                    if (data.length > 0 && !selectedId) {
                        // On desktop, auto-select first. On mobile, leave null to show list.
                        if (typeof window !== 'undefined' && window.innerWidth >= 768) {
                            setSelectedId(data[0].id)
                        }
                    }
                }
            } catch (err: any) {
                console.error('Error loading archived responses:', err.message)
            } finally {
                setIsLoading(false)
            }
        }
        loadResponses()
    }, [projectId, supabase, selectedId])

    // Extra safeguard for mobile selection reset
    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setSelectedId(null)
        }
    }, [])

    useEffect(() => {
        async function loadScenes() {
            try {
                const { data, error } = await (supabase
                    .from('structure_nodes' as any) as any)
                    .select('id, title, type')
                    .eq('project_id', projectId)
                    .eq('type', 'scene')
                    .order('order_index', { ascending: true })
                
                if (error) throw error
                if (data) setAvailableScenes(data)
            } catch (err: any) {
                console.error('Error loading scenes for picker:', err.message)
            }
        }
        loadScenes()
    }, [projectId, supabase])

    const filteredResponses = useMemo(() => {
        return responses.filter(r => {
            const matchesSearch = 
                r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.response.toLowerCase().includes(searchQuery.toLowerCase())
            
            const matchesType = typeFilter === 'all' || r.type === typeFilter
            
            return matchesSearch && matchesType
        })
    }, [responses, searchQuery, typeFilter])

    const selectedResponse = useMemo(() => {
        return responses.find(r => r.id === selectedId)
    }, [responses, selectedId])

    const formatDate = (dateStr: string) => {
        try {
            return new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(new Date(dateStr))
        } catch (e) {
            return dateStr
        }
    }

    const handleCopy = async (text: string, id: string) => {
        await navigator.clipboard.writeText(text)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const saveTitle = async () => {
        if (!selectedResponse || !titleDraft.trim()) {
            setIsEditingTitle(false)
            return
        }
        setIsSavingAction(true)
        try {
            const { error } = await (supabase
                .from('ai_responses' as any) as any)
                .update({ 
                    title: titleDraft.trim(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', selectedResponse.id)
            
            if (error) throw error
            
            setResponses(prev => prev.map(r => r.id === selectedResponse.id ? { ...r, title: titleDraft.trim() } : r))
            setIsEditingTitle(false)
        } catch (err: any) {
            console.error('Error renaming response:', err.message)
            alert('Failed to rename response. Please try again.')
        } finally {
            setIsSavingAction(false)
        }
    }

    const deleteResponse = async (id: string) => {
        setIsSavingAction(true)
        try {
            await softDeleteEntity(supabase, 'ai_responses', id)

            setResponses(prev => {
                const next = prev.filter(r => r.id !== id)
                if (selectedId === id) {
                    setSelectedId(next.length > 0 ? next[0].id : null)
                }
                return next
            })
        } catch (err: any) {
            console.error('Error soft deleting response:', err.message)
        } finally {
            setIsSavingAction(false)
        }
    }

    const insertIntoScene = async (sceneId: string) => {
        if (!selectedResponse) return
        setIsSavingAction(true)
        
        try {
            // 1. Get current content
            const { data: scene, error: fetchError } = await (supabase
                .from('scenes' as any) as any)
                .select('content')
                .eq('node_id', sceneId)
                .single()
            
            if (fetchError) throw fetchError
            
            if (scene) {
                const currentContent = scene.content || ''
                // Append as a new paragraph (assuming HTML string from Tiptap)
                // If it's empty, just start with the paragraph
                const newContent = `${currentContent}<p>${selectedResponse.response.replace(/\n/g, '<br>')}</p>`
                
                const { error: updateError } = await (supabase
                    .from('scenes' as any) as any)
                    .update({ 
                        content: newContent,
                        updated_at: new Date().toISOString()
                    })
                    .eq('node_id', sceneId)
                
                if (updateError) throw updateError

                setInsertSuccess(true)
                setTimeout(() => setInsertSuccess(false), 3000)
                setIsInserting(false)
            }
        } catch (err: any) {
            console.error('Error inserting into scene:', err.message)
            alert('Failed to insert into scene. Please try again.')
        } finally {
            setIsSavingAction(false)
        }
    }

    if (isLoading) {
        return (
            <div className="ai-memory-tab ai-memory-tab-loading flex-1 w-full flex items-center justify-center bg-[#fbf9f5]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-[#546354]/10 border-t-[#546354] rounded-full animate-spin" />
                    <p className="text-sm font-serif italic text-slate-400">Opening AI Memory...</p>
                </div>
            </div>
        )
    }

    if (responses.length === 0) {
        return (
            <div className="ai-memory-tab ai-memory-tab-empty flex-1 w-full flex flex-col items-center justify-center p-12 text-center bg-[#fbf9f5]">
                <div className="w-20 h-20 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 flex items-center justify-center mb-6 border border-slate-50">
                    <Archive className="w-8 h-8 text-slate-200" />
                </div>
                <h3 className="text-2xl font-serif text-slate-800 mb-2">AI Memory is Empty</h3>
                <p className="text-slate-500 max-w-sm font-medium leading-relaxed mb-6">
                    You haven't saved any AI responses yet. When working with your AI Partner, click "Save" to archive useful outputs here.
                </p>
            </div>
        )
    }

    return (
        <div className="ai-memory-tab flex-1 flex overflow-hidden bg-[#fbf9f5]">
            {/* List Sidebar */}
            <div className={cn(
                "w-full md:w-[350px] lg:w-[400px] border-r border-[#e0ded9] flex flex-col bg-white transition-all duration-300",
                selectedId && "hidden md:flex"
            )}>
                <div className="p-4 border-b border-slate-100 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                            placeholder="Search archive..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 rounded-full border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-indigo-100 transition-all h-10"
                        />
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                        {['all', 'analysis', 'rewrite', 'brainstorm', 'continuation', 'custom'].map(t => (
                            <button
                                key={t}
                                onClick={() => setTypeFilter(t)}
                                className={cn(
                                    "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border",
                                    typeFilter === t 
                                        ? "bg-[#546354] text-white border-[#546354] shadow-md shadow-[#546354]/10" 
                                        : "bg-white text-slate-500 border-slate-100 hover:border-slate-300"
                                )}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {filteredResponses.length === 0 ? (
                        <div className="p-12 text-center space-y-2">
                            <p className="text-sm font-serif italic text-slate-400">No matches found</p>
                        </div>
                    ) : (
                        filteredResponses.map((r) => (
                            <button
                                key={r.id}
                                onClick={() => {
                                    setSelectedId(r.id)
                                    setIsEditingTitle(false)
                                }}
                                className={cn(
                                    "w-full p-5 text-left transition-all border-b border-slate-50 group hover:bg-slate-50 relative",
                                    selectedId === r.id ? "bg-[#546354]/5 border-l-4 border-l-[#546354]" : "bg-white"
                                )}
                            >
                                <div className="space-y-2">
                                    <div className="flex justify-between items-start">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#546354] bg-[#546354]/10 px-2 py-0.5 rounded-md">
                                            {r.type}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-medium">
                                            {new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <h4 className={cn(
                                        "text-sm font-serif font-bold line-clamp-1 truncate transition-colors",
                                        selectedId === r.id ? "text-[#31332f]" : "text-slate-700 group-hover:text-[#546354]"
                                    )}>
                                        {r.title}
                                    </h4>
                                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed italic">
                                        "{r.prompt}"
                                    </p>
                                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                        <span className="flex items-center gap-1">
                                            <MousePointer2 className="w-3 h-3" />
                                            {r.source_label?.split(':')[0] || 'Chat'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Sparkles className="w-3 h-3" />
                                            {r.model?.includes('Gemini') ? 'Gemini' : 'AI'}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Detail View */}
            <div className={cn(
                "flex-1 flex flex-col bg-[#fbf9f5] overflow-hidden relative",
                !selectedId && "hidden md:flex"
            )}>
                {selectedResponse ? (
                    <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden">
                        {/* Mobile Back Button */}
                        <div className="md:hidden sticky top-0 z-20 px-8 py-4 bg-[#fbf9f5] border-b border-slate-100">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setSelectedId(null)}
                                className="text-[#546354] gap-2 px-0 hover:bg-transparent"
                            >
                                <ChevronRight className="w-4 h-4 rotate-180" />
                                Back
                            </Button>
                        </div>
                        {/* Detail Header */}
                        <div className="p-8 pb-4 bg-white border-b border-slate-100 flex items-start justify-between">
                            <div className="space-y-4 flex-1 pr-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100/50 shrink-0">
                                        <Bookmark className="w-6 h-6 text-amber-600" />
                                    </div>
                                    <div className="space-y-1 flex-1">
                                        {isEditingTitle ? (
                                            <div className="flex items-center gap-2 max-w-xl animate-in fade-in slide-in-from-left-2 duration-300">
                                                <StableInput 
                                                    value={titleDraft}
                                                    onValueChange={setTitleDraft}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') saveTitle()
                                                        if (e.key === 'Escape') setIsEditingTitle(false)
                                                    }}
                                                    autoFocus
                                                    className="text-xl font-serif font-bold h-10 border-indigo-200"
                                                />
                                                <Button size="sm" onClick={saveTitle} disabled={isSavingAction} className="bg-indigo-600 hover:bg-indigo-700 h-10 px-4 rounded-xl">Save</Button>
                                                <Button size="sm" variant="ghost" onClick={() => setIsEditingTitle(false)} className="h-10 text-slate-400">Cancel</Button>
                                            </div>
                                        ) : (
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <h2 
                                                        className="text-2xl font-serif font-bold text-slate-800 leading-tight group cursor-pointer hover:text-[#546354] transition-colors flex items-center gap-2"
                                                        onClick={() => {
                                                            setTitleDraft(selectedResponse.title)
                                                            setIsEditingTitle(true)
                                                        }}
                                                    >
                                                        {selectedResponse.title}
                                                    </h2>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">Click to edit title</TooltipContent>
                                            </Tooltip>
                                        )}
                                        <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                                            <span className="flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {formatDate(selectedResponse.created_at)}
                                            </span>
                                            <span className="flex items-center gap-1.5 capitalize">
                                                <Type className="w-3.5 h-3.5" />
                                                Category: {selectedResponse.type}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {insertSuccess && (
                                    <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest animate-in fade-in slide-in-from-right-2 duration-500 flex items-center gap-1 mr-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                                        <Check className="w-3 h-3" />
                                        Inserted into Scene
                                    </span>
                                )}
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsInserting(true)}
                                            disabled={availableScenes.length === 0}
                                            className={cn(
                                                "rounded-xl h-10 px-4 transition-all active:scale-95 border-slate-200 text-[#546354]",
                                                availableScenes.length > 0 ? "hover:bg-indigo-50 hover:border-indigo-200" : "opacity-50 cursor-not-allowed"
                                            )}
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Insert into Scene
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                        {availableScenes.length === 0 ? "No scenes available to insert into" : "Insert into a scene"}
                                    </TooltipContent>
                                </Tooltip>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCopy(selectedResponse.response, selectedResponse.id)}
                                    className="rounded-xl h-10 px-4 transition-all active:scale-95 border-slate-200 text-[#546354] hover:bg-[#546354]/5 hover:border-[#546354]/20"
                                >
                                    {copiedId === selectedResponse.id ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                    {copiedId === selectedResponse.id ? 'Copied' : 'Copy Response'}
                                </Button>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => deleteResponse(selectedResponse.id)}
                                            className="rounded-xl h-10 w-10 border-slate-200 text-slate-400 hover:text-amber-500 hover:border-amber-100 hover:bg-amber-50 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Move to Trash</TooltipContent>
                                </Tooltip>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-12 space-y-12 max-w-5xl mx-auto w-full no-scrollbar">
                            {/* Prompt Section */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-4 bg-amber-200 rounded-full"></div>
                                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Original Request</h3>
                                </div>
                                <div className="bg-white/60 rounded-[2rem] p-8 border border-slate-100 shadow-sm shadow-slate-200/20 italic font-serif text-slate-600 leading-relaxed text-lg whitespace-pre-wrap">
                                    "{selectedResponse.prompt}"
                                </div>
                            </section>

                            {/* Response Section */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-4 bg-[#546354]/30 rounded-full"></div>
                                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">AI Response</h3>
                                </div>
                                <div className="bg-white rounded-[2rem] p-10 border border-slate-100 shadow-xl shadow-slate-200/10 font-serif text-slate-800 leading-relaxed text-lg whitespace-pre-wrap">
                                    {selectedResponse.response}
                                </div>
                            </section>

                            {/* Metadata Section */}
                            <section className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                                <div className="space-y-4 p-8 bg-white/40 rounded-3xl border border-slate-100/50">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Provenance</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] text-slate-400 italic">Action Type</p>
                                                <p className="text-sm text-slate-700 font-medium capitalize">{selectedResponse.action || 'Manual'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 italic">Model Used</p>
                                                <p className="text-sm text-slate-700 font-medium">{selectedResponse.model}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <p className="text-[10px] text-slate-400 italic">Source Origin</p>
                                                <p className="text-sm text-slate-700 font-medium">{selectedResponse.source_label}</p>
                                            </div>
                                            {selectedResponse.context_snapshot && (
                                                <div>
                                                    <p className="text-[10px] text-slate-400 italic">Context Snapshot</p>
                                                    <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-3 bg-slate-50 p-2 rounded-lg border border-slate-100">{selectedResponse.context_snapshot}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 p-8 bg-white/40 rounded-3xl border border-slate-100/50">
                                    <div className="flex items-center gap-2">
                                        <Search className="w-3.5 h-3.5 text-slate-400" />
                                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Linked Entities</h3>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedResponse.linked_entities?.characters?.map((c: any) => (
                                            <div key={c.id} className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full border border-blue-100 text-[10px] font-bold uppercase">
                                                <Users className="w-3 h-3" />
                                                {c.name}
                                            </div>
                                        ))}
                                        {selectedResponse.linked_entities?.locations?.map((l: any) => (
                                            <div key={l.id} className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full border border-emerald-100 text-[10px] font-bold uppercase">
                                                <MapPin className="w-3 h-3" />
                                                {l.name}
                                            </div>
                                        ))}
                                        {selectedResponse.linked_entities?.ideas?.map((i: any) => (
                                            <div key={i.id} className="flex items-center gap-1.5 bg-amber-50 text-amber-600 px-3 py-1.5 rounded-full border border-amber-100 text-[10px] font-bold uppercase">
                                                <Lightbulb className="w-3 h-3" />
                                                {i.title}
                                            </div>
                                        ))}
                                        {selectedResponse.linked_entities?.objects?.map((o: any) => (
                                            <div key={o.id} className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full border border-indigo-100 text-[10px] font-bold uppercase">
                                                <Package className="w-3 h-3" />
                                                {o.name}
                                            </div>
                                        ))}
                                        {selectedResponse.linked_entities?.storyContextNodes?.map((n: any) => (
                                            <div key={n.id} className="flex items-center gap-1.5 bg-slate-50 text-slate-600 px-3 py-1.5 rounded-full border border-slate-200 text-[10px] font-bold uppercase">
                                                <Bookmark className="w-3 h-3" />
                                                {n.type}: {n.title}
                                            </div>
                                        ))}
                                        {(!selectedResponse.linked_entities || Object.values(selectedResponse.linked_entities).every((v: any) => !v?.length)) && (
                                            <p className="text-xs text-slate-400 font-medium italic">No entities linked at generation time.</p>
                                        )}
                                    </div>
                                </div>
                            </section>
                            <div className="h-12" /> {/* Bottom spacing */}
                        </div>

                        {/* Insertion Modal */}
                        {isInserting && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-white/40 backdrop-blur-sm animate-in fade-in duration-300">
                                <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                                    <div className="p-6 border-b border-slate-50">
                                        <h3 className="text-lg font-serif font-bold text-slate-800">Target a Scene</h3>
                                        <p className="text-xs text-slate-500 mt-1">Select a scene to append this response to.</p>
                                    </div>
                                    <div className="flex-1 max-h-[300px] overflow-y-auto p-4 space-y-2 no-scrollbar">
                                        {availableScenes.length === 0 ? (
                                            <p className="text-center py-8 text-sm text-slate-400 italic">No scenes found in this project.</p>
                                        ) : (
                                            availableScenes.map(s => (
                                                <button
                                                    key={s.id}
                                                    onClick={() => insertIntoScene(s.id)}
                                                    disabled={isSavingAction}
                                                    className={cn(
                                                        "w-full text-left p-4 hover:bg-slate-50 rounded-2xl transition-all border group flex items-center justify-between",
                                                        selectedResponse.source_node_id === s.id ? "bg-amber-50 border-amber-100" : "border-transparent hover:border-slate-100"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "w-2 h-2 rounded-full transition-transform group-hover:scale-125",
                                                            selectedResponse.source_node_id === s.id ? "bg-amber-400" : "bg-indigo-400"
                                                        )} />
                                                        <span className="text-sm font-medium text-slate-700">
                                                            {s.title}
                                                            {selectedResponse.source_node_id === s.id && <span className="ml-2 text-[10px] text-amber-600 font-bold uppercase tracking-wider">(Source)</span>}
                                                        </span>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-slate-300" />
                                                </button>
                                            ))
                                        )}
                                    </div>
                                    <div className="p-4 bg-slate-50 flex gap-2">
                                        <Button 
                                            variant="ghost" 
                                            className="flex-1 rounded-xl text-slate-500"
                                            onClick={() => setIsInserting(false)}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-40 space-y-6">
                         <div className="w-24 h-24 bg-white rounded-[3rem] shadow-xl shadow-slate-200/20 flex items-center justify-center border border-slate-50">
                            <Bookmark className="w-10 h-10 text-slate-200" />
                        </div>
                        <div className="space-y-1.5">
                            <h3 className="text-2xl font-serif text-slate-700">AI Memory Viewer</h3>
                            <p className="text-sm text-slate-500 max-w-[240px] font-medium leading-relaxed">
                                Select a response from the sidebar to view full details and linked entities.
                            </p>
                        </div>
                    </div>
                )}
                {isSavingAction && (
                    <div className="absolute top-4 right-4 animate-spin">
                        <Loader2 className="w-4 h-4 text-indigo-400" />
                    </div>
                )}
            </div>
        </div>
    )
}
