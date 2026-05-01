'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Button } from '@/components/ui/button'
import {
    ChevronRight, ChevronDown, Plus, Trash2,
    Film, Layers, FileText, BookOpen, Check, Pencil,
    Book, Clapperboard, Shield, X
} from 'lucide-react'
import {
    TooltipProvider,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn, reorder } from '@/lib/utils'
import { GripVertical } from 'lucide-react'
import type { Database, NodeType, WritingMode } from '@/lib/supabase/types'
import { useProjectActions } from '@/components/project/ProjectContext'
import {
    createSceneForNode,
    createStructureNode,
    renameStructureNode,
    reorderStructureNodes,
    softDeleteStructureTree,
} from '@/lib/persistence/structure'

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
    onClose?: () => void
}

const NODE_ICONS: Record<string, React.ElementType> = {
    episode: Film,
    act: Layers,
    scene: FileText,
    chapter: BookOpen,
    root_novel: Book,
    root_tv: Clapperboard,
}

const CHILD_TYPE: Partial<Record<NodeType, NodeType>> = {
    episode: 'act',
    act: 'scene',
    chapter: 'scene',
}

const CHILD_DISPLAY_NAMES: Partial<Record<NodeType, string>> = {
    episode: 'Act',
    act: 'Scene',
    chapter: 'Scene',
}

const NODE_DISPLAY_NAMES: Record<string, string> = {
    episode: 'Episode',
    act: 'Act',
    scene: 'Scene',
    chapter: 'Chapter',
}

function buildTree(nodes: StructureNode[], parentId: string | null = null): StructureNode[] {
    return nodes
        .filter(n => n.parent_id === parentId)
        .sort((a, b) => a.order_index - b.order_index)
}

function truncateLongWords(value: string, maxWordLength = 18) {
    return value
        .split(/(\s+)/)
        .map((part) => {
            if (!part.trim()) return part
            return part.length > maxWordLength
                ? `${part.slice(0, maxWordLength - 1)}…`
                : part
        })
        .join('')
}

