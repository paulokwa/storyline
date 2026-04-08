'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Lightbulb, Plus, Hash, Loader2, Sparkles, PenTool, Trash2, Pencil, ChevronRight, GripVertical } from 'lucide-react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { cn, reorder } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'
import { softDeleteEntity } from '@/lib/supabase/recovery'

type Idea = Database['public']['Tables']['ideas']['Row']

export default function IdeasTab({
    projectId,
    ideas: initialIdeas = []
}: {
    projectId: string
    ideas?: Idea[]
}) {
    const [localIdeas, setLocalIdeas] = useState<Idea[]>(initialIdeas)
    const [selectedId, setSelectedId] = useState<string | null>(initialIdeas[0]?.id ?? null)

    // On mobile, we want to go direct to the tab column (list) instead of an entry.
    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setSelectedId(null)
        }
    }, [])
    const [isCreating, setIsCreating] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [justSaved, setJustSaved] = useState(false)
    const [renamingId, setRenamingId] = useState<string | null>(null)
    const [renameValue, setRenameValue] = useState('')
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const renameInputRef = useRef<HTMLInputElement>(null)
    const selectedIdea = localIdeas.find((i: Idea) => i.id === selectedId)

    // Sync justSaved state
    useEffect(() => {
        if (!isSaving && isSaving !== undefined) {
            setJustSaved(true)
            const timer = setTimeout(() => setJustSaved(false), 2000)
            return () => clearTimeout(timer)
        }
    }, [isSaving])

    // Focus rename input when it opens
    useEffect(() => {
        if (renamingId && renameInputRef.current) {
            renameInputRef.current.focus()
            renameInputRef.current.select()
        }
    }, [renamingId])

    const saveIdea = useCallback(async (id: string, updates: Database['public']['Tables']['ideas']['Update']) => {
        setIsSaving(true)
        const supabase = createClient()
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
            .from('ideas')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (data) {
            setLocalIdeas((prev: Idea[]) => prev.map(i => i.id === id ? data as Idea : i))
        } else if (error) {
            console.error('Error saving idea:', error)
        }
        
        setIsSaving(false)
    }, [])

    const handleFieldChange = (id: string, field: keyof Idea, value: string) => {
        // Update local state immediately for responsiveness
        setLocalIdeas((prev: Idea[]) => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
        
        // Debounce the save
        if (saveTimer.current) clearTimeout(saveTimer.current)
        setIsSaving(true)
        saveTimer.current = setTimeout(() => {
            saveIdea(id, { [field]: value } as Database['public']['Tables']['ideas']['Update'])
        }, 1000)
    }

    async function handleDeleteIdea() {
        if (!selectedId) return
        setIsSaving(true)
        const supabase = createClient()
        try {
            await softDeleteEntity(supabase, 'ideas', selectedId)
            const index = localIdeas.findIndex(i => i.id === selectedId)
            const newIdeas = localIdeas.filter(i => i.id !== selectedId)
            setLocalIdeas(newIdeas)
            
            // Select next available idea or null
            if (newIdeas.length > 0) {
                const nextIndex = index < newIdeas.length ? index : newIdeas.length - 1
                setSelectedId(newIdeas[nextIndex].id)
            } else {
                setSelectedId(null)
            }
        } catch (error) {
            console.error('Error soft deleting idea:', error)
        }
        setShowDeleteConfirm(false)
        setIsSaving(false)
    }

    async function handleCreateIdea() {
        setIsCreating(true)
        const supabase = createClient() as any
        
        const nextOrderIndex = Math.max(0, ...localIdeas.map((i: Idea) => i.order_index)) + 1
        
        const { data, error } = await supabase
            .from('ideas')
            .insert({
                project_id: projectId,
                title: 'New Idea',
                content: '',
                order_index: nextOrderIndex
            })
            .select()
            .single()

        if (data) {
            setLocalIdeas((prev: Idea[]) => [...prev, data as Idea])
            setSelectedId(data.id)
            // Auto-open rename for new idea
            setRenamingId(data.id)
            setRenameValue('New Idea')
        } else if (error) {
            console.error('Error creating idea:', error)
        }
        
        setIsCreating(false)
    }

    function startRename(idea: Idea, e: React.MouseEvent) {
        e.stopPropagation()
        setSelectedId(idea.id)
        setRenamingId(idea.id)
        setRenameValue(idea.title ?? '')
    }

    function commitRename(id: string) {
        const trimmed = renameValue.trim()
        if (trimmed && trimmed !== localIdeas.find(i => i.id === id)?.title) {
            handleFieldChange(id, 'title', trimmed)
        }
        setRenamingId(null)
    }

    function handleRenameKeyDown(e: React.KeyboardEvent, id: string) {
        if (e.key === 'Enter') commitRename(id)
        if (e.key === 'Escape') setRenamingId(null)
    }

    async function handleReorder(result: DropResult) {
        if (!result.destination) return
        const items = reorder(localIdeas, result.source.index, result.destination.index)
        setLocalIdeas(items)
        const supabase = createClient()
        const { error } = await (supabase as any)
            .from('ideas')
            .upsert(items.map((idea, index) => ({ ...idea, order_index: index })))
        if (error) {
            console.error('Error updating idea order:', error)
            setLocalIdeas(localIdeas)
        }
    }

    if (localIdeas.length === 0) {
        return <EmptyIdeasState onCreate={handleCreateIdea} isCreating={isCreating} />
    }

    return (
        <div className="flex-1 flex overflow-hidden bg-[#fbf9f5] relative">
            {/* Left Sidebar - Ideas List */}
            <div className={cn(
                "w-full md:w-80 md:min-w-80 bg-[#f5f4ef] flex flex-col border-r border-slate-200/50 transition-all duration-300",
                selectedId && "hidden md:flex"
            )}>
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Lightbulb className="w-4 h-4 text-amber-500/60" />
                        <h2 className="text-[11px] font-sans tracking-[0.2em] uppercase text-[#546354]/60 font-medium">Idea Archive</h2>
                    </div>
                    {/* Add button */}
                    <button 
                        onClick={handleCreateIdea}
                        disabled={isCreating}
                        className="w-8 h-8 rounded-full bg-white/40 ring-1 ring-white/60 flex items-center justify-center hover:bg-white transition-all active:scale-95 disabled:opacity-50"
                        title="Add idea"
                    >
                        {isCreating ? <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" /> : <Plus className="w-4 h-4 text-amber-500/40" />}
                    </button>
                </div>

                <DragDropContext onDragEnd={handleReorder}>
                    <Droppable droppableId="ideas">
                        {(provided) => (
                            <div 
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="flex-1 overflow-y-auto px-4 pb-10 space-y-1 custom-scrollbar"
                            >
                                {localIdeas.map((idea: Idea, index: number) => (
                                    <Draggable key={idea.id} draggableId={idea.id} index={index}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                onClick={() => setSelectedId(idea.id)}
                                                className={cn(
                                                    "w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all duration-300 text-left group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#546354]/20",
                                                    selectedId === idea.id
                                                        ? "bg-white shadow-[0_10px_30px_rgba(0,0,0,0.03)] ring-1 ring-slate-100"
                                                        : "hover:bg-white/40 text-slate-500 hover:text-slate-800",
                                                    snapshot.isDragging && "shadow-2xl ring-2 ring-[#546354]/20 z-50 bg-white"
                                                )}
                                            >
                                                <div 
                                                    {...provided.dragHandleProps}
                                                    className="p-1 -ml-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-400"
                                                >
                                                    <GripVertical className="w-3.5 h-3.5" />
                                                </div>
                                                <div className={cn(
                                                    "w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center transition-all duration-500",
                                                    selectedId === idea.id ? "bg-amber-50 scale-105" : "bg-white border border-slate-100"
                                                )}>
                                                    <Sparkles className={cn("w-4 h-4 transition-colors duration-500", selectedId === idea.id ? "text-amber-500" : "text-stone-300")} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    {renamingId === idea.id ? (
                                                        <input
                                                            ref={renameInputRef}
                                                            type="text"
                                                            value={renameValue}
                                                            onChange={e => setRenameValue(e.target.value)}
                                                            onBlur={() => commitRename(idea.id)}
                                                            onKeyDown={e => handleRenameKeyDown(e, idea.id)}
                                                            onClick={e => e.stopPropagation()}
                                                            className="w-full bg-amber-50 border border-amber-200 rounded-lg px-2 py-0.5 text-sm font-medium text-slate-800 outline-none ring-1 ring-amber-300/50"
                                                        />
                                                    ) : (
                                                        <>
                                                            <p className={cn(
                                                                "text-sm font-medium tracking-tight truncate",
                                                                selectedId === idea.id ? "text-slate-800" : "text-slate-500"
                                                            )}>
                                                                {idea.title}
                                                            </p>
                                                            <p className="text-[10px] text-slate-300 uppercase tracking-widest mt-0.5 font-medium opacity-60">Thought Spark</p>
                                                        </>
                                                    )}
                                                </div>
                                                {selectedId === idea.id && renamingId !== idea.id && (
                                                    <button
                                                        onClick={e => startRename(idea, e)}
                                                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-amber-50 text-stone-300 hover:text-amber-500 transition-all duration-200 flex-shrink-0"
                                                        title="Rename idea"
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </div>

            {/* Main Content - Detail view */}
            <div className={cn(
                "flex-1 flex flex-col overflow-hidden bg-[#fbf9f5]",
                !selectedId && "hidden md:flex"
            )}>
                {selectedId && (
                    <div className="md:hidden px-6 pt-6 -mb-4">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setSelectedId(null)}
                            className="text-amber-600 gap-2 px-0 hover:bg-transparent"
                        >
                            <ChevronRight className="w-4 h-4 rotate-180" />
                            Back to Ideas
                        </Button>
                    </div>
                )}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {selectedIdea ? (
                        <div className="max-w-3xl mx-auto px-6 py-8 sm:px-12 sm:py-16 space-y-12 sm:space-y-16 animate-in fade-in duration-700 slide-in-from-bottom-4">
                            {/* Header section with Title */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="h-px w-8 bg-stone-200" />
                                    <div className="flex items-center gap-2 text-[11px] font-sans tracking-[0.25em] uppercase text-stone-400 font-bold">
                                        <Hash className="w-3.5 h-3.5" />
                                        <span>Fragment</span>
                                    </div>
                                    <div className="h-px flex-1 bg-stone-200/50" />
                                    {showDeleteConfirm ? (
                                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
                                            <span className="text-[10px] text-amber-400 font-medium tracking-tight">Move to Trash?</span>
                                            <button onClick={() => setShowDeleteConfirm(false)} className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider">Cancel</button>
                                            <button onClick={handleDeleteIdea} disabled={isSaving} className="px-3 py-1 text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-full uppercase tracking-wider transition-colors disabled:opacity-50">
                                                {isSaving ? 'Moving...' : 'Trash'}
                                            </button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setShowDeleteConfirm(true)} className="p-2 hover:bg-amber-50 text-stone-300 hover:text-amber-400 rounded-full transition-all duration-300 active:scale-90" title="Move to Trash">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                                
                                <input
                                    type="text"
                                    value={selectedIdea.title ?? ''}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange(selectedIdea.id, 'title', e.target.value)}
                                    className="w-full bg-transparent text-4xl sm:text-6xl font-serif italic text-slate-800 tracking-tight leading-tight outline-none border-none placeholder:text-slate-200"
                                    placeholder="Untitled Idea"
                                />
                            </div>

                            {/* Content - The Idea itself */}
                            <div className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-[10px] font-sans tracking-[0.3em] uppercase text-stone-300 font-bold">
                                        <PenTool className="w-4 h-4 text-stone-200" />
                                        <span>Full Concept</span>
                                    </div>
                                    <div className="w-10 h-px bg-stone-100" />
                                </div>
                                <div className="bg-white rounded-[2rem] sm:rounded-[3rem] p-8 sm:p-12 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.02)] ring-1 ring-slate-100/50">
                                    <textarea
                                        value={selectedIdea.content ?? ''}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleFieldChange(selectedIdea.id, 'content', e.target.value)}
                                        className="w-full bg-transparent text-slate-600 leading-relaxed font-serif text-lg sm:text-xl italic outline-none border-none min-h-[300px] resize-none placeholder:text-stone-200 text-justify"
                                        placeholder="Every great story starts with a spark. Details of your inspiration will appear here in the Idea Archive..."
                                    />
                                </div>
                            </div>

                            {/* Stats/Metatadata section */}
                            <div className="pt-16 flex items-center justify-between relative">
                                <div className="flex items-center gap-6">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] uppercase tracking-widest text-slate-300 font-bold">Captured</span>
                                        <span className="text-[10px] font-serif italic text-slate-400">{new Date(selectedIdea.created_at || new Date().toISOString()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                    </div>
                                    <div className="w-px h-8 bg-stone-100" />
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] uppercase tracking-widest text-slate-300 font-bold">Idea ID</span>
                                        <span className="text-[10px] font-mono text-slate-400 opacity-60 uppercase">{selectedIdea.id.slice(0, 8)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {/* Auto-save indicator */}
                                    <div className="flex items-center gap-2 group transition-all duration-500">
                                        <div className={cn(
                                            "w-1.5 h-1.5 rounded-full transition-all duration-500",
                                            isSaving ? "bg-amber-400 animate-pulse" : justSaved ? "bg-green-400" : "bg-slate-200"
                                        )} />
                                        <span className={cn(
                                            "text-[9px] uppercase tracking-[0.2em] font-bold transition-all duration-500",
                                            isSaving ? "text-amber-500" : justSaved ? "text-green-600" : "text-slate-300"
                                        )}>
                                            {isSaving ? 'Archiving…' : justSaved ? 'Captured' : 'Safe in Archive'}
                                        </span>
                                    </div>
                                    <div className="w-32 h-px bg-gradient-to-r from-stone-100 to-transparent" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-6 max-w-sm mx-auto animate-in fade-in duration-1000">
                             <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-50">
                                <Lightbulb className="w-5 h-5 text-amber-200" />
                             </div>
                             <p className="text-slate-400 font-serif italic text-lg">
                                Select an idea to reveal its creative potential.
                             </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function EmptyIdeasState({ onCreate, isCreating }: { onCreate: () => void, isCreating: boolean }) {
    return (
        <div className="min-h-full bg-[#fbf9f5] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
            <div className="max-w-2xl w-full py-20 px-10 rounded-[3rem] bg-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.04)] ring-1 ring-slate-100 flex flex-col items-center">
                <div className="w-24 h-24 bg-amber-50 rounded-[30%] flex items-center justify-center mb-8 rotate-3 shadow-inner">
                    <Lightbulb className="w-12 h-12 text-amber-200" />
                </div>

                <h2 className="text-4xl font-serif italic text-slate-800 mb-4 tracking-tight">The Idea Board</h2>
                <p className="text-[11px] font-sans tracking-[0.4em] uppercase text-stone-300 mb-10 font-bold">No Ideas Captured</p>

                <div className="space-y-8 max-w-md">
                    <p className="text-slate-500 font-medium leading-relaxed italic text-lg">
                        "Your best ideas are often the quietest. Give them a place to grow."
                    </p>
                    <div className="h-px w-16 bg-stone-100 mx-auto" />
                    <p className="text-stone-400 text-sm leading-relaxed px-6">
                        No ideas have been captured yet. Capture a thought to get started and build the foundation of your narrative.
                    </p>
                </div>

                <div className="mt-12">
                    <Button 
                        variant="outline" 
                        onClick={onCreate}
                        disabled={isCreating}
                        className="rounded-full px-10 py-7 h-auto border-amber-100 text-amber-600 hover:text-amber-800 hover:bg-amber-50 bg-white shadow-sm ring-1 ring-amber-100 uppercase tracking-[0.2em] text-[10px] font-bold transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isCreating ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-2" />}
                        Capture First Idea
                    </Button>
                </div>
            </div>
        </div>
    )
}
