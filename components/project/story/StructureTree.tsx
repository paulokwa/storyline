'use client'

import React, { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
    ChevronRight, ChevronDown, Plus, Trash2,
    Film, Layers, FileText, BookOpen
} from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from '@/lib/utils'
import type { Database, NodeType } from '@/lib/supabase/types'

type Project = Database['public']['Tables']['projects']['Row']
type StructureNode = Database['public']['Tables']['structure_nodes']['Row']
type Scene = Database['public']['Tables']['scenes']['Row']

interface StructureTreeProps {
    project: Project
    nodes: StructureNode[]
    activeNodeId: string | null
    onNodeSelect: (id: string) => void
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
    project, nodes, activeNodeId, onNodeSelect, onNodesChange, onSceneCreated
}: StructureTreeProps) {
    const rootType: NodeType = project.type === 'tv_script' ? 'episode' : 'chapter'
    const rootLabel = project.type === 'tv_script' ? 'Episode' : 'Chapter'

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
                writing_mode: project.writing_mode,
            }).select().single()
            if (scene) {
                onSceneCreated(scene as any)
                onNodeSelect((newNode as any).id)
            }
        }
    }

    async function deleteNode(node: StructureNode) {
        if (!confirm(`Delete "${node.title}"? All content inside will be lost.`)) return
        const supabase = createClient()
        await (supabase as any).from('structure_nodes').delete().eq('id', node.id)
        const idsToRemove = getDescendantIds(nodes, node.id)
        onNodesChange(nodes.filter(n => !idsToRemove.includes(n.id) && n.id !== node.id))
        if (activeNodeId && (activeNodeId === node.id || idsToRemove.includes(activeNodeId))) {
            const firstScene = nodes.find(n => n.type === 'scene' && !idsToRemove.includes(n.id) && n.id !== node.id)
            onNodeSelect(firstScene?.id ?? '')
        }
    }

    async function renameNode(node: StructureNode, title: string) {
        const supabase = createClient()
        await (supabase as any).from('structure_nodes').update({ title }).eq('id', node.id)
        onNodesChange(nodes.map(n => n.id === node.id ? { ...n, title } : n))
    }

    const rootNodes = useMemo(() => buildTree(nodes, null), [nodes])

    return (
        <TooltipProvider>
            <div className="flex flex-col h-full bg-transparent">
                <div className="px-6 py-6 flex items-center justify-between">
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
                        rootNodes.map(node => (
                            <NodeItem
                                key={node.id}
                                node={node}
                                nodes={nodes}
                                activeNodeId={activeNodeId}
                                depth={0}
                                onSelect={onNodeSelect}
                                onAddChild={addChild}
                                onDelete={deleteNode}
                                onRename={renameNode}
                            />
                        ))
                    )}
                </div>

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
            </div>
        </TooltipProvider>
    )
}

interface NodeItemProps {
    node: StructureNode
    nodes: StructureNode[]
    activeNodeId: string | null
    depth: number
    onSelect: (id: string) => void
    onAddChild: (n: StructureNode) => void
    onDelete: (n: StructureNode) => void
    onRename: (n: StructureNode, title: string) => void
}

const NodeItem = React.memo(function NodeItem({ node, nodes, activeNodeId, depth, onSelect, onAddChild, onDelete, onRename }: NodeItemProps) {
    const [expanded, setExpanded] = useState(true)
    const [hovered, setHovered] = useState(false)
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(node.title)

    const children = useMemo(() => buildTree(nodes, node.id), [nodes, node.id])
    const Icon = NODE_ICONS[node.type as NodeType] ?? FileText
    const isScene = node.type === 'scene'
    const isAct = node.type === 'act'
    const isRoot = node.type === 'episode' || node.type === 'chapter'
    const isActive = isScene && activeNodeId === node.id

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
        <div>
            <div
                className={cn(
                    'group flex items-center gap-2 py-3 px-4 mx-3 rounded-2xl cursor-pointer transition-all duration-300 text-sm mb-1 relative border border-transparent',
                    isActive
                        ? 'bg-white text-[#546354] shadow-[0_8px_24px_rgba(0,0,0,0.06)] font-bold border-[#546354]/10 z-10'
                        : 'text-slate-500 hover:bg-white/60',
                    isRoot && 'font-serif italic text-base py-4 bg-white/30 backdrop-blur-sm border-white/40 mb-2 mt-2 shadow-[0_2px_8px_rgba(0,0,0,0.02)]',
                    isAct && 'font-semibold text-slate-700 py-2.5',
                    isScene && 'text-slate-500 py-2'
                )}
                style={{ paddingLeft: `${16 + depth * 24}px` }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                onClick={handleClick}
            >
                {isActive && (
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-[#546354] rounded-full shadow-[0_0_12px_rgba(84,99,84,0.3)]" />
                )}

                {!isScene && (
                    <span className="text-slate-400 group-hover:text-[#546354] transition-colors">
                        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </span>
                )}
                {isScene && <div className="w-4" />}

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
                            isScene && "text-slate-600 font-medium"
                        )}
                        onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
                    >
                        {node.title}
                    </span>
                )}

                {(!editing && (hovered || isActive || window.innerWidth < 768)) && (
                    <div className={cn(
                        "flex items-center gap-1 shrink-0 transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100",
                        (isActive || window.innerWidth < 768) && "opacity-100"
                    )} onClick={e => e.stopPropagation()}>
                        {CHILD_TYPE[node.type as NodeType] && (
                            <button
                                onClick={() => onAddChild(node)}
                                className="p-2 rounded-lg hover:bg-primary/10 text-slate-400 hover:text-primary active:scale-95 transition-all"
                                title={CHILD_LABELS[node.type as NodeType]}
                            >
                                <Plus className="w-4 h-4 md:w-3.5 md:h-3.5" />
                            </button>
                        )}
                        <button
                            onClick={() => onDelete(node)}
                            className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 active:scale-95 transition-all"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {!isScene && expanded && children.length > 0 && (
                <div className="fade-in">
                    {children.map(child => (
                        <NodeItem
                            key={child.id}
                            node={child}
                            nodes={nodes}
                            activeNodeId={activeNodeId}
                            depth={depth + 1}
                            onSelect={onSelect}
                            onAddChild={onAddChild}
                            onDelete={onDelete}
                            onRename={onRename}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}, (prev, next) => {
    // Custom comparison to reduce tree re-renders
    // Only re-render if:
    // 1. The specific node data changed (title, etc)
    // 2. The active status of this node changed
    // 3. The global nodes list changed (which might contain new children)
    const wasActive = prev.activeNodeId === prev.node.id;
    const isActive = next.activeNodeId === next.node.id;
    
    if (wasActive !== isActive) return false;
    if (prev.node !== next.node) return false;
    if (prev.nodes !== next.nodes) return false;
    if (prev.depth !== next.depth) return false;
    
    return true;
});
