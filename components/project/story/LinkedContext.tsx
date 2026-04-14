import { useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useProjectActions } from '@/components/project/ProjectContext'
import { Users, Lightbulb, MapPin, Package, X, FileText, Folder, MessageSquare, Plus } from 'lucide-react'
import { useDragScroll } from '@/hooks/useDragScroll'

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
    const { role } = useProjectActions()
    const isReadOnly = role === 'viewer'
    const { scrollRef, isDragging, onMouseDown, onMouseLeave, onMouseUp, onMouseMove } = useDragScroll()


    const linkedChars = sceneCharacters?.map(sc => sc.characters).filter(c => c && !c.deleted_at) || []
    const linkedIdeas = sceneIdeas?.map(si => si.ideas).filter(i => i && !i.deleted_at) || []
    const linkedLocs = sceneLocations?.map(sl => sl.locations).filter(l => l && !l.deleted_at) || []
    const linkedObjs = sceneObjects?.map(so => so.objects).filter(o => o && !o.deleted_at) || []
    
    const unlinkedCharacters = projectCharacters.filter(pc => !linkedChars.some(lc => lc.id === pc.id))
    const unlinkedIdeas = projectIdeas.filter(pi => !linkedIdeas.some(li => li.id === pi.id))
    const unlinkedLocations = projectLocations.filter(pl => !linkedLocs.some(ll => ll.id === pl.id))
    const unlinkedObjects = projectObjects.filter(po => !linkedObjs.some(lo => lo.id === po.id))

    async function addCharacter(characterId: string) {
        startTransition(async () => {
            // @ts-ignore
            const { error } = await supabase.from('scene_characters').upsert({ scene_id: sceneId, character_id: characterId }, { onConflict: 'scene_id,character_id' })
            onUpdate()
        })
    }

    async function removeCharacter(characterId: string) {
        startTransition(async () => {
            await supabase.from('scene_characters').delete().eq('scene_id', sceneId).eq('character_id', characterId)
            onUpdate()
        })
    }

    async function addIdea(ideaId: string) {
        startTransition(async () => {
            // @ts-ignore
            const { error } = await supabase.from('scene_ideas').upsert({ scene_id: sceneId, idea_id: ideaId }, { onConflict: 'scene_id,idea_id' })
            onUpdate()
        })
    }

    async function removeIdea(ideaId: string) {
        startTransition(async () => {
            await supabase.from('scene_ideas').delete().eq('scene_id', sceneId).eq('idea_id', ideaId)
            onUpdate()
        })
    }

    async function addLocation(locationId: string) {
        startTransition(async () => {
            // @ts-ignore
            const { error } = await supabase.from('scene_locations').upsert({ scene_id: sceneId, location_id: locationId }, { onConflict: 'scene_id,location_id' })
            onUpdate()
        })
    }

    async function removeLocation(locationId: string) {
        startTransition(async () => {
            await supabase.from('scene_locations').delete().eq('scene_id', sceneId).eq('location_id', locationId)
            onUpdate()
        })
    }

    async function addObject(objectId: string) {
        startTransition(async () => {
            // @ts-ignore
            const { error } = await supabase.from('scene_objects').upsert({ scene_id: sceneId, object_id: objectId }, { onConflict: 'scene_id,object_id' })
            onUpdate()
        })
    }

    async function removeObject(objectId: string) {
        startTransition(async () => {
            await supabase.from('scene_objects').delete().eq('scene_id', sceneId).eq('object_id', objectId)
            onUpdate()
        })
    }

    return (
        <div className="flex-1 relative min-w-0 h-[34px]">
            <div 
                ref={scrollRef}
                onMouseDown={onMouseDown}
                onMouseLeave={onMouseLeave}
                onMouseUp={onMouseUp}
                onMouseMove={onMouseMove}
                className={cn(
                    "flex items-center gap-2 overflow-x-auto no-scrollbar absolute inset-0 pr-12 [mask-image:linear-gradient(to_right,black_calc(100%-40px),transparent_100%)] overscroll-x-contain pointer-events-auto",
                    isDragging ? "cursor-grabbing" : "cursor-grab"
                )}
            >
                {/* Add Context Actions */}
                {!isReadOnly && (
                    <div className="flex shrink-0 items-center gap-2 mr-2 border-r border-slate-200 pr-3">
                        <div className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-[#546354] font-bold h-6">
                            <Plus className="w-3 h-3" />
                            <span>Link</span>
                        </div>
                        
                        {unlinkedCharacters.length > 0 && (
                            <select 
                                className="bg-transparent text-[10px] font-bold uppercase tracking-wider text-slate-400 outline-none cursor-pointer hover:text-[#546354] transition-colors"
                                value=""
                                onChange={(e) => e.target.value && addCharacter(e.target.value)}
                                disabled={isPending}
                            >
                                <option value="" disabled>+ Character</option>
                                {unlinkedCharacters.map(char => (
                                    <option key={char.id} value={char.id}>{char.name}</option>
                                ))}
                            </select>
                        )}

                        {unlinkedIdeas.length > 0 && (
                            <select 
                                className="bg-transparent text-[10px] font-bold uppercase tracking-wider text-slate-400 outline-none cursor-pointer hover:text-indigo-600 transition-colors"
                                value=""
                                onChange={(e) => e.target.value && addIdea(e.target.value)}
                                disabled={isPending}
                            >
                                <option value="" disabled>+ Idea</option>
                                {unlinkedIdeas.map(idea => (
                                    <option key={idea.id} value={idea.id}>{idea.title}</option>
                                ))}
                            </select>
                        )}

                        {unlinkedLocations.length > 0 && (
                            <select 
                                className="bg-transparent text-[10px] font-bold uppercase tracking-wider text-slate-400 outline-none cursor-pointer hover:text-emerald-600 transition-colors"
                                value=""
                                onChange={(e) => e.target.value && addLocation(e.target.value)}
                                disabled={isPending}
                            >
                                <option value="" disabled>+ Location</option>
                                {unlinkedLocations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                            </select>
                        )}

                        {unlinkedObjects.length > 0 && (
                            <select 
                                className="bg-transparent text-[10px] font-bold uppercase tracking-wider text-slate-400 outline-none cursor-pointer hover:text-blue-600 transition-colors"
                                value=""
                                onChange={(e) => e.target.value && addObject(e.target.value)}
                                disabled={isPending}
                            >
                                <option value="" disabled>+ Object</option>
                                {unlinkedObjects.map(obj => (
                                    <option key={obj.id} value={obj.id}>{obj.name}</option>
                                ))}
                            </select>
                        )}
                    </div>
                )}

                {/* Linked Characters */}
                {linkedChars.map(char => {
                    const isActive = activeCharacters?.[char.id] !== false
                    return (
                        <div 
                            key={char.id} 
                            className={cn(
                                "flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all select-none", 
                                isActive ? "bg-[#546354]/10 text-[#546354] border-transparent" : "bg-white text-slate-300 border-slate-100 grayscale opacity-60"
                            )}
                        >
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setActiveCharacters?.(prev => ({ ...prev, [char.id]: e.target.checked }))}
                                className="w-3.5 h-3.5 rounded-md cursor-pointer accent-[#546354]"
                            />
                            <Users className="w-3 h-3 opacity-60" />
                            {char.name}
                            {!isReadOnly && (
                                <button onClick={() => removeCharacter(char.id)} className="ml-1 opacity-40 hover:opacity-100 transition-opacity" disabled={isPending}>
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    )
                })}
                
                {/* Linked Ideas */}
                {linkedIdeas.map(idea => {
                    const isActive = activeIdeas?.[idea.id] !== false
                    const isFeedback = idea.title?.toLowerCase().startsWith('feedback:')
                    const IdeaIcon = isFeedback ? MessageSquare : Lightbulb
                    return (
                        <div 
                            key={idea.id} 
                            className={cn(
                                "flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all select-none", 
                                isActive ? "bg-indigo-50 text-indigo-700 border-indigo-100" : "bg-white text-slate-300 border-slate-100 grayscale opacity-60"
                            )}
                        >
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setActiveIdeas?.(prev => ({ ...prev, [idea.id]: e.target.checked }))}
                                className="w-3.5 h-3.5 rounded-md cursor-pointer accent-indigo-600"
                            />
                            <IdeaIcon className="w-3 h-3 opacity-60" />
                            {idea.title}
                            {!isReadOnly && (
                                <button onClick={() => removeIdea(idea.id)} className="ml-1 opacity-40 hover:opacity-100 transition-opacity" disabled={isPending}>
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    )
                })}

                {/* Linked Locations */}
                {linkedLocs.map(loc => {
                    const isActive = activeLocations?.[loc.id] !== false
                    return (
                        <div 
                            key={loc.id} 
                            className={cn(
                                "flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all select-none", 
                                isActive ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-white text-slate-300 border-slate-100 grayscale opacity-60"
                            )}
                        >
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setActiveLocations?.(prev => ({ ...prev, [loc.id]: e.target.checked }))}
                                className="w-3.5 h-3.5 rounded-md cursor-pointer accent-emerald-600"
                            />
                            <MapPin className="w-3 h-3 opacity-60" />
                            {loc.name}
                            {!isReadOnly && (
                                <button onClick={() => removeLocation(loc.id)} className="ml-1 opacity-40 hover:opacity-100 transition-opacity" disabled={isPending}>
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    )
                })}

                {/* Linked Objects */}
                {linkedObjs.map(obj => {
                    const isActive = activeObjects?.[obj.id] !== false
                    return (
                        <div 
                            key={obj.id} 
                            className={cn(
                                "flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all select-none", 
                                isActive ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-white text-slate-300 border-slate-100 grayscale opacity-60"
                            )}
                        >
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setActiveObjects?.(prev => ({ ...prev, [obj.id]: e.target.checked }))}
                                className="w-3.5 h-3.5 rounded-md cursor-pointer accent-blue-600"
                            />
                            <Package className="w-3 h-3 opacity-60" />
                            {obj.name}
                            {!isReadOnly && (
                                <button onClick={() => removeObject(obj.id)} className="ml-1 opacity-40 hover:opacity-100 transition-opacity" disabled={isPending}>
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    )
                })}

                {/* Selected Story Context */}
                {selectedNodeIds.map(nodeId => {
                    const node = allNodes.find(n => n.id === nodeId)
                    if (!node) return null
                    const Icon = node.type === 'scene' ? FileText : Folder
                    
                    return (
                        <div key={nodeId} className="flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-amber-50 text-amber-700 border-amber-200 select-none">
                            <Icon className="w-3 h-3 opacity-60" />
                            {node.title}
                            {!isReadOnly && (
                                <button 
                                    onClick={() => onToggleNodeSelection?.(nodeId)} 
                                    className="ml-1 opacity-40 hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
