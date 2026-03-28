'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    ChevronRight, ChevronDown, Plus, Trash2,
    Film, Layers, FileText, BookOpen, Info
} from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from '@/lib/utils'
import type { Database, NodeType } from '@/lib/supabase/types'
import { useRouter } from 'next/navigation'

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
    chapter: 'Add Scene',
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
            title: `${childType.charAt(0).toUpperCase() + childType.slice(1)} ${siblings.length + 1}`,
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

    const rootNodes = buildTree(nodes, null)

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
                        <div className="text-center py-10 px-4">
                            <p className="text-xs text-slate-400 mb-4 truncate">No {rootLabel.toLowerCase()}s yet.</p>
                            <Button variant="outline" size="sm" onClick={addRootNode} className="text-xs h-8">
                                Add your first {rootLabel.toLowerCase()}
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

function NodeItem({ node, nodes, activeNodeId, depth, onSelect, onAddChild, onDelete, onRename }: {
    node: StructureNode
    nodes: StructureNode[]
    activeNodeId: string | null
    depth: number
    onSelect: (id: string) => void
    onAddChild: (n: StructureNode) => void
    onDelete: (n: StructureNode) => void
    onRename: (n: StructureNode, title: string) => void
}) {
    const [expanded, setExpanded] = useState(true)
    const [hovered, setHovered] = useState(false)
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(node.title)

    const children = buildTree(nodes, node.id)
    const Icon = NODE_ICONS[node.type as NodeType] ?? FileText
    const isScene = node.type === 'scene'
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
                    'group flex items-center gap-2 py-2 px-4 mx-2 rounded-xl cursor-pointer transition-all text-sm mb-1',
                    isActive ? 'bg-white text-[#546354] shadow-sm font-medium' : 'text-slate-500 hover:bg-white/40',
                )}
                style={{ paddingLeft: `${12 + depth * 16}px` }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                onClick={handleClick}
            >
                {!isScene && (
                    <span className="text-slate-400">
                        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </span>
                )}
                {isScene && <div className="w-3.5" />}

                <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-primary' : 'text-slate-400')} />

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
                        className="flex-1 bg-white border border-primary/20 rounded px-1 text-xs outline-none h-6 font-serif italic"
                        autoFocus
                    />
                ) : (
                    <span
                        className="flex-1 truncate"
                        onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
                    >
                        {node.title}
                    </span>
                )}

                {hovered && !editing && (
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        {CHILD_TYPE[node.type as keyof typeof CHILD_TYPE] && (
                            <Tooltip>
                                <TooltipTrigger>
                                    <button
                                        onClick={() => onAddChild(node)}
                                        className="p-1 rounded hover:bg-primary/10 text-slate-400 hover:text-primary"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">{CHILD_LABELS[node.type as keyof typeof CHILD_LABELS]}</TooltipContent>
                            </Tooltip>
                        )}
                        <Tooltip>
                            <TooltipTrigger>
                                <button
                                    onClick={() => onDelete(node)}
                                    className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Delete</TooltipContent>
                        </Tooltip>
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
}
