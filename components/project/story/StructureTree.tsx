'use client'

import React, { useState, useMemo } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
    ChevronRight, ChevronDown, Plus, Trash2,
    Film, Layers, FileText, BookOpen, Check, Pencil
} from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn, reorder } from '@/lib/utils'
import { GripVertical, MessageSquare } from 'lucide-react'
import type { Database, NodeType } from '@/lib/supabase/types'
import { useComments } from '@/components/project/CommentsContext'
import { useProjectActions } from '@/components/project/ProjectContext'
import { softDeleteStructureNode } from '@/lib/supabase/recovery'

type Project = Database['public']['Tables']['projects']['Row']
type StructureNode = Database['public']['Tables']['structure_nodes']['Row']
type Scene = Database['public']['Tables']['scenes']['Row']

interface StructureTreeProps {
    project: Project
    nodes: StructureNode[]
    activeNodeId: string | null
    selectedNodeIds?: string[]
    onNodeSelect: (id: string) => void
    onNodeToggleSelection?: (id: string) => void
    onNodesChange: (nodes: StructureNode[]) => void
    onSceneCreated: (scene: Scene) => void
}

const NODE_ICONS: Record<NodeType, React.ElementType> = {
    episode: Film,
    act: Layers,
    scene: FileText,
    chapter: BookOpen,
}

const CHILD_TYPE: Partial<Record<NodeType, NodeType>> = {
    episode: 'act',
    act: 'scene',
    chapter: 'scene',
}

const CHILD_LABELS: Partial<Record<NodeType, string>> = {
    episode: 'Add Act',
    act: 'Add Scene',
    chapter: 'Add Part',
}

const CHILD_DISPLAY_NAMES: Partial<Record<NodeType, string>> = {
    episode: 'Act',
    act: 'Scene',
    chapter: 'Part',
}

function buildTree(nodes: StructureNode[], parentId: string | null = null): StructureNode[] {
    return nodes
        .filter(n => n.parent_id === parentId)
        .sort((a, b) => a.order_index - b.order_index)
}

function getDescendantIds(nodes: StructureNode[], parentId: string): string[] {
    const children = nodes.filter(n => n.parent_id === parentId)
    return children.flatMap(c => [c.id, ...getDescendantIds(nodes, c.id)])
}