export default function StructureTree({
    project, nodes, activeNodeId, selectedNodeIds = [], onNodeSelect, onNodeToggleSelection, onNodesChange, onSceneCreated, onClose
}: StructureTreeProps) {
    const { role } = useProjectActions()
    const isReadOnly = role === 'viewer'
    const rootType: NodeType = project.type === 'tv_script' ? 'episode' : 'chapter'
    const rootLabel = project.type === 'tv_script' ? 'Episode' : 'Chapter'
    const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
    const [dragState, setDragState] = useState<{
        draggingId: string | null;
        overId: string | null;
        overIndex: number | null;
        neighborIds: string[];
    }>({ draggingId: null, overId: null, overIndex: null, neighborIds: [] });
    const [indentStep, setIndentStep] = useState(20)

    useEffect(() => {
        const updateIndentStep = () => {
            setIndentStep(window.innerWidth < 1024 ? 16 : 20)
        }

        updateIndentStep()
        window.addEventListener('resize', updateIndentStep)

        return () => {
            window.removeEventListener('resize', updateIndentStep)
        }
    }, [])

    const getNeighbors = (overId: string | null, overIndex: number | null, draggingId: string | null) => {
        if (!overId || overIndex === null || !draggingId) return [];
        const parentId = overId === 'root' ? null : overId;
        const siblings = nodes.filter(n => n.parent_id === parentId).sort((a, b) => a.order_index - b.order_index);
        const filtered = siblings.filter(n => n.id !== draggingId);
        const res = [];
        if (overIndex > 0 && filtered[overIndex - 1]) res.push(filtered[overIndex - 1].id);
        if (filtered[overIndex]) res.push(filtered[overIndex].id);
        
        // Safety: ensure draggingId is not in res
        return res.filter(id => id !== draggingId);
    };

    async function addRootNode() {
        const rootNodes = nodes.filter(n => n.parent_id === null)
        const siblingsOfType = rootNodes.filter(n => n.type === rootType)
        const data = await createStructureNode({
            projectId: project.id,
            type: rootType,
            title: `${rootLabel} ${siblingsOfType.length + 1}`,
            orderIndex: rootNodes.length,
        })
        if (data) onNodesChange([...nodes, data])
    }

    async function addChild(parent: StructureNode) {
        const childType = CHILD_TYPE[parent.type as keyof typeof CHILD_TYPE]
        if (!childType) return
        const siblings = nodes.filter(n => n.parent_id === parent.id)
        const siblingsOfType = siblings.filter(n => n.type === childType)
        const newNode = await createStructureNode({
            projectId: project.id,
            parentId: parent.id,
            type: childType,
            title: `${CHILD_DISPLAY_NAMES[parent.type as keyof typeof CHILD_DISPLAY_NAMES] ?? childType.charAt(0).toUpperCase() + childType.slice(1)} ${siblingsOfType.length + 1}`,
            orderIndex: siblings.length,
        })
        const updatedNodes = [...nodes, newNode]
        onNodesChange(updatedNodes)

        if (childType === 'scene') {
            const scene = await createSceneForNode(project.id, newNode.id, (project.writing_mode ?? 'simple') as WritingMode)
            if (scene) {
                onSceneCreated(scene)
                onNodeSelect(newNode.id)
            }
        }
    }

    async function deleteNode(node: StructureNode) {
        try {
            const idsToRemove = await softDeleteStructureTree(project.id, node.id, nodes)
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
        await renameStructureNode(node.id, title)
        onNodesChange(nodes.map(n => n.id === node.id ? { ...n, title } : n))
    }

    async function handleReorder(result: DropResult) {
        setDragState({ draggingId: null, overId: null, overIndex: null, neighborIds: [] });
        // Force selection of the dragged node after the reorder
        onNodeSelect(result.draggableId);
        
        if (!result.destination || isReadOnly) return;

        const sourceParentId = result.source.droppableId === 'root' ? null : result.source.droppableId
        const destParentId = result.destination.droppableId === 'root' ? null : result.destination.droppableId

        const draggedNodeId = result.draggableId
        const draggedNode = nodes.find(n => n.id === draggedNodeId)
        if (!draggedNode) return

        // Type Validation
        if (destParentId === null) {
            // Can only drop root-level types (Episode/Chapter) at the root
            if (draggedNode.type !== rootType) return
        } else {
            const destParentNode = nodes.find(n => n.id === destParentId)
            if (!destParentNode) return
            const allowedChildType = CHILD_TYPE[destParentNode.type as NodeType]
            if (draggedNode.type !== allowedChildType) return
        }

        // Support cross-parent reordering
        if (sourceParentId === destParentId) {
            const siblings = nodes.filter(n => n.parent_id === sourceParentId).sort((a, b) => a.order_index - b.order_index)
            const newSiblings = reorder(siblings, result.source.index, result.destination.index)
            
            const updatedNodes = nodes.map(n => {
                const newIndex = newSiblings.findIndex(sib => sib.id === n.id)
                if (newIndex !== -1) return { ...n, order_index: newIndex }
                return n
            })
            
            onNodesChange(updatedNodes)
            try {
                await reorderStructureNodes(newSiblings.map((n, i) => ({ ...n, order_index: i })))
            } catch (error) {
                console.error('Error reordering nodes:', error)
                onNodesChange(nodes)
            }
        } else {
            // Cross-parent move
            const draggedNodeId = result.draggableId
            const draggedNode = nodes.find(n => n.id === draggedNodeId)
            if (!draggedNode) return

            // 1. Prepare siblings in both lists
            const sourceSiblings = nodes.filter(n => n.parent_id === sourceParentId && n.id !== draggedNodeId).sort((a, b) => a.order_index - b.order_index)
            const destSiblings = nodes.filter(n => n.parent_id === destParentId).sort((a, b) => a.order_index - b.order_index)
            
            // 2. Insert into destination
            const newDestSiblings = [...destSiblings]
            newDestSiblings.splice(result.destination.index, 0, { ...draggedNode, parent_id: destParentId })

            // 3. Re-index both
            const finalSourceSiblings = sourceSiblings.map((n, i) => ({ ...n, order_index: i }))
            const finalDestSiblings = newDestSiblings.map((n, i) => ({ ...n, order_index: i }))

            // 4. Update state
            const updatedNodes = nodes.map(n => {
                const inSource = finalSourceSiblings.find(s => s.id === n.id)
                if (inSource) return inSource
                const inDest = finalDestSiblings.find(s => s.id === n.id)
                if (inDest) return inDest
                return n
            })

            onNodesChange(updatedNodes)

            // 5. Update Supabase
            try {
                // Update parent_id and order_index for dragged node
                // Update order_index for all siblings
                const allUpdates = [...finalSourceSiblings, ...finalDestSiblings]
                await reorderStructureNodes(allUpdates)
            } catch (error) {
                console.error('Error cross-parent reordering:', error)
                onNodesChange(nodes)
            }
        }
    }

    const rootNodes = useMemo(() => buildTree(nodes, null), [nodes])

    return (
        <TooltipProvider>
            <div className="structure-tree-panel flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
                <div className="px-4 sm:px-6 pt-2 pb-4 sm:py-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-serif italic text-[#8a8c84] tracking-wide">The Structure</h3>
                    </div>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-[#a8a9a2] transition-all hover:bg-[#e8e7e0] hover:text-[#5e605b]"
                            aria-label="Close structure panel"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <div className="flex-1 min-h-0 overflow-auto overscroll-contain touch-pan-y py-2 custom-scrollbar">
                    <div className="min-h-full flex flex-col">
                        <div className="flex-grow">
                            {/* Virtual Root Node */}
                            <div
                                className={cn(
                                    'group flex items-center gap-2 py-4 px-3 sm:px-4 mx-2 sm:mx-3 rounded-2xl cursor-pointer transition-all duration-300 text-sm mb-4 relative border shadow-sm',
                                    selectedNodeIds.includes('virtual-root')
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-bold'
                                        : 'bg-[#edecea]/60 border-[#ccc9c0]/40 text-[#5e605b] hover:bg-[#e8e7e0] hover:border-[#bbb8af]'
                                )}
                                onClick={() => onNodeSelect('virtual-root')}
                            >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div 
                                        className={cn(
                                            "w-4 h-4 border-2 rounded-md flex items-center justify-center transition-all duration-200 shrink-0",
                                            selectedNodeIds.includes('virtual-root') 
                                                ? "bg-indigo-500 border-indigo-500" 
                                                : "border-slate-300 group-hover:border-slate-400"
                                        )}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onNodeToggleSelection?.('virtual-root')
                                        }}
                                    >
                                        {selectedNodeIds.includes('virtual-root') && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    {project.type === 'tv_script' ? <Clapperboard className="w-5 h-5 text-indigo-500/80" /> : <Book className="w-5 h-5 text-indigo-500/80" />}
                                    <span className="truncate uppercase tracking-wider text-[11px] font-black whitespace-nowrap">
                                        {project.title}
                                    </span>
                                </div>
                                {!isReadOnly && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            addRootNode()
                                        }}
                                        className={cn(
                                            "p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 hover:bg-indigo-100/50 text-slate-400 hover:text-indigo-600",
                                            selectedNodeIds.includes('virtual-root') && "opacity-100 text-indigo-500"
                                        )}
                                        title={`Add ${rootLabel}`}
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                )}
                                <Shield className="w-3.5 h-3.5 text-slate-300 ml-1" />
                            </div>

                            {rootNodes.length === 0 ? (
                                <div className="text-center py-16 px-6">
                                    <p className="text-sm text-slate-400 mb-6 font-serif italic">
                                        Start your story by creating your first {rootLabel.toLowerCase()}.
                                    </p>
                                    <Button
                                        onClick={addRootNode}
                                        className="bg-[#fbf9f5] hover:bg-[#f5f4ef] text-[#546354] border border-[#546354]/15 shadow-sm transition-all duration-300 rounded-xl px-6"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        + Create {rootLabel}
                                    </Button>
                                </div>
                            ) : (
                                <DragDropContext 
                                    onDragStart={(start) => {
                                        setDragState({ draggingId: start.draggableId, overId: null, overIndex: null, neighborIds: [] });
                                    }}
                                    onDragUpdate={(update) => {
                                        const overId = update.destination?.droppableId ?? null;
                                        const overIndex = update.destination?.index ?? null;
                                        setDragState(prev => ({ 
                                            ...prev, 
                                            overId,
                                            overIndex,
                                            neighborIds: getNeighbors(overId, overIndex, prev.draggingId)
                                        }));
                                    }}
                                    onDragEnd={(result) => {
                                        handleReorder(result);
                                    }}
                                >
                                    <Droppable 
                                        droppableId="root" 
                                        isDropDisabled={isReadOnly || (dragState.draggingId ? nodes.find(n => n.id === dragState.draggingId)?.type === 'scene' : false)}
                                    >
                                        {(provided, snapshot) => (
                                            <div 
                                                {...provided.droppableProps} 
                                                ref={provided.innerRef}
                                                className={cn(
                                                    "min-h-[100px] transition-colors duration-200 rounded-3xl",
                                                    snapshot.isDraggingOver && "bg-[#546354]/5 ring-2 ring-inset ring-[#546354]/10"
                                                )}
                                            >
                                                {rootNodes.map((node, index) => (
                                                    <NodeItem
                                                        key={node.id}
                                                        node={node}
                                                        nodes={nodes}
                                                        projectType={project.type}
                                                        index={index}
                                                        activeNodeId={activeNodeId}
                                                        depth={0}
                                                        indentStep={indentStep}
                                                        dragState={dragState}
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

                        {!isReadOnly && rootNodes.length > 0 && (
                            <div className="px-4 pt-8 pb-16">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={addRootNode}
                                    className="w-full justify-start text-[#a8a9a2] hover:text-[#546354] hover:bg-[#f5f4ef] text-[10px] uppercase tracking-widest gap-2 px-3 h-10 rounded-xl"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add {rootLabel}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </TooltipProvider>
    )
}

interface NodeItemProps {
    node: StructureNode
    nodes: StructureNode[]
    projectType: Project['type']
    index: number
    activeNodeId: string | null
    selectedNodeIds?: string[]
    depth: number
    indentStep: number
    onSelect: (id: string) => void
    onToggleSelection?: (id: string) => void
    onAddChild: (n: StructureNode) => void
    onDelete: (n: StructureNode) => void
    onRename: (n: StructureNode, title: string) => void
    confirmingDeleteId: string | null
    onRequestDelete: (id: string | null) => void
    dragState?: { draggingId: string | null; overId: string | null; overIndex: number | null; neighborIds: string[] }
}

const NodeItem = React.memo(({
    node, nodes, projectType, index, activeNodeId, selectedNodeIds = [], depth, indentStep, dragState, onSelect, onToggleSelection, onAddChild, onDelete, onRename, confirmingDeleteId, onRequestDelete
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
    const isActive = activeNodeId === node.id
    const isSelected = selectedNodeIds.includes(node.id)
    const displayTitle = useMemo(() => truncateLongWords(node.title), [node.title])

    function handleClick(e: React.MouseEvent) {
        e.stopPropagation()
        onSelect(node.id)
        if (!isScene) setExpanded(e => !e)
    }

    function finishRename() {
        if (draft.trim() && draft !== node.title) onRename(node, draft.trim())
        else setDraft(node.title)
        setEditing(false)
    }

    const isDragDisabled = isReadOnly || editing || confirmingDeleteId === node.id
    const isBeingDragged = dragState?.draggingId === node.id
    const isAdjacentToDrop = useMemo(() => {
        return dragState?.neighborIds?.includes(node.id) ?? false
    }, [dragState?.neighborIds, node.id])

    const itemContent = (provided: any, snapshot: any) => (
        <div 
            ref={provided.innerRef} 
            {...provided.draggableProps} 
            className={cn("group", snapshot.isDragging && "z-[9999]")}
        >
            <div
                className={cn(
                    'flex min-w-0 items-center gap-1.5 py-3 px-2 sm:px-3 mx-1 sm:mx-2 rounded-2xl cursor-pointer transition-all duration-300 text-sm mb-1 relative border border-transparent',
                    isActive
                        ? 'bg-[#fbf9f5] text-[#546354] shadow-[0_6px_20px_rgba(49,51,47,0.06)] font-bold border-[#546354]/10 z-10'
                        : 'text-[#7a7c76] hover:bg-[#f0efe9]/70',
                    isRoot && 'font-serif italic text-base py-3 sm:py-4 bg-[#edecea]/40 border-[#ccc9c0]/30 mb-2 mt-2 shadow-[0_2px_8px_rgba(49,51,47,0.03)]',
                    isAct && 'font-semibold text-[#5e605b] py-2 sm:py-2.5',
                    isScene && 'items-center text-[#7a7c76] py-1.5',
                    isSelected && 'bg-indigo-50/40 border-indigo-200/50',
                    snapshot.isDragging && 'shadow-2xl bg-[#fbf9f5] ring-2 ring-[#546354]/10 border-[#ccc9c0] opacity-100 !transform-none cursor-grabbing',
                    (!snapshot.isDragging && isAdjacentToDrop) && 'bg-indigo-50/80 border-indigo-400 shadow-[0_0_25px_rgba(99,102,241,0.25)] ring-2 ring-indigo-500/20 z-20'
                )}
                style={{ 
                    paddingLeft: `${depth * indentStep + (isScene ? 8 : 0)}px`,
                    // Fix for portal displacement: when portaling, we need to ensure the width is maintained
                    ...(snapshot.isDragging ? { width: '280px' } : {})
                }}
                onClick={handleClick}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
            >
                {isActive && (
                    <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#546354] rounded-full shadow-[0_0_12px_rgba(84,99,84,0.3)]" />
                )}

                <button
                    type="button"
                    {...(!isDragDisabled ? provided.dragHandleProps : {})}
                    className={cn(
                        "shrink-0 rounded-md p-1 -ml-1 text-[#b0b1aa] transition-all hover:text-[#7a7c76] hover:bg-[#e8e7e0]",
                        isScene && "mt-0.5 self-start",
                        isDragDisabled
                            ? "cursor-default opacity-0 pointer-events-none"
                            : "cursor-grab active:cursor-grabbing",
                        isActive && !isDragDisabled && "opacity-100",
                        !isActive && !isDragDisabled && "opacity-0 group-hover:opacity-60",
                        snapshot.isDragging && "opacity-100 text-white bg-[#546354] shadow-xl scale-125 ring-4 ring-[#546354]/10"
                    )}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={isDragDisabled ? undefined : `Drag ${node.title}`}
                    tabIndex={isDragDisabled ? -1 : 0}
                >
                    <GripVertical className="w-3.5 h-3.5" />
                </button>

                        {!isScene && (
                            <span className="text-slate-400 group-hover:text-[#546354] transition-colors shrink-0">
                                {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </span>
                        )}
                        {isScene && <div className="mt-1 w-4 shrink-0 self-start" />}

                        {onToggleSelection && (
                            <div 
                                className={cn(
                                    "w-4 h-4 min-w-4 min-h-4 shrink-0 border-2 rounded-md flex items-center justify-center transition-all duration-200",
                                    isScene && "mt-1 self-start",
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
                            isScene && 'mt-1 self-start',
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
                                className="min-w-0 flex-1 bg-white border border-[#546354]/20 rounded-xl px-3 text-xs outline-none h-8 font-serif italic shadow-inner"
                                autoFocus
                            />
                        ) : (
                            <span
                                className={cn(
                                    "min-w-0 flex-1 truncate whitespace-nowrap overflow-hidden text-ellipsis",
                                    isRoot && "font-serif not-italic text-[#31332f]",
                                    isScene && "text-[#5e605b] font-medium",
                                    mobileOptionsActive && "hidden md:block"
                                )}
                                title={node.title}
                                onDoubleClick={isReadOnly ? undefined : (e) => { e.stopPropagation(); setEditing(true) }}
                            >
                                {displayTitle}
                            </span>
                        )}



                        {/* Confirm delete — always visible when active, outside hover conditional */}
                        {false && confirmingDeleteId === node.id && !editing && (
                            <div className="ml-auto flex items-center gap-1 shrink-0 self-start animate-in fade-in duration-150" onClick={e => e.stopPropagation()}>
                                <button
                                    onClick={e => { e.stopPropagation(); onRequestDelete(null) }}
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
                                "ml-auto flex items-center gap-1 shrink-0 self-start transition-all duration-200",
                                "opacity-0 pointer-events-none md:w-auto md:overflow-visible",
                                isActive && "opacity-100 pointer-events-auto",
                                mobileOptionsActive ? "opacity-100 pointer-events-auto flex-1 justify-end" : "w-0 md:w-auto overflow-hidden md:overflow-visible"
                            )} onClick={e => e.stopPropagation()}>
                                {CHILD_TYPE[node.type as NodeType] && (
                                    <button
                                        onClick={() => onAddChild(node)}
                                        className="p-2 rounded-lg hover:bg-primary/10 text-slate-400 hover:text-primary active:scale-95 transition-all"
                                    >
                                        <Plus className="w-4 h-4 md:w-3.5 md:h-3.5" />
                                    </button>
                                )}
                                <button
                                    onClick={e => { e.stopPropagation(); setEditing(true) }}
                                    className="p-2 rounded-lg hover:bg-[#e8e7e0] text-[#a8a9a2] hover:text-[#5e605b] active:scale-95 transition-all"
                                >
                                    <Pencil className="w-4 h-4 md:w-3.5 md:h-3.5" />
                                </button>
                                <button
                                    onClick={e => { e.stopPropagation(); onRequestDelete(node.id) }}
                                    className="p-2 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 active:scale-95 transition-all"
                                >
                                    <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
                                </button>
                            </div>
                        )}
                    </div>

                    {false && (!editing && !isReadOnly && confirmingDeleteId !== node.id) && (
                        <div
                            className={cn(
                                "mx-2 mb-1 mt-1 sm:mx-3",
                                mobileOptionsActive ? "block" : "hidden md:block"
                            )}
                            style={{
                                paddingLeft: `${depth * 24 + (isScene ? 40 : 20)}px`,
                                paddingRight: '12px',
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div
                                className={cn(
                                    "mx-auto w-full max-w-[248px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white/92 shadow-sm transition-all duration-200",
                                    mobileOptionsActive
                                        ? "opacity-100"
                                        : "opacity-0 pointer-events-none md:group-hover:opacity-100 md:group-hover:pointer-events-auto"
                                )}
                            >
                                <div className="grid grid-cols-3 gap-1 p-2">
                                    {CHILD_TYPE[node.type as NodeType] ? (
                                        <button
                                            onClick={() => onAddChild(node)}
                                            className="inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-500 transition-colors hover:bg-primary/10 hover:text-primary"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            Add
                                        </button>
                                    ) : (
                                        <div />
                                    )}
                                    <button
                                        onClick={e => { e.stopPropagation(); setEditing(true) }}
                                        className="inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                        Edit
                                    </button>
                                    <button
                                        onClick={e => { e.stopPropagation(); onRequestDelete(node.id) }}
                                        className="inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-amber-600 transition-colors hover:bg-amber-50 hover:text-amber-700"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Trash
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {confirmingDeleteId === node.id && !editing && (
                        <div
                            className="mx-2 mb-1 mt-1 sm:mx-3 animate-in fade-in slide-in-from-top-1 duration-150"
                            style={{
                                paddingLeft: `${depth * 24 + (isScene ? 40 : 20)}px`,
                                paddingRight: '12px',
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="mx-auto flex w-full max-w-[248px] flex-col items-center gap-2 rounded-2xl border border-amber-100 bg-amber-50/90 px-3 py-2.5 shadow-sm">
                                <p className="text-center text-[9px] font-bold uppercase tracking-[0.22em] text-amber-700/80">
                                    Delete this {(NODE_DISPLAY_NAMES[node.type] || 'node').toLowerCase()}?
                                </p>
                                <div className="grid w-full grid-cols-2 gap-2">
                                    <button
                                        onClick={e => { e.stopPropagation(); onRequestDelete(null) }}
                                        className="rounded-full border border-amber-100 bg-white/80 px-3 py-2 text-center text-[9px] font-bold uppercase tracking-wider text-slate-500 transition-colors hover:text-slate-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={e => { e.stopPropagation(); onDelete(node) }}
                                        className="rounded-full bg-amber-500 px-3 py-2 text-center text-[9px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-amber-600"
                                    >
                                        Trash
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {(!isScene && expanded) && (
                        <Droppable droppableId={node.id} isDropDisabled={isReadOnly}>
                            {(provided, snapshot) => (
                                <div 
                                    className={cn(
                                        "fade-in min-h-[40px] transition-colors duration-200 rounded-2xl mx-1",
                                        snapshot.isDraggingOver && "bg-[#546354]/10 ring-2 ring-inset ring-[#546354]/5"
                                    )}
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                >
                                    {children.map((child, index) => (
                                        <NodeItem
                                            key={child.id}
                                            node={child}
                                            nodes={nodes}
                                            projectType={projectType}
                                            index={index}
                                            activeNodeId={activeNodeId}
                                            selectedNodeIds={selectedNodeIds}
                                            depth={depth + 1}
                                            indentStep={indentStep}
                                            dragState={dragState}
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
    )

    return (
        <Draggable draggableId={node.id} index={index} isDragDisabled={isDragDisabled}>
            {(provided, snapshot) => {
                const element = itemContent(provided, snapshot);
                if (snapshot.isDragging) {
                    return createPortal(element, document.body);
                }
                return element;
            }}
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
    if (prev.indentStep !== next.indentStep) return false;
    if (prev.confirmingDeleteId !== next.confirmingDeleteId) return false;
    if (prev.dragState !== next.dragState) return false;

    return true;
});

NodeItem.displayName = 'NodeItem'
