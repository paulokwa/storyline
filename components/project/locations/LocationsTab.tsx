'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { MapPin, Plus, Search, ChevronRight, PenTool, Hash, Loader2, Trash2, Pencil, GripVertical } from 'lucide-react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { cn, reorder } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'
import { softDeleteEntity } from '@/lib/supabase/recovery'
import AssetPicker from '@/components/project/assets/AssetPicker'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

type Location = any // Flexibility for custom schema

export default function LocationsTab({
    projectId,
    locations: initialLocations = []
}: {
    projectId: string
    locations?: any[]
}) {
    const [localLocations, setLocalLocations] = useState<any[]>(initialLocations)
    const [selectedId, setSelectedId] = useState<string | null>(initialLocations[0]?.id ?? null)

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
    const selectedLocation = localLocations.find((l: any) => l.id === selectedId)

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

    const saveLocation = useCallback(async (id: string, updates: any) => {
        setIsSaving(true)
        const supabase = createClient()
        const { data, error } = await supabase
            .from('locations' as any)
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (data) {
            setLocalLocations((prev: any[]) => prev.map(l => l.id === id ? data : l))
        } else if (error) {
            console.error('Error saving location:', error)
        }
        setIsSaving(false)
    }, [])

    const handleFieldChange = (id: string, field: string, value: string) => {
        setLocalLocations((prev: any[]) => prev.map(l => l.id === id ? { ...l, [field]: value } : l))
        if (saveTimer.current) clearTimeout(saveTimer.current)
        setIsSaving(true)
        saveTimer.current = setTimeout(() => {
            saveLocation(id, { [field]: value })
        }, 1000)
    }

    async function handleDeleteLocation() {
        if (!selectedId) return
        setIsSaving(true)
        const supabase = createClient()
        try {
            await softDeleteEntity(supabase, 'locations', selectedId)
            const index = localLocations.findIndex(l => l.id === selectedId)
            const newLocs = localLocations.filter(l => l.id !== selectedId)
            setLocalLocations(newLocs)
            if (newLocs.length > 0) {
                const nextIndex = index < newLocs.length ? index : newLocs.length - 1
                setSelectedId(newLocs[nextIndex].id)
            } else {
                setSelectedId(null)
            }
        } catch (error) {
            console.error('Error soft deleting location:', error)
        }
        setShowDeleteConfirm(false)
        setIsSaving(false)
    }

    async function handleCreateLocation() {
        setIsCreating(true)
        const supabase = createClient()
        const nextOrderIndex = Math.max(0, ...localLocations.map((l: any) => l.order_index)) + 1
        const { data, error } = await supabase
            .from('locations' as any)
            .insert({
                project_id: projectId,
                name: 'New Location',
                description: '',
                atmosphere: '',
                order_index: nextOrderIndex
            })
            .select()
            .single()

        if (data) {
            const loc = data as any
            setLocalLocations((prev: any[]) => [...prev, loc])
            setSelectedId(loc.id)
            setRenamingId(loc.id)
            setRenameValue('New Location')
        }
        setIsCreating(false)
    }

    function startRename(loc: any, e: React.MouseEvent) {
        e.stopPropagation()
        setSelectedId(loc.id)
        setRenamingId(loc.id)
        setRenameValue(loc.name ?? '')
    }

    function commitRename(id: string) {
        const trimmed = renameValue.trim()
        if (trimmed && trimmed !== localLocations.find(l => l.id === id)?.name) {
            handleFieldChange(id, 'name', trimmed)
        }
        setRenamingId(null)
    }

    async function handleReorder(result: DropResult) {
        if (!result.destination) return
        const items = reorder(localLocations, result.source.index, result.destination.index)
        setLocalLocations(items)
        const supabase = createClient()
        const { error } = await (supabase as any)
            .from('locations')
            .upsert(items.map((loc, index) => ({ ...loc, order_index: index })))
        if (error) {
            console.error('Error updating location order:', error)
            setLocalLocations(localLocations)
        }
    }

    if (localLocations.length === 0) {
        return <EmptyState onCreate={handleCreateLocation} isCreating={isCreating} />
    }

    return (
        <TooltipProvider>
        <div className="flex-1 flex overflow-hidden bg-[#fbf9f5] relative">
            <div className={cn("w-full md:w-80 md:min-w-80 bg-[#f5f4ef] flex flex-col border-r border-slate-200/50 transition-all duration-300", selectedId && "hidden md:flex")}>
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-[#546354]/60" />
                        <h2 className="text-[11px] font-sans tracking-[0.2em] uppercase text-[#546354]/60 font-medium">World Locations</h2>
                    </div>
                    <Tooltip>
                        <TooltipTrigger>
                            <button 
                                onClick={handleCreateLocation}
                                disabled={isCreating}
                                className="w-8 h-8 rounded-full bg-white/40 ring-1 ring-white/60 flex items-center justify-center hover:bg-white transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isCreating ? <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" /> : <Plus className="w-4 h-4 text-emerald-400/60" />}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Add location</TooltipContent>
                    </Tooltip>
                </div>

                <DragDropContext onDragEnd={handleReorder}>
                    <Droppable droppableId="locations">
                        {(provided) => (
                            <div 
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="flex-1 overflow-y-auto px-4 pb-10 space-y-1"
                            >
                                {localLocations.map((loc: any, index: number) => (
                                    <Draggable key={loc.id} draggableId={loc.id} index={index}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                onClick={() => setSelectedId(loc.id)}
                                                className={cn(
                                                    "w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all duration-300 text-left cursor-pointer group",
                                                    selectedId === loc.id ? "bg-white shadow-sm ring-1 ring-slate-100" : "hover:bg-white/40 text-slate-500 hover:text-slate-800",
                                                    snapshot.isDragging && "shadow-2xl ring-2 ring-[#546354]/20 z-50 bg-white"
                                                )}
                                            >
                                                <div {...provided.dragHandleProps} className="p-1 -ml-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab text-slate-300">
                                                    <GripVertical className="w-3.5 h-3.5" />
                                                </div>
                                                <div className={cn("w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center", selectedId === loc.id ? "bg-[#fbf9f5]" : "bg-white border border-slate-100")}>
                                                    <MapPin className={cn("w-4.5 h-4.5", selectedId === loc.id ? "text-[#546354]" : "text-stone-300")} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    {renamingId === loc.id ? (
                                                        <input ref={renameInputRef} type="text" value={renameValue} onChange={e => setRenameValue(e.target.value)} onBlur={() => commitRename(loc.id)} onKeyDown={e => e.key === 'Enter' && commitRename(loc.id)} onClick={e => e.stopPropagation()} className="w-full bg-[#fbf9f5] border border-[#546354]/20 rounded-lg px-2 py-0.5 text-sm outline-none" />
                                                    ) : (
                                                        <>
                                                            <p className={cn("text-sm font-medium truncate", selectedId === loc.id ? "text-slate-800" : "text-slate-500")}>{loc.name}</p>
                                                            <p className="text-[10px] text-slate-300 uppercase tracking-widest mt-0.5 font-medium opacity-60">Setting</p>
                                                        </>
                                                    )}
                                                </div>
                                                {selectedId === loc.id && renamingId !== loc.id && (
                                                    <Tooltip>
                                                        <TooltipTrigger>
                                                            <button
                                                                onClick={e => startRename(loc, e)}
                                                                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-emerald-50 text-stone-300 hover:text-emerald-500 transition-all duration-200 flex-shrink-0"
                                                            >
                                                                <Pencil className="w-3 h-3" />
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">Rename location</TooltipContent>
                                                    </Tooltip>
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

            <div className={cn("flex-1 flex flex-col overflow-hidden bg-[#fbf9f5]", !selectedId && "hidden md:flex")}>
                {selectedId && (
                    <div className="md:hidden px-6 pt-6 -mb-4">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="text-[#546354] gap-2 px-0"><ChevronRight className="w-4 h-4 rotate-180" />Back</Button>
                    </div>
                )}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {selectedLocation ? (
                        <div className="max-w-3xl mx-auto px-6 py-8 sm:px-12 sm:py-16 space-y-12">
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="h-px w-8 bg-stone-200" />
                                    <div className="flex items-center gap-2 text-[11px] font-sans tracking-[0.25em] uppercase text-stone-400 font-bold"><Hash className="w-3.5 h-3.5" /><span>Location Atlas</span></div>
                                    <div className="h-px flex-1 bg-stone-200/50" />
                                    {showDeleteConfirm ? (
                                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
                                            <span className="text-[10px] text-amber-400 font-medium tracking-tight">Move to Trash?</span>
                                            <button onClick={() => setShowDeleteConfirm(false)} className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider">Cancel</button>
                                            <button onClick={handleDeleteLocation} disabled={isSaving} className="px-3 py-1 text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-full uppercase tracking-wider transition-colors disabled:opacity-50">
                                                {isSaving ? 'Moving...' : 'Trash'}
                                            </button>
                                        </div>
                                    ) : (
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <button onClick={() => setShowDeleteConfirm(true)} className="p-2 hover:bg-emerald-50 text-stone-300 hover:text-emerald-500 rounded-full transition-all duration-300 active:scale-90">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top">Move to Trash</TooltipContent>
                                        </Tooltip>
                                    )}
                                </div>
                                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-8">
                                    <AssetPicker 
                                        projectId={projectId}
                                        entityId={selectedLocation.id}
                                        entityType="location"
                                    />
                                    <input type="text" value={selectedLocation.name} onChange={(e) => handleFieldChange(selectedLocation.id, 'name', e.target.value)} className="flex-1 bg-transparent text-4xl sm:text-6xl font-serif italic text-slate-800 outline-none placeholder:text-slate-200" placeholder="Location Name" />
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1 text-[10px] uppercase text-stone-300 font-bold tracking-[0.3em]">
                                        <div className="flex items-center gap-3"><Search className="w-4 h-4" /><span>Atmosphere & Sensory</span></div>
                                    </div>
                                    <div className="w-10 h-px bg-stone-100" />
                                </div>
                                <div className="bg-[#fcfbf9]/60 rounded-[3rem] p-10 ring-1 ring-[#546354]/5 border border-dashed border-[#546354]/10">
                                    <textarea value={selectedLocation.atmosphere || ''} onChange={(e) => handleFieldChange(selectedLocation.id, 'atmosphere', e.target.value)} className="w-full bg-transparent text-slate-500 font-sans text-sm leading-relaxed outline-none min-h-[100px] resize-none italic placeholder:text-stone-200" placeholder="Describe the vibe, lighting, sounds, and overall mood..." />
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1 text-[10px] uppercase text-stone-300 font-bold tracking-[0.3em]">
                                        <div className="flex items-center gap-3"><PenTool className="w-4 h-4" /><span>Physical Description</span></div>
                                    </div>
                                    <div className="w-10 h-px bg-stone-100" />
                                </div>
                                <div className="bg-white rounded-[3rem] p-8 sm:p-12 shadow-sm ring-1 ring-slate-100/50">
                                    <textarea value={selectedLocation.description || ''} onChange={(e) => handleFieldChange(selectedLocation.id, 'description', e.target.value)} className="w-full bg-transparent text-slate-600 font-serif text-lg leading-relaxed outline-none min-h-[200px] resize-none placeholder:text-stone-200" placeholder="Layout, architectural details, key landmarks..." />
                                </div>
                            </div>

                            <div className="pt-16 flex items-center justify-between border-t border-stone-50">
                                <div className="flex items-center gap-6">
                                    <div className="flex flex-col gap-1 text-slate-300 font-bold uppercase text-[9px] tracking-widest"><span>Discovery</span><span className="text-[10px] font-serif italic text-slate-400 normal-case font-normal">{new Date(selectedLocation.created_at || new Date().toISOString()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
                                    <div className="w-px h-8 bg-stone-100" />
                                    <div className="flex flex-col gap-1 text-slate-300 font-bold uppercase text-[9px] tracking-widest"><span>Ref Reference</span><span className="text-[10px] font-mono text-slate-400 opacity-60 uppercase">{selectedLocation.id.slice(0, 8)}</span></div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-1.5 h-1.5 rounded-full", isSaving ? "bg-[#546354] animate-pulse" : "bg-green-400")} />
                                    <span className="text-[9px] uppercase tracking-widest font-bold text-slate-300">{isSaving ? 'Registering...' : 'Atlas Updated'}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full italic text-slate-300">Select a region from your atlas.</div>
                    )}
                </div>
            </div>
        </div>
        </TooltipProvider>
    )
}

function EmptyState({ onCreate, isCreating }: { onCreate: () => void, isCreating: boolean }) {
    return (
        <div className="min-h-full bg-[#fbf9f5] flex flex-col items-center justify-center text-center p-6 animate-in fade-in">
            <div className="max-w-2xl w-full py-20 px-10 rounded-[3rem] bg-white shadow-sm ring-1 ring-slate-100 flex flex-col items-center">
                <div className="w-24 h-24 bg-stone-50 rounded-[30%] flex items-center justify-center mb-8 rotate-3 shadow-inner"><MapPin className="w-12 h-12 text-stone-200" /></div>
                <h2 className="text-4xl font-serif italic text-slate-800 mb-4 tracking-tight">An Unmapped World</h2>
                <p className="text-[11px] font-sans tracking-[0.4em] uppercase text-stone-300 mb-10 font-bold">World Locations Atlas Empty</p>
                <p className="text-slate-500 font-medium leading-relaxed italic text-lg mb-12 max-w-md">"The world is but a canvas to our imagination. Currently, your canvas is blank."</p>
                <Button variant="outline" onClick={onCreate} disabled={isCreating} className="rounded-full px-10 py-7 h-auto border-stone-100 text-stone-500 hover:bg-stone-50 uppercase tracking-widest text-[10px] font-bold">
                    {isCreating ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-2" />}
                    Chart First Location
                </Button>
            </div>
        </div>
    )
}