export default function StructureTree({
    project, nodes, activeNodeId, selectedNodeIds = [], onNodeSelect, onNodeToggleSelection, onNodesChange, onSceneCreated
}: StructureTreeProps) {
    const { role } = useProjectActions()
    const isReadOnly = role === 'viewer'
    const rootType: NodeType = project.type === 'tv_script' ? 'episode' : 'chapter'
    const rootLabel = project.type === 'tv_script' ? 'Episode' : 'Chapter'
    const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

    async function addRootNode() {
        const supabase = createClient()
        const rootNodes = nodes.filter(n => n.parent_id === null)
        const { data } = await (supabase as any).from('structure_nodes').insert({
            project_id: project.id,
            type: rootType,
            title: `${rootLabel} ${rootNodes.length + 1}`,
            order_index: rootNodes.length,
        }).select().single()
        if (data) onNodesChange([...nodes, data as any])
    }

    async function addChild(parent: StructureNode) {
        const childType = CHILD_TYPE[parent.type as keyof typeof CHILD_TYPE]
        if (!childType) return
        const supabase = createClient()
        const siblings = nodes.filter(n => n.parent_id === parent.id)
        const { data: newNode, error } = await (supabase as any).from('structure_nodes').insert({
            project_id: project.id,
            parent_id: parent.id,
            type: childType,
            title: `${CHILD_DISPLAY_NAMES[parent.type as keyof typeof CHILD_DISPLAY_NAMES] ?? childType.charAt(0).toUpperCase() + childType.slice(1)} ${siblings.length + 1}`,
            order_index: siblings.length,
        }).select().single()

        if (error || !newNode) return
        const updatedNodes = [...nodes, newNode]
        onNodesChange(updatedNodes)

        if (childType === 'scene') {
            const { data: scene } = await (supabase as any).from('scenes').insert({
                node_id: (newNode as any).id,
                project_id: project.id,
                writing_mode: project.writing_mode ?? 'simple',
            }).select().single()
            if (scene) {
                onSceneCreated(scene as any)
                onNodeSelect((newNode as any).id)
            }
        }
    }

    async function deleteNode(node: StructureNode) {
        const supabase = createClient()
        try {
            const idsToRemove = await softDeleteStructureNode(supabase, project.id, node.id, nodes)
            onNodesChange(nodes.filter(n => !idsToRemove.includes(n.id)))
            if (activeNodeId && (activeNodeId === node.id || idsToRemove.includes(activeNodeId))) {
                const firstScene = nodes.find(n => n.type === 'scene' && !idsToRemove.includes(n.id))
                onNodeSelect(firstScene?.id ?? '')
            }
        } catch (error) {
            console.error('Error soft deleting node:', error)
        }
        setConfirmingDeleteId(null)
    }

    async function renameNode(node: StructureNode, title: string) {
        const supabase = createClient()
        await (supabase as any).from('structure_nodes').update({ title }).eq('id', node.id)
        onNodesChange(nodes.map(n => n.id === node.id ? { ...n, title } : n))
    }

    async function handleReorder(result: DropResult) {
        if (!result.destination || isReadOnly) return

        const sourceParentId = result.source.droppableId === 'root' ? null : result.source.droppableId
        const destParentId = result.destination.droppableId === 'root' ? null : result.destination.droppableId

        // For now, only support reordering within the same parent
        if (sourceParentId !== destParentId) return 

        const siblings = nodes.filter(n => n.parent_id === sourceParentId).sort((a, b) => a.order_index - b.order_index)
        const newSiblings = reorder(siblings, result.source.index, result.destination.index)
        
        // Update all nodes in the state
        const updatedNodes = nodes.map(n => {
            const newIndex = newSiblings.findIndex(sib => sib.id === n.id)
            if (newIndex !== -1) {
                return { ...n, order_index: newIndex }
            }
            return n
        })
        
        onNodesChange(updatedNodes)

        // Update Supabase
        const supabase = createClient()
        const { error } = await (supabase as any)
            .from('structure_nodes')
            .upsert(newSiblings.map((n, i) => ({ ...n, order_index: i })))
        
        if (error) {
            console.error('Error reordering nodes:', error)
            onNodesChange(nodes) // Rollback
        }
    }

    const rootNodes = useMemo(() => buildTree(nodes, null), [nodes])

    return (
        <TooltipProvider>
            <div className="flex flex-col h-full bg-transparent">
                <div className="px-4 sm:px-6 pt-2 pb-4 sm:py-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-serif italic text-slate-500 tracking-wide">The Structure</h3>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-2">
                    {rootNodes.length === 0 ? (
                        <div className="text-center py-16 px-6">
                            <p className="text-sm text-slate-400 mb-6 font-serif italic">
                                Start your story by creating your first {rootLabel.toLowerCase()}.
                            </p>
                            <Button
                                onClick={addRootNode}
                                className="bg-white hover:bg-slate-50 text-[#546354] border border-[#546354]/10 shadow-sm transition-all duration-300 rounded-xl px-6"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                + Create {rootLabel}
                            </Button>
                        </div>
                    ) : (
                        <DragDropContext onDragEnd={handleReorder}>
                            <Droppable droppableId="root" isDropDisabled={isReadOnly}>
                                {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef}>
                                        {rootNodes.map((node, index) => (
                                            <NodeItem
                                                key={node.id}
                                                node={node}
                                                nodes={nodes}
                                                index={index}
                                                activeNodeId={activeNodeId}
                                                depth={0}
                                                onSelect={onNodeSelect}
                                                onToggleSelection={onNodeToggleSelection}
                                                selectedNodeIds={selectedNodeIds}
                                                onAddChild={addChild}
                                                onDelete={deleteNode}
                                                onRename={renameNode}
                                                confirmingDeleteId={confirmingDeleteId}
                                                onRequestDelete={setConfirmingDeleteId}
                                            />
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    )}
                </div>

                {!isReadOnly && (
                    <div className="p-4 mt-auto">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={addRootNode}
                            className="w-full justify-start text-slate-400 hover:text-[#546354] hover:bg-white/50 text-[10px] uppercase tracking-widest gap-2 px-3 h-10 rounded-xl"
                        >
                            <Plus className="w-3.5 h-3.5" /> Add {rootLabel}
                        </Button>
                    </div>
                )}
            </div>
        </TooltipProvider>
    )
}

interface NodeItemProps {
    node: StructureNode
    nodes: StructureNode[]
    index: number
    activeNodeId: string | null
    selectedNodeIds?: string[]
    depth: number
    onSelect: (id: string) => void
    onToggleSelection?: (id: string) => void
    onAddChild: (n: StructureNode) => void
    onDelete: (n: StructureNode) => void
    onRename: (n: StructureNode, title: string) => void
    confirmingDeleteId: string | null
    onRequestDelete: (id: string | null) => void
}

const NodeItem = React.memo(({
    node, nodes, index, activeNodeId, selectedNodeIds = [], depth, onSelect, onToggleSelection, onAddChild, onDelete, onRename, confirmingDeleteId, onRequestDelete
}: NodeItemProps) => {
    const { role } = useProjectActions()
    const isReadOnly = role === 'viewer'
    const [expanded, setExpanded] = useState(true)
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(node.title)
    const [mobileOptionsActive, setMobileOptionsActive] = useState(false)
    const touchStartTimer = React.useRef<NodeJS.Timeout | null>(null)
    const autoHideTimer = React.useRef<NodeJS.Timeout | null>(null)

    const handleTouchStart = () => {
        if (isReadOnly) return
        touchStartTimer.current = setTimeout(() => {
            setMobileOptionsActive(true)
            if (autoHideTimer.current) clearTimeout(autoHideTimer.current)
            autoHideTimer.current = setTimeout(() => setMobileOptionsActive(false), 10000)
        }, 600)
    }

    const handleTouchEnd = () => {
        if (touchStartTimer.current) {
            clearTimeout(touchStartTimer.current)
            touchStartTimer.current = null
        }
    }

    const handleTouchMove = () => {
        if (touchStartTimer.current) {
            clearTimeout(touchStartTimer.current)
            touchStartTimer.current = null
        }
    }

    const children = useMemo(() => buildTree(nodes, node.id), [nodes, node.id])
    const Icon = NODE_ICONS[node.type as NodeType] ?? FileText
    const isScene = node.type === 'scene'
    const isAct = node.type === 'act'
    const isRoot = node.type === 'episode' || node.type === 'chapter'
    const isActive = isScene && activeNodeId === node.id
    const isSelected = selectedNodeIds.includes(node.id)

    const { comments } = useComments()
    const openCommentCount = useMemo(() => {
        return comments.filter(c => c.node_id === node.id && c.status === 'open' && !c.parent_id).length
    }, [comments, node.id])

    function handleClick(e: React.MouseEvent) {
        e.stopPropagation()
        if (isScene) onSelect(node.id)
        else setExpanded(e => !e)
    }

    function finishRename() {
        if (draft.trim() && draft !== node.title) onRename(node, draft.trim())
        else setDraft(node.title)
        setEditing(false)
    }

    return (
        <Draggable draggableId={node.id} index={index}>
            {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.draggableProps}>
                    <div
                        className={cn(
                            'group flex items-center gap-2 py-3 px-3 sm:px-4 mx-2 sm:mx-3 rounded-2xl cursor-pointer transition-all duration-300 text-sm mb-1 relative border border-transparent',
                            isActive
                                ? 'bg-white text-[#546354] shadow-[0_8px_24px_rgba(0,0,0,0.06)] font-bold border-[#546354]/10 z-10'
                                : 'text-slate-500 hover:bg-white/60',
                            isRoot && 'font-serif italic text-base py-3 sm:py-4 bg-white/30 backdrop-blur-sm border-white/40 mb-2 mt-2 shadow-[0_2px_8px_rgba(0,0,0,0.02)]',
                            isAct && 'font-semibold text-slate-700 py-2 sm:py-2.5',
                            isScene && 'text-slate-500 py-1.5 sm:py-2',
                            isSelected && 'bg-indigo-50/40 border-indigo-200/50',
                            snapshot.isDragging && 'shadow-2xl z-50 bg-white ring-2 ring-[#546354]/10'
                        )}
                        style={{ paddingLeft: `${depth * 24 + (isScene ? 12 : 0)}px` }}
                        onClick={handleClick}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                        onTouchMove={handleTouchMove}
                    >
                        {isActive && (
                            <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#546354] rounded-full shadow-[0_0_12px_rgba(84,99,84,0.3)]" />
                        )}

                        {!isReadOnly && (
                            <div 
                                {...provided.dragHandleProps}
                                className={cn(
                                    "p-1 -ml-1 opacity-0 transition-opacity cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-400 shrink-0",
                                    "group-hover:opacity-100",
                                    isActive && "opacity-100"
                                )}
                            >
                                <GripVertical className="w-3.5 h-3.5" />
                            </div>
                        )}

                        {openCommentCount > 0 && (
                            <div className="flex items-center justify-center bg-[#546354]/10 text-[#546354] rounded-full min-w-[18px] h-[18px] px-1 shadow-sm border border-[#546354]/10 shrink-0">
                                <span className="text-[9px] font-bold">{openCommentCount}</span>
                            </div>
                        )}

                        {!isScene && (
                            <span className="text-slate-400 group-hover:text-[#546354] transition-colors shrink-0">
                                {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </span>
                        )}
                        {isScene && <div className="w-4 shrink-0" />}

                        {onToggleSelection && (
                            <div 
                                className={cn(
                                    "w-4 h-4 border-2 rounded-md flex items-center justify-center transition-all duration-200",
                                    isSelected 
                                        ? "bg-indigo-500 border-indigo-500" 
                                        : "border-slate-300 group-hover:border-slate-400"
                                )}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onToggleSelection(node.id)
                                }}
                            >
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                        )}

                        <Icon className={cn(
                            'shrink-0 transition-transform duration-300',
                            isRoot ? 'w-5 h-5 text-[#546354]/80' : 'w-4 h-4',
                            isActive ? 'text-[#546354] scale-110' : 'text-slate-400',
                            isAct && 'text-slate-500'
                        )} />

                        {editing ? (
                            <input
                                value={draft}
                                onChange={e => setDraft(e.target.value)}
                                onBlur={finishRename}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') finishRename()
                                    if (e.key === 'Escape') { setDraft(node.title); setEditing(false) }
                                }}
                                onClick={e => e.stopPropagation()}
                                className="flex-1 bg-white border border-[#546354]/20 rounded-xl px-3 text-xs outline-none h-8 font-serif italic shadow-inner"
                                autoFocus
                            />
                        ) : (
                            <span
                                className={cn(
                                    "flex-1 truncate",
                                    isRoot && "tracking-tight text-[#485748]",
                                    isScene && "text-slate-600 font-medium",
                                    mobileOptionsActive && "hidden md:block"
                                )}
                                onDoubleClick={isReadOnly ? undefined : (e) => { e.stopPropagation(); setEditing(true) }}
                            >
                                {node.title}
                            </span>
                        )}



                        {/* Confirm delete — always visible when active, outside hover conditional */}
                        {confirmingDeleteId === node.id && !editing && (
                            <div className="flex items-center gap-1 shrink-0 animate-in fade-in duration-150" onClick={e => e.stopPropagation()}>
                                <button
                                    className="px-2 py-1 text-[9px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider rounded"
                                >Cancel</button>
                                <button
                                    onClick={e => { e.stopPropagation(); onDelete(node) }}
                                    className="px-2 py-1 text-[9px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded uppercase tracking-wider transition-colors"
                                >Trash</button>
                            </div>
                        )}

                        {/* Hover/Long Press actions — only when not confirming */}
                        {(!editing && !isReadOnly && confirmingDeleteId !== node.id) && (
                            <div className={cn(
                                "flex items-center gap-1 shrink-0 transition-all duration-300",
                                // On desktop: hide unless hover or active (active only if it's a scene)
                                "opacity-0 md:group-hover:opacity-100",
                                isActive && "md:opacity-100",
                                // On mobile: only show if long-pressed
                                mobileOptionsActive ? "opacity-100 flex-1 justify-end" : "w-0 overflow-hidden pointer-events-none md:w-auto md:overflow-visible md:pointer-events-auto"
                            )} onClick={e => e.stopPropagation()}>
                                {CHILD_TYPE[node.type as NodeType] && (
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <button
                                                onClick={() => onAddChild(node)}
                                                className="p-2 rounded-lg hover:bg-primary/10 text-slate-400 hover:text-primary active:scale-95 transition-all"
                                            >
                                                <Plus className="w-4 h-4 md:w-3.5 md:h-3.5" />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">{CHILD_LABELS[node.type as NodeType]}</TooltipContent>
                                    </Tooltip>
                                )}
                                <Tooltip>
                                    <TooltipTrigger>
                                        <button
                                            onClick={e => { e.stopPropagation(); setEditing(true) }}
                                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 active:scale-95 transition-all"
                                        >
                                            <Pencil className="w-4 h-4 md:w-3.5 md:h-3.5" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Rename</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <button
                                            onClick={e => { e.stopPropagation(); onRequestDelete(node.id) }}
                                            className="p-2 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 active:scale-95 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Move to Trash</TooltipContent>
                                </Tooltip>
                            </div>
                        )}
                    </div>

                    {!isScene && expanded && (
                        <Droppable droppableId={node.id} isDropDisabled={isReadOnly}>
                            {(provided) => (
                                <div 
                                    className="fade-in"
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                >
                                    {children.map((child, index) => (
                                        <NodeItem
                                            key={child.id}
                                            node={child}
                                            nodes={nodes}
                                            index={index}
                                            activeNodeId={activeNodeId}
                                            selectedNodeIds={selectedNodeIds}
                                            depth={depth + 1}
                                            onSelect={onSelect}
                                            onToggleSelection={onToggleSelection}
                                            onAddChild={onAddChild}
                                            onDelete={onDelete}
                                            onRename={onRename}
                                            confirmingDeleteId={confirmingDeleteId}
                                            onRequestDelete={onRequestDelete}
                                        />
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    )}
                </div>
            )}
        </Draggable>
    )
}, (prev, next) => {
    // Re-render if:
    // 1. The specific node data changed (title, etc)
    // 2. The global active status changed (need to propagate this down the tree)
    // 3. Selection state changed
    // 4. Global nodes list changed (new children)
    // 5. Delete confirmation state changed
    if (prev.activeNodeId !== next.activeNodeId) return false;
    if (prev.selectedNodeIds !== next.selectedNodeIds) return false;
    if (prev.node !== next.node) return false;
    if (prev.nodes !== next.nodes) return false;
    if (prev.depth !== next.depth) return false;
    if (prev.confirmingDeleteId !== next.confirmingDeleteId) return false;

    return true;
});
