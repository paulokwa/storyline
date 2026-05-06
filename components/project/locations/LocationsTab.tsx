'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { MapPin, Plus, Search, ChevronRight, PenTool, Hash, Loader2, Trash2, Pencil, GripVertical } from 'lucide-react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { cn, reorder, getNextAvailableName, formatStableDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { StableInput } from '@/components/ui/stable-input'
import { PremiumEditor } from '@/components/ui/premium-editor'
import AssetPicker from '@/components/project/assets/AssetPicker'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useProjectActions } from '@/components/project/ProjectContext'
import { ItemRowActionButton } from '@/components/project/ItemRowActionButton'
import {
    createWritingEntity,
    reorderWritingEntities,
    softDeleteWritingEntity,
    updateWritingEntity,
} from '@/lib/persistence/writing-entities'

type Location = any // Flexibility for custom schema

export default function LocationsTab({
    projectId,
    locations: initialLocations = [],
    isLocalProject = false
}: {
    projectId: string
    locations?: any[]
    isLocalProject?: boolean
}) {
    const { role } = useProjectActions()
    const isReadOnly = role === 'viewer'
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
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
    
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
        try {
            const data = await updateWritingEntity('locations', id, updates)
            setLocalLocations((prev: any[]) => prev.map(l => l.id === id ? data : l))
        } catch (error) {
            console.error('Error saving location:', error)
        } finally {
            setIsSaving(false)
        }
    }, [])

    const handleFieldChange = (id: string, field: string, value: string) => {
        if (isReadOnly) return
        // For single-line StableInput fields (name, etc.) we update local state
        // immediately so the sidebar list reflects the new name in real time.
        setLocalLocations((prev: any[]) => prev.map(l => l.id === id ? { ...l, [field]: value } : l))
        if (saveTimer.current) clearTimeout(saveTimer.current)
        setIsSaving(true)
        saveTimer.current = setTimeout(() => {
            saveLocation(id, { [field]: value })
        }, 1000)
    }

    // For PremiumEditor (multiline) fields: do NOT update local state on every
    // keystroke. The editor is self-contained and manages its own content.
    // Updating local state here would cause a parent re-render → new `value`
    // prop → editor.commands.setContent() → interrupts Android IME composition
    // → text flickers/disappears. We only debounce-save to the DB.
    const handleTextEditorChange = (id: string, field: string, value: string) => {
        if (isReadOnly) return
        if (saveTimer.current) clearTimeout(saveTimer.current)
        setIsSaving(true)
        saveTimer.current = setTimeout(() => {
            saveLocation(id, { [field]: value })
        }, 1500)
    }

    async function handleDeleteLocation(id: string) {
        if (isReadOnly) return
        setIsSaving(true)
        try {
            await softDeleteWritingEntity('locations', id)
            const index = localLocations.findIndex(l => l.id === id)
            const newLocs = localLocations.filter(l => l.id !== id)
            setLocalLocations(newLocs)
            
            if (id === selectedId) {
                if (newLocs.length > 0) {
                    const nextIndex = index < newLocs.length ? index : newLocs.length - 1
                    setSelectedId(newLocs[nextIndex].id)
                } else {
                    setSelectedId(null)
                }
            }
        } catch (error) {
            console.error('Error soft deleting location:', error)
        }
        setConfirmDeleteId(null)
        setIsSaving(false)
    }

    async function handleCreateLocation() {
        if (isReadOnly) return
        setIsCreating(true)
        const nextOrderIndex = Math.max(0, ...localLocations.map((l: any) => l.order_index)) + 1
        const newName = getNextAvailableName('New Location', localLocations.map(l => l.name || ''))
        try {
            const data = await createWritingEntity('locations', {
                project_id: projectId,
                name: newName,
                description: '',
                atmosphere: '',
                order_index: nextOrderIndex,
            })
            const loc = data as any
            setLocalLocations((prev: any[]) => [...prev, loc])
            setSelectedId(loc.id)
            // Auto-open rename for new location on desktop only
            if (window.innerWidth >= 768) {
                setRenamingId(loc.id)
                setRenameValue(newName)
            }
        } catch (error) {
            console.error('Error creating location:', error)
        } finally {
            setIsCreating(false)
        }
    }

    function startRename(loc: any, e: React.MouseEvent) {
        e.stopPropagation()
        setSelectedId(loc.id)
        // Only open inline rename on desktop
        if (window.innerWidth >= 768) {
            setRenamingId(loc.id)
            setRenameValue(loc.name ?? '')
        }
    }

    function commitRename(id: string) {
        const trimmed = renameValue.trim()
        if (isReadOnly) {
            setRenamingId(null)
            return
        }
        if (trimmed && trimmed !== localLocations.find(l => l.id === id)?.name) {
            handleFieldChange(id, 'name', trimmed)
        }
        setRenamingId(null)
    }

    async function handleReorder(result: DropResult) {
        if (isReadOnly) return
        if (!result.destination) return
        const items = reorder(localLocations, result.source.index, result.destination.index)
        setLocalLocations(items)
        try {
            await reorderWritingEntities('locations', items.map((loc, index) => ({ ...loc, order_index: index })))
        } catch (error) {
            console.error('Error updating location order:', error)
            setLocalLocations(localLocations)
        }
    }

    if (localLocations.length === 0) {
        return <EmptyState onCreate={handleCreateLocation} isCreating={isCreating} isReadOnly={isReadOnly} />
    }

    return (
        <TooltipProvider>
        <div className="locations-tab locations-tab-shell flex-1 flex overflow-hidden bg-[#fbf9f5] relative">
            <div className={cn("locations-tab-sidebar w-full md:w-80 md:min-w-80 bg-[#f5f4ef] flex flex-col border-r border-slate-200/50 transition-all duration-300", selectedId && "hidden md:flex")}>
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-[#546354]/60" />
                        <h2 className="text-[11px] font-sans tracking-[0.2em] uppercase text-[#546354]/60 font-medium">World Locations</h2>
                    </div>
                    {!isReadOnly && <Tooltip>
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
                    </Tooltip>}
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
                                    <Draggable key={loc.id} draggableId={loc.id} index={index} isDragDisabled={isReadOnly}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => setSelectedId(loc.id)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault()
                                                        setSelectedId(loc.id)
                                                    }
                                                }}
                                                className={cn(
                                                    "w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all duration-300 text-left cursor-pointer group outline-none focus-visible:ring-2 focus-visible:ring-[#546354]/20",
                                                    selectedId === loc.id ? "bg-white shadow-sm ring-1 ring-slate-100" : "hover:bg-white/40 text-slate-500 hover:text-slate-800",
                                                    snapshot.isDragging && "shadow-2xl ring-2 ring-[#546354]/20 z-50 bg-white"
                                                )}
                                            >
                                                {!isReadOnly && (
                                                    <div {...provided.dragHandleProps} className="p-1 -ml-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab text-slate-300">
                                                        <GripVertical className="w-3.5 h-3.5" />
                                                    </div>
                                                )}
                                                <div className={cn("w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center", selectedId === loc.id ? "bg-[#fbf9f5]" : "bg-white border border-slate-100")}>
                                                    <MapPin className={cn("w-4.5 h-4.5", selectedId === loc.id ? "text-[#546354]" : "text-stone-300")} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    {renamingId === loc.id ? (
                                                        <input ref={renameInputRef} type="text" value={renameValue} onChange={e => setRenameValue(e.target.value)} onBlur={() => commitRename(loc.id)} onKeyDown={e => { if (e.key === 'Enter') commitRename(loc.id); if (e.key === 'Escape') setRenamingId(null) }} onClick={e => e.stopPropagation()} className="w-full bg-[#fbf9f5] border border-[#546354]/20 rounded-lg px-2 py-0.5 text-sm font-medium text-slate-800 outline-none ring-1 ring-[#546354]/10" />
                                                    ) : (
                                                        <>
                                                            <p className={cn("text-sm font-medium truncate", selectedId === loc.id ? "text-slate-800" : "text-slate-500")}>{loc.name}</p>
                                                            <p className="text-[10px] text-slate-300 uppercase tracking-widest mt-0.5 font-medium opacity-60">Setting</p>
                                                        </>
                                                    )}
                                                </div>
                                                 <div className="flex items-center gap-1">
                                                    {confirmDeleteId === loc.id ? (
                                                        <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-200" onClick={e => e.stopPropagation()}>
                                                            <button
                                                                onClick={() => setConfirmDeleteId(null)}
                                                                aria-label="Cancel deletion"
                                                                className="p-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider"
                                                            >
                                                                No
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteLocation(loc.id)}
                                                                disabled={isSaving}
                                                                aria-label="Confirm delete location"
                                                                className="px-2 py-0.5 text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg uppercase tracking-wider transition-colors disabled:opacity-50"
                                                            >
                                                                {isSaving ? '...' : 'Yes'}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {!isReadOnly && <div className={cn(
                                                                "flex items-center gap-1 rounded-2xl border border-stone-200/70 bg-white/90 p-1 shadow-sm backdrop-blur-sm transition-opacity",
                                                                selectedId === loc.id ? "opacity-100" : "opacity-100 md:opacity-0 md:group-hover:opacity-100"
                                                            )}>
                                                                <ItemRowActionButton
                                                                    label="Rename"
                                                                    icon={Pencil}
                                                                    onClick={e => startRename(loc, e)}
                                                                    className="hover:border-blue-200 hover:bg-blue-50 hover:text-blue-500"
                                                                />
                                                                <ItemRowActionButton
                                                                    label="Delete"
                                                                    icon={Trash2}
                                                                    onClick={e => {
                                                                        e.stopPropagation()
                                                                        setConfirmDeleteId(loc.id)
                                                                    }}
                                                                    className="hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                                                                />
                                                            </div>}
                                                            {selectedId === loc.id && renamingId === null && confirmDeleteId === null && (
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

            <div className={cn("locations-tab-detail flex-1 flex flex-col overflow-hidden bg-[#fbf9f5] w-full max-w-full", !selectedId && "hidden md:flex")}>
                {selectedId && (
                    <div className="locations-tab-mobilebar md:hidden sticky top-0 z-20 px-6 py-4 bg-[#fbf9f5] border-b border-stone-200/50">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="text-[#546354] gap-2 px-0 hover:bg-transparent"><ChevronRight className="w-4 h-4 rotate-180" />Back to locations list</Button>
                    </div>
                )}
                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                    {selectedLocation ? (
                        <div className="max-w-3xl mx-auto px-4 py-8 sm:px-12 sm:py-16 space-y-12">
                            <div className="space-y-6">
                                <div className="hidden sm:flex items-center gap-4">
                                    <div className="h-px w-8 bg-stone-200" />
                                    <div className="flex items-center gap-2 text-[11px] font-sans tracking-[0.25em] uppercase text-stone-400 font-bold">
                                        <Hash className="w-3.5 h-3.5" />
                                        <span>Atlas</span>
                                    </div>
                                    <div className="h-px flex-1 bg-stone-200/50" />
                                </div>
                                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 sm:gap-8">
                                    <AssetPicker 
                                        projectId={projectId}
                                        entityId={selectedLocation.id}
                                        entityType="location"
                                        disabled={isReadOnly}
                                    />
                                    <StableInput
                                        type="text"
                                        value={selectedLocation.name}
                                        onValueChange={(val) => handleFieldChange(selectedLocation.id, 'name', val)}
                                        disabled={isReadOnly}
                                        readOnly={isReadOnly}
                                        className="w-full sm:flex-1 bg-transparent text-4xl sm:text-6xl font-serif italic text-slate-800 tracking-tight leading-tight outline-none border-none placeholder:text-slate-200 text-left min-w-0"
                                        placeholder="Location Name"
                                    />
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1 text-[10px] uppercase text-stone-300 font-bold tracking-[0.3em]">
                                        <div className="flex items-center gap-3"><Search className="w-4 h-4" /><span>Atmosphere & Sensory</span></div>
                                    </div>
                                    <div className="w-10 h-px bg-stone-100" />
                                </div>
                                <div className="locations-tab-secondary-panel rounded-[3rem] p-10 ring-1 ring-[#546354]/5 border border-dashed border-[#546354]/10 bg-[#fcfbf9]/60">
                                    <PremiumEditor 
                                        value={selectedLocation.atmosphere || ''} 
                                        onValueChange={(val) => handleTextEditorChange(selectedLocation.id, 'atmosphere', val)} 
                                        editable={!isReadOnly}
                                        className="w-full bg-transparent text-slate-600 leading-relaxed font-serif text-lg sm:text-xl italic placeholder:text-stone-200" 
                                        editorClassName="italic"
                                        placeholder="Describe the vibe, lighting, sounds, and overall mood..." 
                                        minHeight="100px"
                                    />
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1 text-[10px] uppercase text-stone-300 font-bold tracking-[0.3em]">
                                        <div className="flex items-center gap-3"><PenTool className="w-4 h-4" /><span>Physical Description</span></div>
                                    </div>
                                    <div className="w-10 h-px bg-stone-100" />
                                </div>
                                <div className="locations-tab-primary-panel bg-white rounded-[3rem] p-8 sm:p-12 shadow-sm ring-1 ring-slate-100/50">
                                    <PremiumEditor 
                                        value={selectedLocation.description || ''} 
                                        onValueChange={(val) => handleTextEditorChange(selectedLocation.id, 'description', val)} 
                                        editable={!isReadOnly}
                                        className="w-full bg-transparent text-slate-600 leading-relaxed font-serif text-lg sm:text-xl italic placeholder:text-stone-200" 
                                        placeholder="Layout, architectural details, key landmarks..." 
                                        minHeight="200px"
                                    />
                                </div>
                            </div>

                            <div className="pt-16 flex items-center justify-between border-t border-stone-50">
                                <div className="flex items-center gap-6">
                                    <div className="flex flex-col gap-1 text-slate-300 font-bold uppercase text-[9px] tracking-widest"><span>Discovery</span><span className="text-[10px] font-serif italic text-slate-400 normal-case font-normal">{formatStableDate(selectedLocation.created_at)}</span></div>
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
                         <div className="hidden sm:flex flex-col items-center justify-center h-full text-center space-y-6 max-w-sm mx-auto animate-in fade-in duration-1000">
                             <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-50">
                                <MapPin className="w-5 h-5 text-stone-200" />
                             </div>
                             <p className="text-slate-400 font-serif italic text-lg">
                                Select a region from your atlas.
                             </p>
                         </div>
                    )}
                </div>
            </div>
        </div>
        </TooltipProvider>
    )
}

function EmptyState({ onCreate, isCreating, isReadOnly = false }: { onCreate: () => void, isCreating: boolean, isReadOnly?: boolean }) {
    return (
        <div className="locations-tab-empty locations-tab-shell flex-1 w-full min-h-full bg-[#fbf9f5] flex flex-col items-center sm:justify-center py-12 p-6 text-center animate-in fade-in duration-700 overflow-y-auto">
            <div className="max-w-2xl w-full py-12 sm:py-20 px-6 sm:px-10 rounded-[3rem] bg-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.04)] ring-1 ring-slate-100 flex flex-col items-center">
                <div className="w-24 h-24 bg-stone-50 rounded-[30%] flex items-center justify-center mb-8 rotate-3 shadow-inner"><MapPin className="w-12 h-12 text-stone-200" /></div>
                <h2 className="text-4xl font-serif italic text-slate-800 mb-4 tracking-tight">An Unmapped World</h2>
                <p className="text-[11px] font-sans tracking-[0.4em] uppercase text-stone-300 mb-10 font-bold">World Locations Atlas Empty</p>
                <p className="text-slate-500 font-medium leading-relaxed italic text-lg mb-12 max-w-md">
                    {isReadOnly ? 'Viewers can explore locations once they are added by an owner or editor.' : 'Add a location to start building your world.'}
                </p>
                {!isReadOnly && (
                    <Button variant="outline" onClick={onCreate} disabled={isCreating} className="rounded-full px-10 py-7 h-auto border-stone-100 text-stone-500 hover:bg-stone-50 uppercase tracking-widest text-[10px] font-bold">
                        {isCreating ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-2" />}
                        Chart First Location
                    </Button>
                )}
            </div>
        </div>
    )
}
