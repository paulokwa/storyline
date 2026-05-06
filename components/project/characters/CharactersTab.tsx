'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { User, Users, Plus, Search, ChevronRight, PenTool, Hash, Loader2, Trash2, Pencil, GripVertical } from 'lucide-react'
import { getProjectTypeLabel } from '@/lib/constants'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { cn, reorder, getNextAvailableName, formatStableDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { StableInput } from '@/components/ui/stable-input'
import { PremiumEditor } from '@/components/ui/premium-editor'
import type { Database } from '@/lib/supabase/types'
import RelationshipManager from './RelationshipManager'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import AssetPicker from '@/components/project/assets/AssetPicker'
import { useProjectActions } from '@/components/project/ProjectContext'
import { ItemRowActionButton } from '@/components/project/ItemRowActionButton'
import {
    createWritingEntity,
    reorderWritingEntities,
    softDeleteWritingEntity,
    updateWritingEntity,
} from '@/lib/persistence/writing-entities'

type Character = Database['public']['Tables']['characters']['Row']

export default function CharactersTab({
    projectId,
    projectType = 'novel',
    characters: initialCharacters = [],
    availableEntities = [],
    isLocalProject = false,
}: {
    projectId: string
    projectType?: string
    characters?: Character[]
    availableEntities?: { id: string; name: string; type: 'character' | 'location' | 'object' }[]
    isLocalProject?: boolean
}) {
    const { role } = useProjectActions()
    const isReadOnly = role === 'viewer'
    const [localCharacters, setLocalCharacters] = useState<Character[]>(initialCharacters)
    const [selectedId, setSelectedId] = useState<string | null>(initialCharacters[0]?.id ?? null)

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
    const selectedCharacter = localCharacters.find((c: Character) => c.id === selectedId)

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

    const saveCharacter = useCallback(async (id: string, updates: Database['public']['Tables']['characters']['Update']) => {
        setIsSaving(true)
        try {
            const data = await updateWritingEntity('characters', id, updates)
            setLocalCharacters((prev: Character[]) => prev.map(c => c.id === id ? data as Character : c))
        } catch (error) {
            console.error('Error saving character:', error)
        } finally {
            setIsSaving(false)
        }
    }, [])

    const handleFieldChange = (id: string, field: keyof Character, value: string) => {
        if (isReadOnly) return
        // Update local state immediately for responsiveness (name shown in sidebar)
        setLocalCharacters((prev: Character[]) => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
        
        // Debounce the save
        if (saveTimer.current) clearTimeout(saveTimer.current)
        setIsSaving(true)
        saveTimer.current = setTimeout(() => {
            saveCharacter(id, { [field]: value } as Database['public']['Tables']['characters']['Update'])
        }, 1000)
    }

    // For PremiumEditor (multiline) fields: skip local state update to prevent
    // parent re-renders that interrupt Android IME composition mid-keystroke.
    const handleTextEditorChange = (id: string, field: keyof Character, value: string) => {
        if (isReadOnly) return
        if (saveTimer.current) clearTimeout(saveTimer.current)
        setIsSaving(true)
        saveTimer.current = setTimeout(() => {
            saveCharacter(id, { [field]: value } as Database['public']['Tables']['characters']['Update'])
        }, 1500)
    }

    async function handleDeleteCharacter(id: string) {
        if (isReadOnly) return
        setIsSaving(true)
        try {
            await softDeleteWritingEntity('characters', id)
            const index = localCharacters.findIndex(c => c.id === id)
            const newChars = localCharacters.filter(c => c.id !== id)
            setLocalCharacters(newChars)
            
            if (id === selectedId) {
                if (newChars.length > 0) {
                    const nextIndex = index < newChars.length ? index : newChars.length - 1
                    setSelectedId(newChars[nextIndex].id)
                } else {
                    setSelectedId(null)
                }
            }
        } catch (error) {
            console.error('Error soft deleting character:', error)
        }
        setConfirmDeleteId(null)
        setIsSaving(false)
    }

    async function handleCreateCharacter() {
        if (isReadOnly) return
        setIsCreating(true)
        const nextOrderIndex = Math.max(0, ...localCharacters.map((c: Character) => c.order_index)) + 1
        const newName = getNextAvailableName('New Character', localCharacters.map(c => c.name || ''))
        try {
            const data = await createWritingEntity('characters', {
                project_id: projectId,
                name: newName,
                description: '',
                notes: '',
                order_index: nextOrderIndex,
            })
            setLocalCharacters((prev: Character[]) => [...prev, data as Character])
            setSelectedId(data.id)
            // Auto-open rename for new character on desktop only
            if (window.innerWidth >= 768) {
                setRenamingId(data.id)
                setRenameValue(newName)
            }
        } catch (error: any) {
            console.error('Error creating character:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code,
            })
        } finally {
            setIsCreating(false)
        }
    }

    function startRename(char: Character, e: React.MouseEvent) {
        e.stopPropagation()
        setSelectedId(char.id)
        // Only open inline rename on desktop
        if (window.innerWidth >= 768) {
            setRenamingId(char.id)
            setRenameValue(char.name ?? '')
        }
    }

    function commitRename(id: string) {
        const trimmed = renameValue.trim()
        if (isReadOnly) {
            setRenamingId(null)
            return
        }
        if (trimmed && trimmed !== localCharacters.find(c => c.id === id)?.name) {
            handleFieldChange(id, 'name', trimmed)
        }
        setRenamingId(null)
    }

    function handleRenameKeyDown(e: React.KeyboardEvent, id: string) {
        if (e.key === 'Enter') commitRename(id)
        if (e.key === 'Escape') setRenamingId(null)
    }

    async function handleReorder(result: DropResult) {
        if (isReadOnly || !result.destination) return

        const items = reorder(
            localCharacters,
            result.source.index,
            result.destination.index
        )

        setLocalCharacters(items)

        try {
            await reorderWritingEntities('characters', items.map((char, index) => ({
                ...char,
                order_index: index,
            })))
        } catch (error) {
            console.error('Error updating character order:', error)
            // Rollback
            setLocalCharacters(localCharacters)
        }
    }

    if (localCharacters.length === 0) {
        return <EmptyCharactersState onCreate={handleCreateCharacter} isCreating={isCreating} projectType={projectType} isReadOnly={isReadOnly} />
    }

    return (
        <TooltipProvider>
        <div className="characters-tab characters-tab-shell flex-1 flex overflow-hidden bg-[#fbf9f5] relative">
            {/* Left Sidebar - Character List */}
            <div className={cn(
                "characters-tab-sidebar w-full md:w-80 md:min-w-80 bg-[#f5f4ef] flex flex-col border-r border-slate-200/50 transition-all duration-300",
                selectedId && "hidden md:flex"
            )}>
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Users className="w-4 h-4 text-[#546354]/60" />
                        <h2 className="text-[11px] font-sans tracking-[0.2em] uppercase text-[#546354]/60 font-medium">
                            {projectType === 'tv_script' ? 'Cast List' : 'Characters'}
                        </h2>
                    </div>
                    {/* Add button */}
                    {!isReadOnly && (
                        <Tooltip>
                            <TooltipTrigger>
                                <button 
                                    onClick={handleCreateCharacter}
                                    disabled={isCreating}
                                    className="w-8 h-8 rounded-full bg-white/40 ring-1 ring-white/60 flex items-center justify-center hover:bg-white transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {isCreating ? <Loader2 className="w-3.5 h-3.5 text-stone-400 animate-spin" /> : <Plus className="w-4 h-4 text-stone-400" />}
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Add character</TooltipContent>
                        </Tooltip>
                    )}
                </div>

                <DragDropContext onDragEnd={handleReorder}>
                    <Droppable droppableId="characters">
                        {(provided) => (
                            <div 
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="flex-1 overflow-y-auto px-4 pb-10 space-y-1 custom-scrollbar"
                            >
                                {localCharacters.map((char: Character, index: number) => (
                                    <Draggable key={char.id} draggableId={char.id} index={index} isDragDisabled={isReadOnly}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => setSelectedId(char.id)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault()
                                                        setSelectedId(char.id)
                                                    }
                                                }}
                                                className={cn(
                                                    "w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all duration-300 text-left group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#546354]/20",
                                                    selectedId === char.id
                                                        ? "bg-white shadow-[0_10px_30px_rgba(0,0,0,0.03)] ring-1 ring-slate-100"
                                                        : "hover:bg-white/40 text-slate-500 hover:text-slate-800",
                                                    snapshot.isDragging && "shadow-2xl ring-2 ring-[#546354]/20 z-50 bg-white"
                                                )}
                                            >
                                                {!isReadOnly && (
                                                    <div 
                                                        {...provided.dragHandleProps}
                                                        className="p-1 -ml-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-400"
                                                    >
                                                        <GripVertical className="w-3.5 h-3.5" />
                                                    </div>
                                                )}
                                                <div className={cn(
                                                    "w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center transition-all duration-500",
                                                    selectedId === char.id ? "bg-[#fbf9f5] scale-105" : "bg-white border border-slate-100"
                                                )}>
                                                    <User className={cn("w-4.5 h-4.5 transition-colors duration-500", selectedId === char.id ? "text-[#546354]" : "text-stone-300")} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    {renamingId === char.id ? (
                                                        <input
                                                            ref={renameInputRef}
                                                            type="text"
                                                            value={renameValue}
                                                            onChange={e => setRenameValue(e.target.value)}
                                                            onBlur={() => commitRename(char.id)}
                                                            onKeyDown={e => handleRenameKeyDown(e, char.id)}
                                                            onClick={e => e.stopPropagation()}
                                                            className="w-full bg-[#fbf9f5] border border-[#546354]/20 rounded-lg px-2 py-0.5 text-sm font-medium text-slate-800 outline-none ring-1 ring-[#546354]/10"
                                                        />
                                                    ) : (
                                                        <>
                                                            <p className={cn(
                                                                "text-sm font-medium tracking-tight truncate",
                                                                selectedId === char.id ? "text-slate-800" : "text-slate-500"
                                                            )}>
                                                                {char.name}
                                                            </p>
                                                            <p className="text-[10px] text-slate-300 uppercase tracking-widest mt-0.5 font-medium opacity-60">
                                                                Character
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                                 <div className="flex items-center gap-1">
                                                    {confirmDeleteId === char.id ? (
                                                        <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-200" onClick={e => e.stopPropagation()}>
                                                            <button
                                                                onClick={() => setConfirmDeleteId(null)}
                                                                aria-label="Cancel deletion"
                                                                className="p-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider"
                                                            >
                                                                No
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteCharacter(char.id)}
                                                                disabled={isSaving}
                                                                aria-label="Confirm delete character"
                                                                className="px-2 py-0.5 text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg uppercase tracking-wider transition-colors disabled:opacity-50"
                                                            >
                                                                {isSaving ? '...' : 'Yes'}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {!isReadOnly && (
                                                                <div className={cn(
                                                                    "flex items-center gap-1 rounded-2xl border border-stone-200/70 bg-white/90 p-1 shadow-sm backdrop-blur-sm transition-opacity",
                                                                    selectedId === char.id ? "opacity-100" : "opacity-100 md:opacity-0 md:group-hover:opacity-100"
                                                                )}>
                                                                    <ItemRowActionButton
                                                                        label="Rename"
                                                                        icon={Pencil}
                                                                        onClick={e => startRename(char, e)}
                                                                        className="hover:border-[#546354]/20 hover:bg-[#546354]/5 hover:text-[#546354]"
                                                                    />
                                                                    <ItemRowActionButton
                                                                        label="Delete"
                                                                        icon={Trash2}
                                                                        onClick={e => {
                                                                            e.stopPropagation()
                                                                            setConfirmDeleteId(char.id)
                                                                        }}
                                                                        className="hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                                                                    />
                                                                </div>
                                                            )}
                                                            {selectedId === char.id && renamingId === null && confirmDeleteId === null && (
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

            {/* Main Content - Detail view */}
            <div className={cn(
                "characters-tab-detail flex-1 flex flex-col overflow-hidden bg-[#fbf9f5] w-full max-w-full",
                !selectedId && "hidden md:flex"
            )}>
                {selectedId && (
                    <div className="characters-tab-mobilebar md:hidden sticky top-0 z-20 px-6 py-4 bg-[#fbf9f5] border-b border-stone-200/50">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setSelectedId(null)}
                            className="text-[#546354] gap-2 px-0 hover:bg-transparent"
                        >
                            <ChevronRight className="w-4 h-4 rotate-180" />
                            Back to characters list
                        </Button>
                    </div>
                )}
                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                    {selectedCharacter ? (
                        <div className="max-w-3xl mx-auto px-4 py-8 sm:px-12 sm:py-16 space-y-12 sm:space-y-16 animate-in fade-in duration-700 slide-in-from-bottom-4">
                            {/* Header section with Name */}
                            <div className="space-y-6">
                                <div className="hidden sm:flex items-center gap-4">
                                    <div className="h-px w-8 bg-stone-200" />
                                    <div className="flex items-center gap-2 text-[11px] font-sans tracking-[0.25em] uppercase text-stone-400 font-bold">
                                        <Hash className="w-3.5 h-3.5" />
                                        <span>Dossier</span>
                                    </div>
                                    <div className="h-px flex-1 bg-stone-200/50" />
                                </div>
                                
                                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 sm:gap-8">
                                    <AssetPicker 
                                        projectId={projectId}
                                        entityId={selectedCharacter.id}
                                        entityType="character"
                                        disabled={isReadOnly}
                                    />
                                    <StableInput
                                        type="text"
                                        value={selectedCharacter.name}
                                        onValueChange={(val) => handleFieldChange(selectedCharacter.id, 'name', val)}
                                        disabled={isReadOnly}
                                        readOnly={isReadOnly}
                                        className="w-full sm:flex-1 bg-transparent text-4xl sm:text-6xl font-serif italic text-slate-800 tracking-tight leading-tight outline-none border-none placeholder:text-slate-200 text-left min-w-0"
                                        placeholder="Character Name"
                                    />
                                </div>
                            </div>

                            {/* Description - Physical & Background */}
                            <div className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3 text-[10px] font-sans tracking-[0.3em] uppercase text-stone-500 font-bold">
                                            <Search className="w-4 h-4 text-stone-400" />
                                            <span>Character Overview</span>
                                        </div>
                                        <p className="text-[10px] text-stone-400 font-medium ml-7 tracking-normal">Who they are, background, role in the story</p>
                                    </div>
                                    <div className="w-10 h-px bg-stone-100" />
                                </div>
                                <div className="characters-tab-primary-panel bg-white rounded-[2rem] sm:rounded-[3rem] p-8 sm:p-12 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.02)] ring-1 ring-slate-100/50">
                                        <PremiumEditor
                                            value={selectedCharacter.description || ''}
                                            onValueChange={(val) => handleTextEditorChange(selectedCharacter.id, 'description', val)}
                                            editable={!isReadOnly}
                                            className="w-full bg-transparent text-slate-600 leading-relaxed font-serif text-lg sm:text-xl italic placeholder:text-stone-200"
                                            editorClassName="italic"
                                            placeholder={projectType === 'novel' 
                                                ? "Describe the life, history, and physical presence of this character..." 
                                                : "Begin detailing the life and background of this cast member..."}
                                            minHeight="150px"
                                        />
                                </div>
                            </div>

                            {/* Notes - Psychology & Arcs */}
                            <div className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3 text-[10px] font-sans tracking-[0.3em] uppercase text-stone-500 font-bold">
                                            <PenTool className="w-4 h-4 text-stone-400" />
                                            <span>Inner World</span>
                                        </div>
                                        <p className="text-[10px] text-stone-400 font-medium ml-7 tracking-normal">fears, motivations, desires, emotional struggles</p>
                                    </div>
                                    <div className="w-10 h-px bg-stone-100" />
                                </div>
                                <div className="characters-tab-secondary-panel rounded-[3rem] p-10 ring-1 ring-[#546354]/5 border border-dashed border-[#546354]/10 bg-[#fcfbf9]/60">
                                    <PremiumEditor
                                        value={selectedCharacter.notes || ''}
                                        onValueChange={(val) => handleTextEditorChange(selectedCharacter.id, 'notes', val)}
                                        editable={!isReadOnly}
                                        className="w-full bg-transparent text-slate-600 leading-relaxed font-serif text-lg sm:text-xl italic placeholder:text-stone-200"
                                        editorClassName="italic"
                                        placeholder="Add internal motivations, personal goals, and narrative arcs..."
                                        minHeight="120px"
                                    />
                                </div>
                            </div>

                            {/* Relationships Section */}
                            {!isLocalProject && (
                                <RelationshipManager 
                                    key={selectedCharacter.id}
                                    projectId={projectId}
                                    charId={selectedCharacter.id}
                                    charName={selectedCharacter.name}
                                    availableEntities={availableEntities}
                                    disabled={isReadOnly}
                                />
                            )}

                            {/* Stats/Metatadata section */}
                            <div className="pt-16 flex items-center justify-between relative">
                                <div className="flex items-center gap-6">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] uppercase tracking-widest text-slate-300 font-bold">Registration</span>
                                        <span className="text-[10px] font-serif italic text-slate-400">{formatStableDate(selectedCharacter.created_at)}</span>
                                    </div>
                                    <div className="w-px h-8 bg-stone-100" />
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] uppercase tracking-widest text-slate-300 font-bold">Archive ID</span>
                                        <span className="text-[10px] font-mono text-slate-400 opacity-60 uppercase">{selectedCharacter.id.slice(0, 8)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {/* Auto-save indicator */}
                                    <div className="flex items-center gap-2 group transition-all duration-500">
                                        <div className={cn(
                                            "w-1.5 h-1.5 rounded-full transition-all duration-500",
                                            isSaving ? "bg-[#546354] animate-pulse" : justSaved ? "bg-green-400" : "bg-slate-200"
                                        )} />
                                        <span className={cn(
                                            "text-[9px] uppercase tracking-[0.2em] font-bold transition-all duration-500",
                                            isSaving ? "text-[#546354]" : justSaved ? "text-green-600" : "text-slate-300"
                                        )}>
                                            {isSaving ? 'Saving…' : justSaved ? 'Saved' : 'All changes saved'}
                                        </span>
                                    </div>
                                    <div className="w-32 h-px bg-gradient-to-r from-stone-100 to-transparent" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="hidden sm:flex flex-col items-center justify-center h-full text-center space-y-6 max-w-sm mx-auto animate-in fade-in duration-1000">
                             <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-50">
                                <Users className="w-5 h-5 text-stone-200" />
                             </div>
                             <p className="text-slate-400 font-serif italic text-lg">
                                Select a character to disclose their narrative dossier.
                             </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
        </TooltipProvider>
    )
}

function EmptyCharactersState({
    onCreate,
    isCreating,
    projectType,
    isReadOnly = false,
}: {
    onCreate: () => void
    isCreating: boolean
    projectType: string
    isReadOnly?: boolean
}) {
    return (
        <div className="characters-tab-empty characters-tab-shell flex-1 w-full min-h-full bg-[#fbf9f5] flex flex-col items-center sm:justify-center py-12 p-6 text-center animate-in fade-in duration-700 overflow-y-auto">
            <div className="max-w-2xl w-full py-12 sm:py-20 px-6 sm:px-10 rounded-[3rem] bg-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.04)] ring-1 ring-slate-100 flex flex-col items-center">
                <div className="w-24 h-24 bg-stone-50 rounded-[30%] flex items-center justify-center mb-8 rotate-3 shadow-inner">
                    <Users className="w-12 h-12 text-stone-200" />
                </div>

                <h2 className="text-4xl font-serif italic text-slate-800 mb-4 tracking-tight">The Stage Awaits</h2>
                <p className="text-[11px] font-sans tracking-[0.4em] uppercase text-stone-300 mb-10 font-bold">
                    {getProjectTypeLabel(projectType as any)} Characters
                </p>

                <div className="space-y-8 max-w-md">
                    <p className="text-slate-500 font-medium leading-relaxed italic text-lg">
                        {isReadOnly ? 'This archive has no visible characters yet.' : 'Start your story by adding a character.'}
                    </p>
                    <div className="h-px w-16 bg-stone-100 mx-auto" />
                    <p className="text-stone-400 text-sm leading-relaxed px-6">
                        {isReadOnly
                            ? 'Viewers can explore shared characters once they have been added by the owner or an editor.'
                            : 'No characters have been registered yet. Create one to start building your world and populating your Narrative Archive.'}
                    </p>
                </div>

                {!isReadOnly && (
                    <div className="mt-12">
                        <Button 
                            variant="outline" 
                            onClick={onCreate}
                            disabled={isCreating}
                            className="rounded-full px-10 py-7 h-auto border-stone-100 text-stone-500 hover:text-stone-800 hover:bg-stone-50 bg-white shadow-sm ring-1 ring-stone-100 uppercase tracking-[0.2em] text-[10px] font-bold transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isCreating ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-2" />}
                            Create First Character
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
