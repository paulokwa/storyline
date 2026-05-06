import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useProjectActions } from '@/components/project/ProjectContext'
import { useTheme } from '@/components/providers/ThemeProvider'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Users, Lightbulb, MapPin, Package, X, FileText, Folder, MessageSquare, Plus, Shield, ChevronDown } from 'lucide-react'
import { useDragScroll } from '@/hooks/useDragScroll'

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

interface LinkOption {
    id: string
    label: string
}

function isFeedbackIdea(idea: any) {
    return idea?.title?.toLowerCase().startsWith('feedback:')
}

function LinkActionDropdown({
    label,
    items,
    isOpen,
    isDisabled,
    hoverClassName,
    onOpenChange,
    onSelect,
}: {
    label: string
    items: LinkOption[]
    isOpen: boolean
    isDisabled: boolean
    hoverClassName: string
    onOpenChange: (open: boolean) => void
    onSelect: (id: string) => void
}) {
    if (items.length === 0) return null

    return (
        <DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
            <DropdownMenuTrigger
                disabled={isDisabled}
                className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-slate-400 outline-none transition-colors disabled:pointer-events-none disabled:opacity-50",
                    hoverClassName
                )}
            >
                <span>{label}</span>
                <ChevronDown className={cn("h-3.5 w-3.5 transition-opacity", isOpen && "opacity-0")} />
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                side="bottom"
                sideOffset={8}
                className="w-56 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_12px_32px_rgba(15,23,42,0.12)]"
            >
                <div className="max-h-64 overflow-y-auto">
                    {items.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                                onSelect(item.id)
                                onOpenChange(false)
                            }}
                            className="flex w-full items-center rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                        >
                            <span className="truncate">{item.label}</span>
                        </button>
                    ))}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
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
    const [openMenu, setOpenMenu] = useState<string | null>(null)
    const { role } = useProjectActions()
    const { theme } = useTheme()
    const isMidnight = theme === 'midnight'
    const isReadOnly = role === 'viewer'
    const { 
        scrollRef, isDragging, onMouseDown, onMouseLeave, onMouseUp, onMouseMove 
    } = useDragScroll()
    const { 
        scrollRef: actionScrollRef, 
        isDragging: isActionDragging, 
        onMouseDown: onActionMouseDown, 
        onMouseLeave: onActionMouseLeave, 
        onMouseUp: onActionMouseUp, 
        onMouseMove: onActionMouseMove 
    } = useDragScroll()


    const linkedChars = sceneCharacters?.map(sc => sc.characters).filter(c => c && !c.deleted_at) || []
    const linkedIdeas = sceneIdeas?.map(si => si.ideas).filter(i => i && !i.deleted_at) || []
    const linkedLocs = sceneLocations?.map(sl => sl.locations).filter(l => l && !l.deleted_at) || []
    const linkedObjs = sceneObjects?.map(so => so.objects).filter(o => o && !o.deleted_at) || []

    const linkableProjectIdeas = projectIdeas.filter(idea => !isFeedbackIdea(idea))
    const unlinkedCharacters = projectCharacters.filter(pc => !linkedChars.some(lc => lc.id === pc.id))
    const unlinkedIdeas = linkableProjectIdeas.filter(pi => !linkedIdeas.some(li => li.id === pi.id))
    const unlinkedLocations = projectLocations.filter(pl => !linkedLocs.some(ll => ll.id === pl.id))
    const unlinkedObjects = projectObjects.filter(po => !linkedObjs.some(lo => lo.id === po.id))
    const hasLinkedContext = linkedChars.length > 0 || linkedIdeas.length > 0 || linkedLocs.length > 0 || linkedObjs.length > 0 || selectedNodeIds.length > 0
    const hasLinkActions = !isReadOnly && (
        unlinkedCharacters.length > 0 ||
        unlinkedIdeas.length > 0 ||
        unlinkedLocations.length > 0 ||
        unlinkedObjects.length > 0
    )

    async function addCharacter(characterId: string) {
        startTransition(async () => {
            await supabase.from('scene_characters').upsert({ scene_id: sceneId, character_id: characterId }, { onConflict: 'scene_id,character_id' })
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
            await supabase.from('scene_ideas').upsert({ scene_id: sceneId, idea_id: ideaId }, { onConflict: 'scene_id,idea_id' })
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
            await supabase.from('scene_locations').upsert({ scene_id: sceneId, location_id: locationId }, { onConflict: 'scene_id,location_id' })
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
            await supabase.from('scene_objects').upsert({ scene_id: sceneId, object_id: objectId }, { onConflict: 'scene_id,object_id' })
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
        <div className="flex min-w-0 flex-1 flex-col gap-2">
            {hasLinkActions && (
                <div className="relative min-w-0 h-8">
                    <div 
                        ref={actionScrollRef}
                        onMouseDown={onActionMouseDown}
                        onMouseLeave={onActionMouseLeave}
                        onMouseUp={onActionMouseUp}
                        onMouseMove={onActionMouseMove}
                        className={cn(
                            "flex items-center gap-4 overflow-x-auto no-scrollbar absolute inset-0 pr-12 [mask-image:linear-gradient(to_right,black_calc(100%-40px),transparent_100%)] overscroll-x-contain pointer-events-auto",
                            isActionDragging ? "cursor-grabbing" : "cursor-grab"
                        )}
                    >
                        <div className="flex shrink-0 items-center gap-1 text-[9px] uppercase tracking-widest text-[#546354] font-bold h-6">
                            <Plus className="w-3 h-3" />
                            <span>Link</span>
                        </div>

                        <LinkActionDropdown
                            label="+ Character"
                            items={unlinkedCharacters.map(char => ({ id: char.id, label: char.name }))}
                            isOpen={openMenu === 'character'}
                            isDisabled={isPending}
                            hoverClassName="hover:text-[#546354]"
                            onOpenChange={(open) => setOpenMenu(open ? 'character' : null)}
                            onSelect={addCharacter}
                        />

                        <LinkActionDropdown
                            label="+ Idea"
                            items={unlinkedIdeas.map(idea => ({ id: idea.id, label: idea.title }))}
                            isOpen={openMenu === 'idea'}
                            isDisabled={isPending}
                            hoverClassName="hover:text-indigo-600"
                            onOpenChange={(open) => setOpenMenu(open ? 'idea' : null)}
                            onSelect={addIdea}
                        />

                        <LinkActionDropdown
                            label="+ Location"
                            items={unlinkedLocations.map(loc => ({ id: loc.id, label: loc.name }))}
                            isOpen={openMenu === 'location'}
                            isDisabled={isPending}
                            hoverClassName="hover:text-emerald-600"
                            onOpenChange={(open) => setOpenMenu(open ? 'location' : null)}
                            onSelect={addLocation}
                        />

                        <LinkActionDropdown
                            label="+ Object"
                            items={unlinkedObjects.map(obj => ({ id: obj.id, label: obj.name }))}
                            isOpen={openMenu === 'object'}
                            isDisabled={isPending}
                            hoverClassName="hover:text-blue-600"
                            onOpenChange={(open) => setOpenMenu(open ? 'object' : null)}
                            onSelect={addObject}
                        />
                    </div>
                </div>
            )}

            <div className="flex min-w-0 items-start gap-3 pl-1">
                <div className={cn(
                    "flex shrink-0 items-center gap-2 pt-1 text-[9px] uppercase tracking-widest font-bold",
                    isMidnight ? "text-slate-500" : "text-slate-400"
                )}>
                    <span>Scene Context</span>
                    {isReadOnly && (
                        <span className={cn(
                            "rounded-full border px-2 py-0.5 text-[8px] tracking-[0.16em]",
                            isMidnight ? "border-slate-700/50 bg-slate-800/60 text-slate-500" : "border-slate-200 bg-white/80 text-slate-400"
                        )}>
                            View Only
                        </span>
                    )}
                </div>

                <div className="relative min-w-0 flex-1 h-[34px]">
                    <div 
                        ref={scrollRef}
                        onMouseDown={onMouseDown}
                        onMouseLeave={onMouseLeave}
                        onMouseUp={onMouseUp}
                        onMouseMove={onMouseMove}
                        className={cn(
                            "flex items-center gap-2 overflow-x-auto no-scrollbar absolute inset-0 pr-12 [mask-image:linear-gradient(to_right,black_calc(100%-40px),transparent_100%)] overscroll-x-contain pointer-events-auto",
                            isReadOnly
                                ? "pointer-events-none opacity-60"
                                : (isDragging ? "cursor-grabbing" : "cursor-grab")
                        )}
                    >
                {/* Linked Characters */}
                {linkedChars.map(char => {
                    const isActive = activeCharacters?.[char.id] !== false
                    return (
                        <div
                            key={char.id}
                            className={cn(
                                "flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all select-none",
                                isActive
                                    ? isMidnight
                                        ? "bg-slate-800/70 text-slate-300 border-slate-600/40"
                                        : "bg-[#546354]/10 text-[#546354] border-transparent"
                                    : isMidnight
                                        ? "bg-slate-800/30 text-slate-600 border-slate-700/30 grayscale opacity-50"
                                        : "bg-white text-slate-300 border-slate-100 grayscale opacity-60"
                            )}
                        >
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setActiveCharacters?.(prev => ({ ...prev, [char.id]: e.target.checked }))}
                                disabled={isReadOnly}
                                className="w-3.5 h-3.5 rounded-md cursor-pointer accent-[#546354]"
                            />
                            <Users className={cn("w-3 h-3", isActive ? "text-[#546354] opacity-70" : "opacity-40")} />
                            {char.name}
                            {!isReadOnly && (
                                <button onClick={() => removeCharacter(char.id)} className={cn("ml-1 transition-opacity", isMidnight ? "opacity-30 hover:opacity-80" : "opacity-40 hover:opacity-100")} disabled={isPending}>
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
                                isActive
                                    ? isMidnight
                                        ? "bg-slate-800/70 text-slate-300 border-slate-600/40"
                                        : "bg-indigo-50 text-indigo-700 border-indigo-100"
                                    : isMidnight
                                        ? "bg-slate-800/30 text-slate-600 border-slate-700/30 grayscale opacity-50"
                                        : "bg-white text-slate-300 border-slate-100 grayscale opacity-60"
                            )}
                        >
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setActiveIdeas?.(prev => ({ ...prev, [idea.id]: e.target.checked }))}
                                disabled={isReadOnly}
                                className="w-3.5 h-3.5 rounded-md cursor-pointer accent-indigo-600"
                            />
                            <IdeaIcon className={cn("w-3 h-3", isActive ? "text-indigo-500 opacity-80" : "opacity-40")} />
                            {isFeedback ? idea.title.replace(/^feedback:\s*/i, '') : idea.title}
                            {!isReadOnly && (
                                <button onClick={() => removeIdea(idea.id)} className={cn("ml-1 transition-opacity", isMidnight ? "opacity-30 hover:opacity-80" : "opacity-40 hover:opacity-100")} disabled={isPending}>
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
                                isActive
                                    ? isMidnight
                                        ? "bg-slate-800/70 text-slate-300 border-slate-600/40"
                                        : "bg-emerald-50 text-emerald-700 border-emerald-100"
                                    : isMidnight
                                        ? "bg-slate-800/30 text-slate-600 border-slate-700/30 grayscale opacity-50"
                                        : "bg-white text-slate-300 border-slate-100 grayscale opacity-60"
                            )}
                        >
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setActiveLocations?.(prev => ({ ...prev, [loc.id]: e.target.checked }))}
                                disabled={isReadOnly}
                                className="w-3.5 h-3.5 rounded-md cursor-pointer accent-emerald-600"
                            />
                            <MapPin className={cn("w-3 h-3", isActive ? "text-emerald-500 opacity-80" : "opacity-40")} />
                            {loc.name}
                            {!isReadOnly && (
                                <button onClick={() => removeLocation(loc.id)} className={cn("ml-1 transition-opacity", isMidnight ? "opacity-30 hover:opacity-80" : "opacity-40 hover:opacity-100")} disabled={isPending}>
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
                                isActive
                                    ? isMidnight
                                        ? "bg-slate-800/70 text-slate-300 border-slate-600/40"
                                        : "bg-blue-50 text-blue-700 border-blue-100"
                                    : isMidnight
                                        ? "bg-slate-800/30 text-slate-600 border-slate-700/30 grayscale opacity-50"
                                        : "bg-white text-slate-300 border-slate-100 grayscale opacity-60"
                            )}
                        >
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setActiveObjects?.(prev => ({ ...prev, [obj.id]: e.target.checked }))}
                                disabled={isReadOnly}
                                className="w-3.5 h-3.5 rounded-md cursor-pointer accent-blue-600"
                            />
                            <Package className={cn("w-3 h-3", isActive ? "text-sky-500 opacity-80" : "opacity-40")} />
                            {obj.name}
                            {!isReadOnly && (
                                <button onClick={() => removeObject(obj.id)} className={cn("ml-1 transition-opacity", isMidnight ? "opacity-30 hover:opacity-80" : "opacity-40 hover:opacity-100")} disabled={isPending}>
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    )
                })}

                {/* Selected Story Context */}
                {selectedNodeIds.map(nodeId => {
                    if (nodeId === 'virtual-root') {
                        return (
                            <div key="virtual-root" className={cn(
                                "flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border select-none animate-in fade-in slide-in-from-left-2",
                                isMidnight ? "bg-slate-800/70 text-slate-300 border-slate-600/40" : "bg-indigo-50 text-indigo-700 border-indigo-200"
                            )}>
                                <Shield className={cn("w-3 h-3", isMidnight ? "text-indigo-400 opacity-80" : "opacity-60")} />
                                Entire Project
                                {!isReadOnly && (
                                    <button
                                        onClick={() => onToggleNodeSelection?.('virtual-root')}
                                        className={cn("ml-1 transition-opacity", isMidnight ? "opacity-30 hover:opacity-80" : "opacity-40 hover:opacity-100")}
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        )
                    }
                    const node = allNodes.find(n => n.id === nodeId)
                    if (!node) return null
                    const Icon = node.type === 'scene' ? FileText : Folder

                    return (
                        <div key={nodeId} className={cn(
                            "flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border select-none",
                            isMidnight ? "bg-slate-800/70 text-slate-300 border-slate-600/40" : "bg-amber-50 text-amber-700 border-amber-200"
                        )}>
                            <Icon className={cn("w-3 h-3", isMidnight ? "text-amber-400 opacity-80" : "opacity-60")} />
                            {node.title}
                            {!isReadOnly && (
                                <button
                                    onClick={() => onToggleNodeSelection?.(nodeId)}
                                    className={cn("ml-1 transition-opacity", isMidnight ? "opacity-30 hover:opacity-80" : "opacity-40 hover:opacity-100")}
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    )
                })}

                        {!hasLinkedContext && (
                            <div className="flex min-w-0 items-center">
                                <div className={cn(
                                    "relative -top-[0.40625rem] inline-block text-[11px] italic leading-none",
                                    isMidnight ? "text-slate-600" : "text-slate-300"
                                )}>
                                    {isReadOnly
                                        ? 'Linked items can be managed by the owner or an editor'
                                        : 'No items linked to this scene'}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
