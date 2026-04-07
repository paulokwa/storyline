import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Users, Lightbulb, FileText, Folder, MapPin, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Entity {
    id: string
    name?: string
    title?: string
}

interface LinkedContextProps {
    sceneId: string
    sceneCharacters: { characters: any }[]
    sceneIdeas: { ideas: any }[]
    sceneLocations: { locations: any }[]
    sceneObjects: { objects: any }[]
    projectCharacters: any[]
    projectIdeas: any[]
    projectLocations: any[]
    projectObjects: any[]
    onUpdate: () => void
    activeCharacters?: Record<string, boolean>
    setActiveCharacters?: (action: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void
    activeIdeas?: Record<string, boolean>
    setActiveIdeas?: (action: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void
    activeLocations?: Record<string, boolean>
    setActiveLocations?: (action: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void
    activeObjects?: Record<string, boolean>
    setActiveObjects?: (action: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void
    selectedNodeIds?: string[]
    onToggleNodeSelection?: (nodeId: string) => void
    allNodes?: any[]
}

export default function LinkedContext({ 
    sceneId, 
    sceneCharacters, 
    sceneIdeas, 
    sceneLocations,
    sceneObjects,
    projectCharacters, 
    projectIdeas,
    projectLocations,
    projectObjects,
    onUpdate,
    activeCharacters,
    setActiveCharacters,
    activeIdeas,
    setActiveIdeas,
    activeLocations,
    setActiveLocations,
    activeObjects,
    setActiveObjects,
    selectedNodeIds = [],
    onToggleNodeSelection,
    allNodes = []
}: LinkedContextProps) {
    const supabase = createClient()
    const [isPending, startTransition] = useTransition()

    const linkedChars = sceneCharacters?.map(sc => sc.characters).filter(Boolean) || []
    const linkedIds = sceneIdeas?.map(si => si.ideas).filter(Boolean) || []
    const linkedLocs = sceneLocations?.map(sl => sl.locations).filter(Boolean) || []
    const linkedObjs = sceneObjects?.map(so => so.objects).filter(Boolean) || []
    
    const unlinkedCharacters = projectCharacters.filter(pc => !linkedChars.some(lc => lc.id === pc.id))
    const unlinkedIdeas = projectIdeas.filter(pi => !linkedIds.some(li => li.id === pi.id))
    const unlinkedLocations = projectLocations.filter(pl => !linkedLocs.some(ll => ll.id === pl.id))
    const unlinkedObjects = projectObjects.filter(po => !linkedObjs.some(lo => lo.id === po.id))

    async function addCharacter(characterId: string) {
        startTransition(async () => {
            // @ts-ignore
            const { error } = await supabase.from('scene_characters' as any).insert({ scene_id: sceneId, character_id: characterId })
            if (!error || error.code === '23505') onUpdate()
        })
    }

    async function removeCharacter(characterId: string) {
        startTransition(async () => {
            await supabase.from('scene_characters' as any).delete().eq('scene_id', sceneId).eq('character_id', characterId)
            onUpdate()
        })
    }

    async function addIdea(ideaId: string) {
        startTransition(async () => {
            // @ts-ignore
            const { error } = await supabase.from('scene_ideas' as any).insert({ scene_id: sceneId, idea_id: ideaId })
            if (!error || error.code === '23505') onUpdate()
        })
    }

    async function removeIdea(ideaId: string) {
        startTransition(async () => {
            await supabase.from('scene_ideas' as any).delete().eq('scene_id', sceneId).eq('idea_id', ideaId)
            onUpdate()
        })
    }

    async function addLocation(locationId: string) {
        startTransition(async () => {
            // @ts-ignore
            const { error } = await supabase.from('scene_locations' as any).insert({ scene_id: sceneId, location_id: locationId })
            if (!error || error.code === '23505') onUpdate()
        })
    }

    async function removeLocation(locationId: string) {
        startTransition(async () => {
            await supabase.from('scene_locations' as any).delete().eq('scene_id', sceneId).eq('location_id', locationId)
            onUpdate()
        })
    }

    async function addObject(objectId: string) {
        startTransition(async () => {
            // @ts-ignore
            const { error } = await supabase.from('scene_objects' as any).insert({ scene_id: sceneId, object_id: objectId })
            if (!error || error.code === '23505') onUpdate()
        })
    }

    async function removeObject(objectId: string) {
        startTransition(async () => {
            await supabase.from('scene_objects' as any).delete().eq('scene_id', sceneId).eq('object_id', objectId)
            onUpdate()
        })
    }

    return (
        <div className="flex flex-col gap-4 mb-8 bg-black/5 p-4 rounded-2xl border border-black/5 shadow-sm">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#546354]/60">Linked Context</h3>
                {(linkedChars.length > 0 || linkedIds.length > 0 || linkedLocs.length > 0 || linkedObjs.length > 0) && (
                    <span className="text-[10px] text-[#546354]/60 font-medium">Select what AI should use</span>
                )}
            </div>
            
            <div className="flex flex-wrap gap-2">
                {/* Linked Characters */}
                {linkedChars.map(char => {
                    const isActive = activeCharacters?.[char.id] !== false
                    return (
                        <div key={char.id} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors", isActive ? "bg-[#546354]/10 text-[#546354] border-transparent" : "bg-white text-slate-400 border-slate-200 grayscale opacity-70")}>
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setActiveCharacters?.(prev => ({ ...prev, [char.id]: e.target.checked }))}
                                className="w-3 h-3 rounded-sm cursor-pointer accent-[#546354]"
                                title="Include in AI generation"
                            />
                            <Users className="w-3.5 h-3.5 opacity-60" />
                            {char.name}
                            <button onClick={() => removeCharacter(char.id)} className="ml-1 opacity-50 hover:opacity-100 transition-opacity" disabled={isPending}>
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )
                })}
                
                {/* Linked Ideas */}
                {linkedIds.map(idea => {
                    const isActive = activeIdeas?.[idea.id] !== false
                    return (
                        <div key={idea.id} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors", isActive ? "bg-indigo-50 text-indigo-700 border-indigo-100/50" : "bg-white text-slate-400 border-slate-200 grayscale opacity-70")}>
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setActiveIdeas?.(prev => ({ ...prev, [idea.id]: e.target.checked }))}
                                className="w-3 h-3 rounded-sm cursor-pointer accent-indigo-600"
                                title="Include in AI generation"
                            />
                            <Lightbulb className="w-3.5 h-3.5 opacity-60" />
                            {idea.title}
                            <button onClick={() => removeIdea(idea.id)} className="ml-1 opacity-50 hover:opacity-100 transition-opacity" disabled={isPending}>
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )
                })}

                {/* Linked Locations */}
                {linkedLocs.map(loc => {
                    const isActive = activeLocations?.[loc.id] !== false
                    return (
                        <div key={loc.id} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors", isActive ? "bg-emerald-50 text-emerald-700 border-emerald-100/50" : "bg-white text-slate-400 border-slate-200 grayscale opacity-70")}>
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setActiveLocations?.(prev => ({ ...prev, [loc.id]: e.target.checked }))}
                                className="w-3 h-3 rounded-sm cursor-pointer accent-emerald-600"
                                title="Include in AI generation"
                            />
                            <MapPin className="w-3.5 h-3.5 opacity-60" />
                            {loc.name}
                            <button onClick={() => removeLocation(loc.id)} className="ml-1 opacity-50 hover:opacity-100 transition-opacity" disabled={isPending}>
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )
                })}

                {/* Linked Objects */}
                {linkedObjs.map(obj => {
                    const isActive = activeObjects?.[obj.id] !== false
                    return (
                        <div key={obj.id} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors", isActive ? "bg-blue-50 text-blue-700 border-blue-100/50" : "bg-white text-slate-400 border-slate-200 grayscale opacity-70")}>
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setActiveObjects?.(prev => ({ ...prev, [obj.id]: e.target.checked }))}
                                className="w-3 h-3 rounded-sm cursor-pointer accent-blue-600"
                                title="Include in AI generation"
                            />
                            <Package className="w-3.5 h-3.5 opacity-60" />
                            {obj.name}
                            <button onClick={() => removeObject(obj.id)} className="ml-1 opacity-50 hover:opacity-100 transition-opacity" disabled={isPending}>
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )
                })}

                {/* Selected Story Context */}
                {selectedNodeIds.map(nodeId => {
                    const node = allNodes.find(n => n.id === nodeId)
                    if (!node) return null
                    const Icon = node.type === 'scene' ? FileText : Folder
                    
                    return (
                        <div key={nodeId} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border bg-indigo-50/80 text-indigo-700 border-indigo-200">
                            <input
                                type="checkbox"
                                checked={true}
                                onChange={() => onToggleNodeSelection?.(nodeId)}
                                className="w-3 h-3 rounded-sm cursor-pointer accent-indigo-600"
                                title="Include in AI generation"
                            />
                            <Icon className="w-3.5 h-3.5 opacity-60" />
                            {node.title}
                            <button 
                                onClick={() => onToggleNodeSelection?.(nodeId)} 
                                className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )
                })}

                {/* Add Character Dropdown */}
                {unlinkedCharacters.length > 0 && (
                    <div className="relative flex items-center bg-transparent border border-dashed border-[#546354]/30 text-[#546354] rounded-full px-3 py-1 h-8 opacity-70 hover:opacity-100 hover:bg-[#546354]/5 transition-colors">
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        <select 
                            className="bg-transparent text-sm font-medium outline-none appearance-none cursor-pointer pr-4"
                            value=""
                            onChange={(e) => e.target.value && addCharacter(e.target.value)}
                            disabled={isPending}
                        >
                            <option value="" disabled>Character</option>
                            {unlinkedCharacters.map(char => (
                                <option key={char.id} value={char.id}>{char.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Add Idea Dropdown */}
                {unlinkedIdeas.length > 0 && (
                    <div className="relative flex items-center bg-transparent border border-dashed border-indigo-300 text-indigo-600 rounded-full px-3 py-1 h-8 opacity-70 hover:opacity-100 hover:bg-indigo-50 transition-colors">
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        <select 
                            className="bg-transparent text-sm font-medium outline-none appearance-none cursor-pointer pr-4"
                            value=""
                            onChange={(e) => e.target.value && addIdea(e.target.value)}
                            disabled={isPending}
                        >
                            <option value="" disabled>Idea</option>
                            {unlinkedIdeas.map(idea => (
                                <option key={idea.id} value={idea.id}>{idea.title}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Add Location Dropdown */}
                {unlinkedLocations.length > 0 && (
                    <div className="relative flex items-center bg-transparent border border-dashed border-emerald-300 text-emerald-600 rounded-full px-3 py-1 h-8 opacity-70 hover:opacity-100 hover:bg-emerald-50 transition-colors">
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        <select 
                            className="bg-transparent text-sm font-medium outline-none appearance-none cursor-pointer pr-4"
                            value=""
                            onChange={(e) => e.target.value && addLocation(e.target.value)}
                            disabled={isPending}
                        >
                            <option value="" disabled>Location</option>
                            {unlinkedLocations.map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Add Object Dropdown */}
                {unlinkedObjects.length > 0 && (
                    <div className="relative flex items-center bg-transparent border border-dashed border-blue-300 text-blue-600 rounded-full px-3 py-1 h-8 opacity-70 hover:opacity-100 hover:bg-blue-50 transition-colors">
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        <select 
                            className="bg-transparent text-sm font-medium outline-none appearance-none cursor-pointer pr-4"
                            value=""
                            onChange={(e) => e.target.value && addObject(e.target.value)}
                            disabled={isPending}
                        >
                            <option value="" disabled>Object</option>
                            {unlinkedObjects.map(obj => (
                                <option key={obj.id} value={obj.id}>{obj.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
        </div>
    )
}
