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
import type { Database, WritingMode } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'
import { ReaderControls } from './ReaderMode'

function extractTextFromJson(content: any): string {
    if (typeof content === 'string') return content
    if (!content) return ''
    if (content.type === 'text') return content.text || ''
    if (Array.isArray(content.content)) {
        return content.content.map((c: any) => extractTextFromJson(c)).join('\n')
    }
    return ''
}

type Project = Database['public']['Tables']['projects']['Row']
type StructureNode = Database['public']['Tables']['structure_nodes']['Row']
type Scene = Database['public']['Tables']['scenes']['Row']

interface StoryTabProps {
    project: Project
    initialNodes: StructureNode[]
    initialScenes: any[] // any[] to handle joined scenes with linked ideas/characters temporarily
    projectCharacters: any[]
    projectIdeas: any[]
    projectLocations: any[]
    projectObjects: any[]
    projectRelationships: any[]
    aiSettings: {
        ai_enabled: boolean
        ai_provider: string
        ai_fallback_enabled: boolean
        ollama_model: string
        ollama_url: string
        api_key: string | null
    }
}

export default function StoryTab({ project, initialNodes, initialScenes, projectCharacters, projectIdeas, projectLocations, projectObjects, projectRelationships, aiSettings }: StoryTabProps) {
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
    const [activeLocations, setActiveLocations] = useState<Record<string, boolean>>({})
    const [activeObjects, setActiveObjects] = useState<Record<string, boolean>>({})
    const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
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

    const handleNodeToggleSelection = useCallback((nodeId: string) => {
        setSelectedNodeIds(prev => {
            const isSelected = prev.includes(nodeId)
            
            // Helper to get all child/grandchild IDs
            const getDescendantIds = (parentId: string): string[] => {
                const children = nodes.filter(n => n.parent_id === parentId)
                return children.flatMap(c => [c.id, ...getDescendantIds(c.id)])
            }
            
            const targetIds = [nodeId, ...getDescendantIds(nodeId)]
            
            if (isSelected) {
                // Deselect everything in this branch
                return prev.filter(id => !targetIds.includes(id))
            } else {
                // Select everything in this branch (avoiding duplicates)
                const newSelected = [...prev]
                targetIds.forEach(id => {
                    if (!newSelected.includes(id)) newSelected.push(id)
                })
                return newSelected
            }
        })
    }, [nodes])

    const handleSceneUpdate = useCallback((updated: Scene) => {
        setScenes((prev: any[]) => prev.map((s: any) => s.id === updated.id ? updated : s))
    }, [])

    return (
        <div className="flex h-[calc(100vh-56px-122px)] md:h-[calc(100vh-56px-97px)] overflow-hidden relative">
            {/* Backdrop for mobile */}
            {(sidebarOpen || aiPanelOpen) && (
                <div 
                    className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
                    onClick={() => {
                        setSidebarOpen(false)
                        setAiPanelOpen(false)
                    }}
                />
            )}

            {/* Left sidebar */}
            <div className={cn(
                'bg-[#f5f4ef] flex flex-col transition-all duration-300 overflow-hidden z-50',
                'fixed inset-y-0 left-0 md:relative md:inset-auto',
                sidebarOpen ? 'w-[280px] border-r border-slate-200' : 'w-0 border-none'
            )}>
                <div className="w-[280px] h-full flex flex-col">
                    <StructureTree
                        project={project}
                        nodes={nodes}
                        activeNodeId={activeNodeId}
                        selectedNodeIds={selectedNodeIds}
                        onNodeSelect={(id) => {
                            handleSceneSelect(id)
                            if (window.innerWidth < 768) setSidebarOpen(false)
                        }}
                        onNodeToggleSelection={handleNodeToggleSelection}
                        onNodesChange={handleNodesChange}
                        onSceneCreated={handleSceneCreated}
                    />
                </div>
            </div>

            {/* Main editor area */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#fbf9f5] w-full">
                {/* Editor toolbar */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-transparent border-b border-slate-100/50 md:border-none">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setSidebarOpen((o: boolean) => !o)
                            if (aiPanelOpen) setAiPanelOpen(false)
                        }}
                        className="text-slate-400 hover:text-[#546354] h-8 w-8 p-0"
                        title={sidebarOpen ? 'Hide structure panel' : 'Show structure panel'}
                    >
                        {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                    </Button>

                    <div className="flex items-center gap-2 sm:gap-4">
                        {project.type === 'tv_script' && (
                            <div className="scale-90 sm:scale-100 origin-right">
                                <WritingModeToggle mode={writingMode} onChange={handleWritingModeChange} />
                            </div>
                        )}
                        {aiSettings.ai_enabled && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setAiPanelOpen((o: boolean) => !o)
                                    if (sidebarOpen) setSidebarOpen(false)
                                }}
                                className={cn(
                                    "h-8 px-3 gap-2 rounded-full transition-all font-serif italic",
                                    aiPanelOpen ? "bg-indigo-50 text-indigo-600 shadow-sm" : "text-slate-400 hover:text-indigo-500"
                                )}
                            >
                                <Sparkles className={cn("w-4 h-4", aiPanelOpen && "animate-pulse")} />
                                <span className="hidden xs:inline">{aiPanelOpen ? 'Helper Open' : 'AI Helper'}</span>
                            </Button>
                        )}

                        <div className="w-px h-4 bg-slate-200 mx-1 hidden sm:block" />

                        <ReaderControls 
                            getSelection={() => editorRef.current?.getSelectionText() || ''}
                            getScene={() => editorRef.current?.getText() || ''}
                            getChapter={() => {
                                if (!activeNodeId) return ''
                                const activeNode = nodes.find(n => n.id === activeNodeId)
                                if (!activeNode) return ''
                                
                                // Find root of this chapter/episode
                                let rootNode = activeNode
                                while (rootNode && rootNode.parent_id !== null) {
                                     rootNode = nodes.find(n => n.id === rootNode.parent_id) || rootNode
                                }
                                
                                const isDescendant = (nodeId: string, parentId: string): boolean => {
                                     const node = nodes.find(n => n.id === nodeId)
                                     if (!node) return false
                                     if (node.parent_id === parentId) return true
                                     if (node.parent_id) return isDescendant(node.parent_id, parentId)
                                     return false
                                }

                                const chapterScenes = scenes.filter((s: any) => {
                                     const sceneNode = nodes.find(n => n.id === s.node_id)
                                     if (!sceneNode) return false
                                     if (sceneNode.id === rootNode.id) return true
                                     return isDescendant(sceneNode.id, rootNode.id)
                                })
                                
                                // Sort properly by tree flatten
                                const flattenTree = (parentId: string | null): string[] => {
                                    const children = nodes.filter(n => n.parent_id === parentId).sort((a,b) => (a.order_index ?? 0) - (b.order_index ?? 0))
                                    return children.flatMap(c => [c.id, ...flattenTree(c.id)])
                                }
                                const order = flattenTree(null)
                                chapterScenes.sort((a: any, b: any) => order.indexOf(a.node_id) - order.indexOf(b.node_id))
                                
                                return chapterScenes.map((s: any) => extractTextFromJson(s.content)).join('\n\n')
                            }}
                        />
                    </div>
                </div>

                {/* Editor content */}
                <div className="flex-1 overflow-y-auto w-full">
                    <div className="max-w-full mx-auto">
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
                                projectLocations={projectLocations}
                                projectObjects={projectObjects}
                                onLinkingUpdate={() => router.refresh()}
                                activeCharacters={activeCharacters}
                                setActiveCharacters={setActiveCharacters}
                                activeIdeas={activeIdeas}
                                setActiveIdeas={setActiveIdeas}
                                activeLocations={activeLocations}
                                setActiveLocations={setActiveLocations}
                                activeObjects={activeObjects}
                                setActiveObjects={setActiveObjects}
                                aiSettings={aiSettings}
                                selectedNodeIds={selectedNodeIds}
                                onToggleNodeSelection={handleNodeToggleSelection}
                                allNodes={nodes}
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
            </div>

            {/* Right AI Sidebar */}
            <div className={cn(
                'bg-white transition-all duration-500 overflow-hidden z-50',
                'fixed inset-y-0 right-0 md:relative md:inset-auto',
                aiPanelOpen ? 'w-[320px] border-l border-slate-200' : 'w-0 border-none'
            )}>
                <div className="w-[320px] h-full">
                    {aiPanelOpen && (
                        <AiHelperPanel
                            projectId={project.id}
                            sceneText={currentSceneText}
                            linkedCharacters={(activeScene?.scene_characters?.map((c: any) => c.characters).filter(Boolean) || []).filter((c: any) => activeCharacters[c.id] !== false)}
                            linkedIdeas={(activeScene?.scene_ideas?.map((i: any) => i.ideas).filter(Boolean) || []).filter((i: any) => activeIdeas[i.id] !== false)}
                            linkedLocations={(activeScene?.scene_locations?.map((l: any) => l.locations).filter(Boolean) || []).filter((l: any) => activeLocations[l.id] !== false)}
                            linkedObjects={(activeScene?.scene_objects?.map((o: any) => o.objects).filter(Boolean) || []).filter((o: any) => activeObjects[o.id] !== false)}
                            selectedNodes={nodes.filter(n => selectedNodeIds.includes(n.id))}
                            allNodes={nodes}
                            allScenes={scenes}
                            projectRelationships={projectRelationships}
                            onClearSelection={() => setSelectedNodeIds([])}
                            aiSettings={aiSettings}
                            onInsert={(text) => {
                                editorRef.current?.appendContent(text)
                                if (window.innerWidth < 768) setAiPanelOpen(false)
                            }}
                        />
                    )}
                </div>
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
