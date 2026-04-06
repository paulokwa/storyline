'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import StructureTree from './StructureTree'
import SceneEditor, { SceneEditorRef } from './SceneEditor'
import AiHelperPanel from './AiHelperPanel'
import WritingModeToggle from '@/components/shared/WritingModeToggle'
import { PanelLeftClose, PanelLeftOpen, BookOpen, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { Database, WritingMode } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

type Project = Database['public']['Tables']['projects']['Row']
type StructureNode = Database['public']['Tables']['structure_nodes']['Row']
type Scene = Database['public']['Tables']['scenes']['Row']

interface StoryTabProps {
    project: Project
    initialNodes: StructureNode[]
    initialScenes: any[] // any[] to handle joined scenes with linked ideas/characters temporarily
    projectCharacters: any[]
    projectIdeas: any[]
}

export default function StoryTab({ project, initialNodes, initialScenes, projectCharacters, projectIdeas }: StoryTabProps) {
    const router = useRouter()
    const [nodes, setNodes] = useState(initialNodes)
    const [scenes, setScenes] = useState(initialScenes)
    const [activeNodeId, setActiveNodeId] = useState<string | null>(
        initialNodes.find(n => n.type === 'scene')?.id ?? null
    )
    const [writingMode, setWritingMode] = useState<WritingMode>(project.writing_mode)
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [aiPanelOpen, setAiPanelOpen] = useState(false)
    const [currentSceneText, setCurrentSceneText] = useState('')
    const [activeCharacters, setActiveCharacters] = useState<Record<string, boolean>>({})
    const [activeIdeas, setActiveIdeas] = useState<Record<string, boolean>>({})
    const editorRef = useRef<SceneEditorRef>(null)

    const activeScene = scenes.find((s: Scene) => s.node_id === activeNodeId)

    // Sync from server components when router.refresh() fetches fresh data (like scene links)
    useEffect(() => {
        setScenes(initialScenes)
    }, [initialScenes])

    const handleWritingModeChange = useCallback(async (mode: WritingMode) => {
        setWritingMode(mode)
        const supabase = createClient()
        await (supabase as any).from('projects').update({ writing_mode: mode }).eq('id', project.id)
    }, [project.id])

    const handleNodesChange = useCallback((updated: StructureNode[]) => {
        setNodes(updated)
    }, [])

    const handleSceneSelect = useCallback((nodeId: string) => {
        setActiveNodeId(nodeId)
        setCurrentSceneText('') // Reset context when switching scenes
    }, [])

    const handleSceneCreated = useCallback((scene: Scene) => {
        setScenes((prev: any[]) => [...prev, scene])
    }, [])

    const handleSceneUpdate = useCallback((updated: Scene) => {
        setScenes((prev: any[]) => prev.map((s: any) => s.id === updated.id ? updated : s))
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
                        onClick={() => setSidebarOpen((o: boolean) => !o)}
                        className="text-slate-400 hover:text-[#546354] h-8 w-8 p-0"
                        title={sidebarOpen ? 'Hide structure panel' : 'Show structure panel'}
                    >
                        {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                    </Button>

                    <div className="flex items-center gap-4">
                        {project.type === 'tv_script' && (
                            <WritingModeToggle mode={writingMode} onChange={handleWritingModeChange} />
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAiPanelOpen((o: boolean) => !o)}
                            className={cn(
                                "h-8 px-3 gap-2 rounded-full transition-all font-serif italic",
                                aiPanelOpen ? "bg-indigo-50 text-indigo-600 shadow-sm" : "text-slate-400 hover:text-indigo-500"
                            )}
                        >
                            <Sparkles className={cn("w-4 h-4", aiPanelOpen && "animate-pulse")} />
                            {aiPanelOpen ? 'Helper Open' : 'AI Helper'}
                        </Button>
                    </div>
                </div>

                {/* Editor content */}
                <div className="flex-1 overflow-y-auto">
                    {activeNodeId && activeScene ? (
                        <SceneEditor
                            ref={editorRef}
                            scene={activeScene}
                            writingMode={writingMode}
                            onUpdate={handleSceneUpdate}
                            onTextChange={setCurrentSceneText}
                            isProjectEmpty={nodes.length <= (project.type === 'tv_script' ? 3 : 2)}
                            projectType={project.type as any}
                            projectCharacters={projectCharacters}
                            projectIdeas={projectIdeas}
                            onLinkingUpdate={() => router.refresh()}
                            activeCharacters={activeCharacters}
                            setActiveCharacters={setActiveCharacters}
                            activeIdeas={activeIdeas}
                            setActiveIdeas={setActiveIdeas}
                        />
                    ) : activeNodeId ? (
                        <SceneEditorPlaceholder
                            nodeId={activeNodeId}
                            projectId={project.id}
                            writingMode={writingMode}
                            onCreated={handleSceneCreated}
                        />
                    ) : (
                        <EmptyEditorState
                            projectType={project.type as any}
                            isProjectEmpty={nodes.length === 0}
                        />
                    )}
                </div>
            </div>

            {/* Right AI Sidebar */}
            <div className={cn(
                'bg-white transition-all duration-500 overflow-hidden border-l border-slate-100',
                aiPanelOpen ? 'w-80 min-w-80' : 'w-0 min-w-0'
            )}>
                {aiPanelOpen && (
                    <AiHelperPanel
                        projectId={project.id}
                        sceneText={currentSceneText}
                        linkedCharacters={(activeScene?.scene_characters?.map((c: any) => c.characters).filter(Boolean) || []).filter((c: any) => activeCharacters[c.id] !== false)}
                        linkedIdeas={(activeScene?.scene_ideas?.map((i: any) => i.ideas).filter(Boolean) || []).filter((i: any) => activeIdeas[i.id] !== false)}
                        onInsert={(text) => editorRef.current?.appendContent(text)}
                    />
                )}
            </div>
        </div>
    )
}


function EmptyEditorState({ projectType, isProjectEmpty }: { projectType: 'tv_script' | 'novel', isProjectEmpty: boolean }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-full text-center px-10 py-12 animate-in fade-in zoom-in duration-700">
            <div className="w-20 h-20 bg-white/50 rounded-full flex items-center justify-center mb-8 shadow-sm border border-white">
                <BookOpen className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-2xl font-serif text-slate-800 mb-6 tracking-tight">Start your story here.</h3>
            <p className="text-slate-500 max-w-sm leading-relaxed font-medium mb-12">
                Use the panel on the left to add episodes and scenes,<br className="hidden md:block" /> or begin writing in this scene.
            </p>

            {isProjectEmpty && (
                <div className="w-full max-w-md bg-[#f5f4ef]/80 border border-[#546354]/10 rounded-[2.5rem] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.03)] backdrop-blur-sm text-left animate-in slide-in-from-bottom-4 duration-1000">
                    <h4 className="text-sm font-serif italic text-[#546354]/80 mb-6 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" /> You're just getting started.
                    </h4>
                    <div className="space-y-8">
                        <div className="flex items-start gap-5">
                            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white border border-[#546354]/10 shadow-sm flex items-center justify-center text-xs font-bold text-[#546354]">1</span>
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-slate-700">Add an {projectType === 'tv_script' ? 'episode' : 'chapter'}</p>
                                <p className="text-xs text-slate-400">Click in the structure panel to begin.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-5">
                            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white border border-[#546354]/10 shadow-sm flex items-center justify-center text-xs font-bold text-[#546354]">2</span>
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-slate-700">Create a scene</p>
                                <p className="text-xs text-slate-400">Hover over your container to add scenes.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-5">
                            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white border border-[#546354]/10 shadow-sm flex items-center justify-center text-xs font-bold text-[#546354]">3</span>
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-slate-700">Begin writing</p>
                                <p className="text-xs text-slate-400">Select any scene to open the canvas.</p>
                            </div>
                        </div>
                    </div>
                    <p className="mt-10 text-[10px] text-center font-bold uppercase tracking-widest text-[#546354]/30">You can always reorganize later.</p>
                </div>
            )}

            <div className="mt-12 w-32 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
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
        const { data } = await (supabase as any).from('scenes').insert({
            node_id: nodeId, project_id: projectId, writing_mode: writingMode
        }).select().single()
        if (data) onCreated(data as any)
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
