'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import StructureTree from './StructureTree'
import SceneEditor from './SceneEditor'
import WritingModeToggle from '@/components/shared/WritingModeToggle'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Database, WritingMode } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

type Project = Database['public']['Tables']['projects']['Row']
type StructureNode = Database['public']['Tables']['structure_nodes']['Row']
type Scene = Database['public']['Tables']['scenes']['Row']

interface StoryTabProps {
    project: Project
    initialNodes: StructureNode[]
    initialScenes: Scene[]
}

export default function StoryTab({ project, initialNodes, initialScenes }: StoryTabProps) {
    const [nodes, setNodes] = useState(initialNodes)
    const [scenes, setScenes] = useState(initialScenes)
    const [activeNodeId, setActiveNodeId] = useState<string | null>(
        initialNodes.find(n => n.type === 'scene')?.id ?? null
    )
    const [writingMode, setWritingMode] = useState<WritingMode>(project.writing_mode)
    const [sidebarOpen, setSidebarOpen] = useState(true)

    const activeScene = scenes.find(s => s.node_id === activeNodeId)

    const handleWritingModeChange = useCallback(async (mode: WritingMode) => {
        setWritingMode(mode)
        const supabase = createClient()
        await supabase.from('projects').update({ writing_mode: mode }).eq('id', project.id)
    }, [project.id])

    const handleNodesChange = useCallback((updated: StructureNode[]) => {
        setNodes(updated)
    }, [])

    const handleSceneSelect = useCallback((nodeId: string) => {
        setActiveNodeId(nodeId)
    }, [])

    const handleSceneCreated = useCallback((scene: Scene) => {
        setScenes(prev => [...prev, scene])
    }, [])

    const handleSceneUpdate = useCallback((updated: Scene) => {
        setScenes(prev => prev.map(s => s.id === updated.id ? updated : s))
    }, [])

    return (
        <div className="flex h-[calc(100vh-56px-97px)] overflow-hidden">
            {/* Left sidebar */}
            <div className={cn(
                'bg-[#f5f4ef] flex flex-col transition-all duration-300 overflow-hidden',
                sidebarOpen ? 'w-72 min-w-72' : 'w-0 min-w-0'
            )}>
                {sidebarOpen && (
                    <StructureTree
                        project={project}
                        nodes={nodes}
                        activeNodeId={activeNodeId}
                        onNodeSelect={handleSceneSelect}
                        onNodesChange={handleNodesChange}
                        onSceneCreated={handleSceneCreated}
                    />
                )}
            </div>

            {/* Main editor area */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#fbf9f5]">
                {/* Editor toolbar */}
                <div className="flex items-center justify-between px-6 py-4 bg-transparent">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSidebarOpen(o => !o)}
                        className="text-slate-400 hover:text-[#546354] h-8 w-8 p-0"
                        title={sidebarOpen ? 'Hide structure panel' : 'Show structure panel'}
                    >
                        {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                    </Button>

                    <WritingModeToggle mode={writingMode} onChange={handleWritingModeChange} />
                </div>

                {/* Editor content */}
                <div className="flex-1 overflow-y-auto">
                    {activeNodeId && activeScene ? (
                        <SceneEditor
                            scene={activeScene}
                            writingMode={writingMode}
                            onUpdate={handleSceneUpdate}
                        />
                    ) : activeNodeId ? (
                        <SceneEditorPlaceholder
                            nodeId={activeNodeId}
                            projectId={project.id}
                            writingMode={writingMode}
                            onCreated={handleSceneCreated}
                        />
                    ) : (
                        <EmptyEditorState />
                    )}
                </div>
            </div>
        </div>
    )
}

function EmptyEditorState() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16">
            <div className="text-4xl mb-4">✍️</div>
            <h3 className="text-lg font-medium text-slate-700 mb-2">Select a scene to start writing</h3>
            <p className="text-sm text-slate-400 max-w-xs">
                Click on a scene in the structure panel on the left, or add a new one.
            </p>
        </div>
    )
}

function SceneEditorPlaceholder({ nodeId, projectId, writingMode, onCreated }: {
    nodeId: string
    projectId: string
    writingMode: WritingMode
    onCreated: (scene: Scene) => void
}) {
    const [creating, setCreating] = useState(false)

    async function create() {
        setCreating(true)
        const supabase = createClient()
        const { data } = await supabase.from('scenes').insert({
            node_id: nodeId, project_id: projectId, writing_mode: writingMode
        }).select().single()
        if (data) onCreated(data)
        setCreating(false)
    }

    // Auto-create scene on render
    if (!creating) {
        create()
    }

    return (
        <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
    )
}
