'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { User, Users, Plus, Search, ChevronRight, PenTool, Hash, Loader2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

type Character = Database['public']['Tables']['characters']['Row']

export default function CharactersTab({
    projectId,
    characters: initialCharacters = []
}: {
    projectId: string
    characters?: Character[]
}) {
    const [localCharacters, setLocalCharacters] = useState<Character[]>(initialCharacters)
    const [selectedId, setSelectedId] = useState<string | null>(initialCharacters[0]?.id ?? null)
    const [isCreating, setIsCreating] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [justSaved, setJustSaved] = useState(false)
    
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const selectedCharacter = localCharacters.find((c: Character) => c.id === selectedId)

    // Sync justSaved state
    useEffect(() => {
        if (!isSaving && isSaving !== undefined) {
            setJustSaved(true)
            const timer = setTimeout(() => setJustSaved(false), 2000)
            return () => clearTimeout(timer)
        }
    }, [isSaving])

    const saveCharacter = useCallback(async (id: string, updates: Database['public']['Tables']['characters']['Update']) => {
        setIsSaving(true)
        const supabase = createClient()
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
            .from('characters')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (data) {
            setLocalCharacters((prev: Character[]) => prev.map(c => c.id === id ? data as Character : c))
        } else if (error) {
            console.error('Error saving character:', error)
        }
        
        setIsSaving(false)
    }, [])

    const handleFieldChange = (id: string, field: keyof Character, value: string) => {
        // Update local state immediately for responsiveness
        setLocalCharacters((prev: Character[]) => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
        
        // Debounce the save
        if (saveTimer.current) clearTimeout(saveTimer.current)
        setIsSaving(true)
        saveTimer.current = setTimeout(() => {
            saveCharacter(id, { [field]: value } as Database['public']['Tables']['characters']['Update'])
        }, 1000)
    }

    async function handleDeleteCharacter() {
        if (!selectedId) return
        if (!window.confirm('Are you sure you want to delete this character? This action cannot be undone.')) return

        setIsSaving(true)
        const supabase = createClient() as any
        const { error } = await supabase
            .from('characters')
            .delete()
            .eq('id', selectedId)

        if (!error) {
            const index = localCharacters.findIndex(c => c.id === selectedId)
            const newChars = localCharacters.filter(c => c.id !== selectedId)
            setLocalCharacters(newChars)
            
            if (newChars.length > 0) {
                const nextIndex = index < newChars.length ? index : newChars.length - 1
                setSelectedId(newChars[nextIndex].id)
            } else {
                setSelectedId(null)
            }
        } else {
            console.error('Error deleting character:', error)
        }
        setIsSaving(false)
    }

    async function handleCreateCharacter() {
        setIsCreating(true)
        const supabase = createClient() as any
        
        const nextOrderIndex = Math.max(0, ...localCharacters.map((c: Character) => c.order_index)) + 1
        
        const { data, error } = await supabase
            .from('characters')
            .insert({
                project_id: projectId,
                name: 'New Character',
                description: '',
                notes: '',
                order_index: nextOrderIndex
            })
            .select()
            .single()

        if (data) {
            setLocalCharacters((prev: Character[]) => [...prev, data as Character])
            setSelectedId(data.id)
        } else if (error) {
            console.error('Error creating character:', error)
        }
        
        setIsCreating(false)
    }

    if (localCharacters.length === 0) {
        return <EmptyCharactersState onCreate={handleCreateCharacter} isCreating={isCreating} />
    }

    return (
        <div className="flex h-[calc(100vh-56px-97px)] overflow-hidden bg-[#fbf9f5]">
            {/* Left Sidebar - Character List */}
            <div className="w-80 min-w-80 bg-[#f5f4ef] flex flex-col border-r border-slate-200/50">
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Users className="w-4 h-4 text-[#546354]/60" />
                        <h2 className="text-[11px] font-sans tracking-[0.2em] uppercase text-[#546354]/60 font-medium">Dramatis Personae</h2>
                    </div>
                    {/* Add button */}
                    <button 
                        onClick={handleCreateCharacter}
                        disabled={isCreating}
                        className="w-8 h-8 rounded-full bg-white/40 ring-1 ring-white/60 flex items-center justify-center hover:bg-white transition-all active:scale-95 disabled:opacity-50"
                        title="Add character"
                    >
                        {isCreating ? <Loader2 className="w-3.5 h-3.5 text-stone-400 animate-spin" /> : <Plus className="w-4 h-4 text-stone-400" />}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-10 space-y-1 custom-scrollbar">
                    {localCharacters.map((char: Character) => (
                        <button
                            key={char.id}
                            onClick={() => setSelectedId(char.id)}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all duration-300 text-left group",
                                selectedId === char.id
                                    ? "bg-white shadow-[0_10px_30px_rgba(0,0,0,0.03)] ring-1 ring-slate-100"
                                    : "hover:bg-white/40 text-slate-500 hover:text-slate-800"
                            )}
                        >
                            <div className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-500",
                                selectedId === char.id ? "bg-[#fbf9f5] scale-105" : "bg-white border border-slate-100"
                            )}>
                                <User className={cn("w-4.5 h-4.5 transition-colors duration-500", selectedId === char.id ? "text-[#546354]" : "text-stone-300")} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={cn(
                                    "text-sm font-medium tracking-tight truncate",
                                    selectedId === char.id ? "text-slate-800" : "text-slate-500"
                                )}>
                                    {char.name}
                                </p>
                                <p className="text-[10px] text-slate-300 uppercase tracking-widest mt-0.5 font-medium opacity-60">Cast Member</p>
                            </div>
                            {selectedId === char.id && (
                                <div className="w-1.5 h-1.5 rounded-full bg-[#546354]/40" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content - Detail view */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#fbf9f5]">
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {selectedCharacter ? (
                        <div className="max-w-3xl mx-auto px-12 py-16 space-y-16 animate-in fade-in duration-700 slide-in-from-bottom-4">
                            {/* Header section with Name */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="h-px w-8 bg-stone-200" />
                                    <div className="flex items-center gap-2 text-[11px] font-sans tracking-[0.25em] uppercase text-stone-400 font-bold">
                                        <Hash className="w-3.5 h-3.5" />
                                        <span>Dossier</span>
                                    </div>
                                    <div className="h-px flex-1 bg-stone-200/50" />
                                    <button 
                                        onClick={handleDeleteCharacter}
                                        className="p-2 hover:bg-red-50 text-stone-300 hover:text-red-400 rounded-full transition-all duration-300 active:scale-90"
                                        title="Delete character"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                
                                <input
                                    type="text"
                                    value={selectedCharacter.name}
                                    onChange={(e) => handleFieldChange(selectedCharacter.id, 'name', e.target.value)}
                                    className="w-full bg-transparent text-6xl font-serif italic text-slate-800 tracking-tight leading-tight outline-none border-none placeholder:text-slate-200"
                                    placeholder="Character Name"
                                />
                            </div>

                            {/* Description - Physical & Background */}
                            <div className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-[10px] font-sans tracking-[0.3em] uppercase text-stone-300 font-bold">
                                        <Search className="w-4 h-4 text-stone-200" />
                                        <span>Archetype & Persona</span>
                                    </div>
                                    <div className="w-10 h-px bg-stone-100" />
                                </div>
                                <div className="bg-white rounded-[3rem] p-12 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.02)] ring-1 ring-slate-100/50">
                                    <textarea
                                        value={selectedCharacter.description || ''}
                                        onChange={(e) => handleFieldChange(selectedCharacter.id, 'description', e.target.value)}
                                        className="w-full bg-transparent text-slate-600 leading-relaxed font-serif text-xl italic outline-none border-none min-h-[150px] resize-none placeholder:text-stone-200"
                                        placeholder="Begin detailing the life and background of this cast member..."
                                    />
                                </div>
                            </div>

                            {/* Notes - Psychology & Arcs */}
                            <div className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-[10px] font-sans tracking-[0.3em] uppercase text-stone-300 font-bold">
                                        <PenTool className="w-4 h-4 text-stone-200" />
                                        <span>Psychological Depths</span>
                                    </div>
                                    <div className="w-10 h-px bg-stone-100" />
                                </div>
                                <div className="bg-[#fcfbf9]/60 rounded-[3rem] p-10 ring-1 ring-[#546354]/5 border border-dashed border-[#546354]/10">
                                    <textarea
                                        value={selectedCharacter.notes || ''}
                                        onChange={(e) => handleFieldChange(selectedCharacter.id, 'notes', e.target.value)}
                                        className="w-full bg-transparent text-slate-500 font-sans text-sm leading-relaxed outline-none border-none min-h-[120px] resize-none italic placeholder:text-stone-200"
                                        placeholder="Add internal motivations, personal goals, and narrative arcs..."
                                    />
                                </div>
                            </div>

                            {/* Stats/Metatadata section */}
                            <div className="pt-16 flex items-center justify-between relative">
                                <div className="flex items-center gap-6">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] uppercase tracking-widest text-slate-300 font-bold">Registration</span>
                                        <span className="text-[10px] font-serif italic text-slate-400">{new Date(selectedCharacter.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
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
                                            {isSaving ? 'Registering…' : justSaved ? 'Archived' : 'Safe in Archive'}
                                        </span>
                                    </div>
                                    <div className="w-32 h-px bg-gradient-to-r from-stone-100 to-transparent" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-6 max-w-sm mx-auto animate-in fade-in duration-1000">
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
    )
}

function EmptyCharactersState({ onCreate, isCreating }: { onCreate: () => void, isCreating: boolean }) {
    return (
        <div className="min-h-full bg-[#fbf9f5] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
            <div className="max-w-2xl w-full py-20 px-10 rounded-[3rem] bg-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.04)] ring-1 ring-slate-100 flex flex-col items-center">
                <div className="w-24 h-24 bg-stone-50 rounded-[30%] flex items-center justify-center mb-8 rotate-3 shadow-inner">
                    <Users className="w-12 h-12 text-stone-200" />
                </div>

                <h2 className="text-4xl font-serif italic text-slate-800 mb-4 tracking-tight">The Stage Awaits</h2>
                <p className="text-[11px] font-sans tracking-[0.4em] uppercase text-stone-300 mb-10 font-bold">Dramatis Personae Empty</p>

                <div className="space-y-8 max-w-md">
                    <p className="text-slate-500 font-medium leading-relaxed italic text-lg">
                        "A story is only as profound as the souls who inhabit it. Your archive is currently quiet."
                    </p>
                    <div className="h-px w-16 bg-stone-100 mx-auto" />
                    <p className="text-stone-400 text-sm leading-relaxed px-6">
                        No characters have been registered yet. Create one to start building your world and populating your Narrative Archive.
                    </p>
                </div>

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
            </div>
        </div>
    )
}
