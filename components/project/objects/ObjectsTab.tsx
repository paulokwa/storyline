'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Package, Plus, Search, ChevronRight, PenTool, Hash, Loader2, Trash2, Pencil, GripVertical } from 'lucide-react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { cn, reorder, getNextAvailableName } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'
import { softDeleteEntity } from '@/lib/supabase/recovery'
import AssetPicker from '@/components/project/assets/AssetPicker'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

type StoryObject = any // Flexibility for custom schema

export default function ObjectsTab({
    projectId,
    objects: initialObjects = []
}: {
    projectId: string
    objects?: any[]
}) {
    const [localObjects, setLocalObjects] = useState<any[]>(initialObjects)
    const [selectedId, setSelectedId] = useState<string | null>(initialObjects[0]?.id ?? null)

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
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
    
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const renameInputRef = useRef<HTMLInputElement>(null)
    const selectedObject = localObjects.find((o: any) => o.id === selectedId)

    useEffect(() => {
        if (!isSaving && isSaving !== undefined) {
            setJustSaved(true)
            const timer = setTimeout(() => setJustSaved(false), 2000)
            return () => clearTimeout(timer)
        }
    }, [isSaving])

    useEffect(() => {
        if (renamingId && renameInputRef.current) {
            renameInputRef.current.focus()
            renameInputRef.current.select()
        }
    }, [renamingId])

    const saveObject = useCallback(async (id: string, updates: any) => {
        setIsSaving(true)
        const supabase = createClient()
        const { data, error } = await supabase
            .from('objects' as any)
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (data) {
            setLocalObjects((prev: any[]) => prev.map(o => o.id === id ? data : o))
        } else if (error) {
            console.error('Error saving object:', error)
        }
        setIsSaving(false)
    }, [])

    const handleFieldChange = (id: string, field: string, value: string) => {
        setLocalObjects((prev: any[]) => prev.map(o => o.id === id ? { ...o, [field]: value } : o))
        if (saveTimer.current) clearTimeout(saveTimer.current)
        setIsSaving(true)
        saveTimer.current = setTimeout(() => {
            saveObject(id, { [field]: value })
        }, 1000)
    }

    async function handleDeleteObject(id: string) {
        setIsSaving(true)
        const supabase = createClient()
        try {
            await softDeleteEntity(supabase, 'objects', id)
            const index = localObjects.findIndex(o => o.id === id)
            const newObjs = localObjects.filter(o => o.id !== id)
            setLocalObjects(newObjs)
            
            if (id === selectedId) {
                if (newObjs.length > 0) {
                    const nextIndex = index < newObjs.length ? index : newObjs.length - 1
                    setSelectedId(newObjs[nextIndex].id)
                } else {
                    setSelectedId(null)
                }
            }
        } catch (error) {
            console.error('Error soft deleting object:', error)
        }
        setConfirmDeleteId(null)
        setIsSaving(false)
    }

    async function handleCreateObject() {
        setIsCreating(true)
        const supabase = createClient()
        const nextOrderIndex = Math.max(0, ...localObjects.map((o: any) => o.order_index)) + 1
        const newName = getNextAvailableName('New Object', localObjects.map(o => o.name || ''))

        const { data, error } = await supabase
            .from('objects' as any)
            .insert({
                project_id: projectId,
                name: newName,
                description: '',
                significance: '',
                order_index: nextOrderIndex
            })
            .select()
            .single()

        if (data) {
            const obj = data as any
            setLocalObjects((prev: any[]) => [...prev, obj])
            setSelectedId(obj.id)
            setRenamingId(obj.id)
            setRenameValue(newName)
        }
        setIsCreating(false)
    }

    function startRename(obj: any, e: React.MouseEvent) {
        e.stopPropagation()
        setSelectedId(obj.id)
        setRenamingId(obj.id)
        setRenameValue(obj.name ?? '')
    }

    function commitRename(id: string) {
        const trimmed = renameValue.trim()
        if (trimmed && trimmed !== localObjects.find(o => o.id === id)?.name) {
            handleFieldChange(id, 'name', trimmed)
        }
        setRenamingId(null)
    }

    async function handleReorder(result: DropResult) {
        if (!result.destination) return
        const items = reorder(localObjects, result.source.index, result.destination.index)
        setLocalObjects(items)
        const supabase = createClient()
        const { error } = await (supabase as any)
            .from('objects')
            .upsert(items.map((obj, index) => ({ ...obj, order_index: index })))
        if (error) {
            console.error('Error updating object order:', error)
            setLocalObjects(localObjects)
        }
    }

    if (localObjects.length === 0) {
        return <EmptyState onCreate={handleCreateObject} isCreating={isCreating} />
    }

    return (
        <TooltipProvider>
        <div className="flex-1 flex overflow-hidden bg-[#fbf9f5] relative">
            <div className={cn("w-full md:w-80 md:min-w-80 bg-[#f5f4ef] flex flex-col border-r border-slate-200/50 transition-all duration-300", selectedId && "hidden md:flex")}>
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Package className="w-4 h-4 text-[#546354]/60" />
                        <h2 className="text-[11px] font-sans tracking-[0.2em] uppercase text-[#546354]/60 font-medium">Items & Artefacts</h2>
                    </div>
                    <Tooltip>
                        <TooltipTrigger>
                            <button 
                                onClick={handleCreateObject}
                                disabled={isCreating}
                                className="w-8 h-8 rounded-full bg-white/40 ring-1 ring-white/60 flex items-center justify-center hover:bg-white transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isCreating ? <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" /> : <Plus className="w-4 h-4 text-blue-400/60" />}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Add object</TooltipContent>
                    </Tooltip>
                </div>

                <DragDropContext onDragEnd={handleReorder}>
                    <Droppable droppableId="objects">
                        {(provided) => (
                            <div 
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="flex-1 overflow-y-auto px-4 pb-10 space-y-1"
                            >
                                {localObjects.map((obj: any, index: number) => (
                                    <Draggable key={obj.id} draggableId={obj.id} index={index}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                onClick={() => setSelectedId(obj.id)}
                                                className={cn(
                                                    "w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all text-left cursor-pointer group",
                                                    selectedId === obj.id ? "bg-white shadow-sm ring-1 ring-slate-100" : "hover:bg-white/40 text-slate-500",
                                                    snapshot.isDragging && "shadow-2xl ring-2 ring-[#546354]/20 z-50 bg-white"
                                                )}
                                            >
                                                <div {...provided.dragHandleProps} className="p-1 -ml-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab text-slate-300">
                                                    <GripVertical className="w-3.5 h-3.5" />
                                                </div>
                                                <div className={cn("w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center", selectedId === obj.id ? "bg-[#fbf9f5]" : "bg-white border border-slate-100")}>
                                                    <Package className={cn("w-4.5 h-4.5", selectedId === obj.id ? "text-[#546354]" : "text-stone-300")} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    {renamingId === obj.id ? (
                                                        <input ref={renameInputRef} type="text" value={renameValue} onChange={e => setRenameValue(e.target.value)} onBlur={() => commitRename(obj.id)} onKeyDown={e => e.key === 'Enter' && commitRename(obj.id)} onClick={e => e.stopPropagation()} className="w-full bg-[#fbf9f5] border border-[#546354]/20 rounded-lg px-2 py-0.5 text-sm outline-none" />
                                                    ) : (
                                                        <>
                                                            <p className="text-sm font-medium truncate">{obj.name}</p>
                                                            <p className="text-[10px] text-slate-300 uppercase tracking-widest mt-0.5 font-medium opacity-60">Item</p>
                                                        </>
                                                    )}
                                                </div>
                                                  <div className="flex items-center gap-1">
                                                    {confirmDeleteId === obj.id ? (
                                                        <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-200" onClick={e => e.stopPropagation()}>
                                                            <button 
                                                                onClick={() => setConfirmDeleteId(null)} 
                                                                className="p-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider"
                                                            >
                                                                No
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteObject(obj.id)} 
                                                                disabled={isSaving}
                                                                className="px-2 py-0.5 text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg uppercase tracking-wider transition-colors disabled:opacity-50"
                                                            >
                                                                {isSaving ? '...' : 'Yes'}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className={cn(
                                                                "flex items-center gap-0.5 transition-opacity",
                                                                selectedId === obj.id ? "opacity-100" : "opacity-100 md:opacity-0 md:group-hover:opacity-100"
                                                            )}>
                                                                <Tooltip>
                                                                    <TooltipTrigger>
                                                                        <button
                                                                            onClick={e => startRename(obj, e)}
                                                                            className="p-1 rounded-lg hover:bg-blue-50 text-stone-300 hover:text-blue-500 transition-all duration-200 flex-shrink-0"
                                                                        >
                                                                            <Pencil className="w-3 h-3" />
                                                                        </button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="top">Rename</TooltipContent>
                                                                </Tooltip>
                                                                <Tooltip>
                                                                    <TooltipTrigger>
                                                                        <button
                                                                            onClick={e => {
                                                                                e.stopPropagation()
                                                                                setConfirmDeleteId(obj.id)
                                                                            }}
                                                                            className="p-1 rounded-lg hover:bg-red-50 text-stone-300 hover:text-red-500 transition-all duration-200 flex-shrink-0"
                                                                        >
                                                                            <Trash2 className="w-3 h-3" />
                                                                        </button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="top">Delete</TooltipContent>
                                                                </Tooltip>
                                                            </div>
                                                            {selectedId === obj.id && renamingId === null && confirmDeleteId === null && (
                                                                <div className="w-1.5 h-1.5 rounded-full bg-[#546354]/40 flex-shrink-0 group-hover:hidden" />
                                                            )}
                                                        </>
                                                    )}
                                                </div>
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

            <div className={cn("flex-1 flex flex-col overflow-hidden bg-[#fbf9f5] w-full max-w-full", !selectedId && "hidden md:flex")}>
                {selectedId && (
                    <div className="md:hidden sticky top-0 z-20 px-6 py-4 bg-[#fbf9f5] border-b border-stone-200/50">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="text-[#546354] gap-2 px-0 hover:bg-transparent"><ChevronRight className="w-4 h-4 rotate-180" />Back</Button>
                    </div>
                )}
                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                    {selectedObject ? (
                        <div className="max-w-3xl mx-auto px-4 py-8 sm:px-12 sm:py-16 space-y-12">
                            <div className="space-y-6">
                                <div className="hidden sm:flex items-center gap-4">
                                    <div className="h-px w-8 bg-stone-200" />
                                    <div className="flex items-center gap-2 text-[11px] font-sans tracking-[0.25em] uppercase text-stone-400 font-bold"><Hash className="w-3.5 h-3.5" /><span>Catalogue</span></div>
                                    <div className="h-px flex-1 bg-stone-200/50" />
                                </div>
                                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 sm:gap-8">
                                    <AssetPicker 
                                        projectId={projectId}
                                        entityId={selectedObject.id}
                                        entityType="object"
                                    />
                                    <input
                                        type="text"
                                        value={selectedObject.name}
                                        onChange={(e) => handleFieldChange(selectedObject.id, 'name', e.target.value)}
                                        className="w-full sm:flex-1 bg-transparent text-4xl sm:text-6xl font-serif italic text-slate-800 tracking-tight leading-tight outline-none border-none placeholder:text-slate-200 text-left min-w-0"
                                        placeholder="Object Name"
                                    />
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1 text-[10px] uppercase text-stone-300 font-bold tracking-[0.3em]">
                                        <div className="flex items-center gap-3"><Search className="w-4 h-4 text-stone-200" /><span>Narrative Significance</span></div>
                                    </div>
                                    <div className="w-10 h-px bg-stone-100" />
                                </div>
                                <div className="bg-[#fcfbf9]/60 rounded-[3rem] p-10 ring-1 ring-[#546354]/5 border border-dashed border-[#546354]/10">
                                    <textarea value={selectedObject.significance || ''} onChange={(e) => handleFieldChange(selectedObject.id, 'significance', e.target.value)} className="w-full bg-transparent text-slate-500 font-sans text-sm leading-relaxed outline-none min-h-[100px] resize-none italic placeholder:text-stone-200" placeholder="Why does this item matter? Narrative functions, stakes, or origins..." />
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1 text-[10px] uppercase text-stone-300 font-bold tracking-[0.3em]">
                                        <div className="flex items-center gap-3"><PenTool className="w-4 h-4 text-stone-200" /><span>Description & Details</span></div>
                                    </div>
                                    <div className="w-10 h-px bg-stone-100" />
                                </div>
                                <div className="bg-white rounded-[3rem] p-8 sm:p-12 shadow-sm ring-1 ring-slate-100/50">
                                    <textarea value={selectedObject.description || ''} onChange={(e) => handleFieldChange(selectedObject.id, 'description', e.target.value)} className="w-full bg-transparent text-slate-600 font-serif text-lg leading-relaxed outline-none min-h-[150px] resize-none placeholder:text-stone-200" placeholder="Physical properties, weight, textures, or hidden secrets..." />
                                </div>
                            </div>

                            <div className="pt-16 flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="flex flex-col gap-1 text-[9px] uppercase tracking-widest text-slate-300 font-bold"><span>Discovery</span><span className="text-[10px] font-serif italic text-slate-400 normal-case font-normal">{new Date(selectedObject.created_at || new Date().toISOString()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
                                    <div className="w-px h-8 bg-stone-100" />
                                    <div className="flex flex-col gap-1 text-[9px] uppercase tracking-widest text-slate-300 font-bold"><span>Catalogue Ref</span><span className="text-[10px] font-mono text-slate-400 uppercase opacity-60">{selectedObject.id.slice(0, 8)}</span></div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-1.5 h-1.5 rounded-full", isSaving ? "bg-[#546354] animate-pulse" : "bg-green-400")} />
                                    <span className="text-[9px] uppercase font-bold tracking-widest text-slate-300">{isSaving ? 'Registering...' : 'Inventory Safe'}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                         <div className="hidden sm:flex flex-col items-center justify-center h-full text-center space-y-6 max-w-sm mx-auto animate-in fade-in duration-1000">
                             <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-50">
                                <Package className="w-5 h-5 text-stone-200" />
                             </div>
                             <p className="text-slate-400 font-serif italic text-lg">
                                Select an item from the catalogue.
                             </p>
                         </div>
                    )}
                </div>
            </div>
        </div>
        </TooltipProvider>
    )
}

function EmptyState({ onCreate, isCreating }: { onCreate: () => void, isCreating: boolean }) {
    return (
        <div className="min-h-full bg-[#fbf9f5] flex flex-col items-center sm:justify-center py-12 p-6 text-center animate-in fade-in duration-700 overflow-y-auto">
            <div className="max-w-2xl w-full py-12 sm:py-20 px-6 sm:px-10 rounded-[3rem] bg-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.04)] ring-1 ring-slate-100 flex flex-col items-center">
                <div className="w-24 h-24 bg-stone-50 rounded-[30%] flex items-center justify-center mb-8 rotate-3 shadow-inner"><Package className="w-12 h-12 text-stone-200" /></div>
                <h2 className="text-4xl font-serif italic text-slate-800 mb-4 tracking-tight">The Armoury is Silent</h2>
                <p className="text-[11px] font-sans tracking-[0.4em] uppercase text-stone-300 mb-10 font-bold">Project Artefact Catalogue Empty</p>
                <p className="text-slate-500 font-medium leading-relaxed italic text-lg mb-12 max-w-md">"Treasures, weapons, and secrets are yet to be unearthed in this story world."</p>
                <Button variant="outline" onClick={onCreate} disabled={isCreating} className="rounded-full px-10 py-7 h-auto border-stone-100 text-stone-500 hover:bg-stone-50 uppercase tracking-widest text-[10px] font-bold">
                    {isCreating ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-2" />}
                    Catalogue First Item
                </Button>
            </div>
        </div>
    )
}
