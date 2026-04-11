'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import StructureTree from './StructureTree'
import SceneEditor, { SceneEditorRef } from './SceneEditor'
import AiHelperPanel from './AiHelperPanel'
import SceneAssetsPanel from './SceneAssetsPanel'
import LinkedContext from './LinkedContext'
import WritingModeToggle from '@/components/shared/WritingModeToggle'
import { PanelLeftClose, PanelLeftOpen, BookOpen, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Database, WritingMode } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'
import { useProjectActions } from '@/components/project/ProjectContext'
import { useComments } from '@/components/project/CommentsContext'
import CommentsPanel from '@/components/project/sidebar/CommentsPanel'

type Project = Database['public']['Tables']['projects']['Row']
type StructureNode = Database['public']['Tables']['structure_nodes']['Row']
type Scene = Database['public']['Tables']['scenes']['Row']

interface StoryTabProps {
    project: Project
    initialNodes: StructureNode[]
    initialScenes: any[]
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
    const { 
        sidebarOpen, setSidebarOpen, 
        aiPanelOpen, setAiPanelOpen, 
        sceneAssetsOpen, setSceneAssetsOpen,
        currentSceneText, setCurrentSceneText,
        activeNodeId, setActiveNodeId
    } = useProjectActions()
    const { commentsPanelOpen, setCommentsPanelOpen, fetchComments } = useComments()
    
    const [nodes, setNodes] = useState(initialNodes)
    const [scenes, setScenes] = useState(initialScenes)

    // On mobile, we want to go direct to the tab column (list) instead of an entry.
    useEffect(() => {
        if (!activeNodeId) {
             setActiveNodeId(initialNodes.find(n => n.type === 'scene')?.id ?? null)
        }
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setActiveNodeId(null)
        }
    }, [])

    useEffect(() => {
        fetchComments(project.id)
    }, [project.id, fetchComments])
    const [writingMode, setWritingMode] = useState<WritingMode>(project.writing_mode ?? 'simple')
    
    const [activeCharacters, setActiveCharacters] = useState<Record<string, boolean>>({})
    const [activeIdeas, setActiveIdeas] = useState<Record<string, boolean>>({})
    const [activeLocations, setActiveLocations] = useState<Record<string, boolean>>({})
    const [activeObjects, setActiveObjects] = useState<Record<string, boolean>>({})
    const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
    const editorRef = useRef<SceneEditorRef>(null)

    const activeScene = scenes.find((s: Scene) => s.node_id === activeNodeId)

    useEffect(() => {
        setScenes(initialScenes)
    }, [initialScenes])

    // Realtime Structure Sync
    useEffect(() => {
        if (!project.id) return

        const supabase = createClient()
        const channel = supabase.channel(`structure:${project.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'structure_nodes',
                filter: `project_id=eq.${project.id}`
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setNodes(prev => {
                        if (prev.some(n => n.id === payload.new.id)) return prev
                        return [...prev, payload.new as StructureNode]
                    })
                } else if (payload.eventType === 'UPDATE') {
                    setNodes(prev => prev.map(n => 
                        n.id === payload.new.id ? { ...n, ...payload.new } : n
                    ))
                } else if (payload.eventType === 'DELETE') {
                    setNodes(prev => prev.filter(n => n.id !== payload.old.id))
                    // Safety check for active node
                    if (activeNodeId === payload.old.id) {
                         setActiveNodeId(null)
                    }
                }
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'scenes',
                filter: `project_id=eq.${project.id}`
            }, (payload) => {
                 if (payload.eventType === 'INSERT') {
                    setScenes(prev => {
                        if (prev.some(s => s.id === payload.new.id)) return prev
                        return [...prev, payload.new as Scene]
                    })
                } else if (payload.eventType === 'UPDATE') {
                    setScenes(prev => prev.map(s => 
                        s.id === payload.new.id ? { ...s, ...payload.new } : s
                    ))
                } else if (payload.eventType === 'DELETE') {
                    setScenes(prev => prev.filter(s => s.id !== payload.old.id))
                }
            })
            .subscribe()

        return () => {
            channel.unsubscribe()
        }
    }, [project.id, activeNodeId, setActiveNodeId])

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
        setCurrentSceneText('') 
    }, [setCurrentSceneText])

    const handleSceneCreated = useCallback((scene: Scene) => {
        setScenes((prev: any[]) => [...prev, scene])
    }, [])

    const handleNodeToggleSelection = useCallback((nodeId: string) => {
        setSelectedNodeIds(prev => {
            const isSelected = prev.includes(nodeId)
            const getDescendantIds = (parentId: string): string[] => {
                const children = nodes.filter(n => n.parent_id === parentId)
                return children.flatMap(c => [c.id, ...getDescendantIds(c.id)])
            }
            const targetIds = [nodeId, ...getDescendantIds(nodeId)]
            if (isSelected) {
                return prev.filter(id => !targetIds.includes(id))
            } else {
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

    const handleTitleUpdate = useCallback((newTitle: string) => {
        setNodes((prev: any[]) => prev.map((n: any) => n.id === activeNodeId ? { ...n, title: newTitle } : n))
    }, [activeNodeId])

    return (
        <div className="flex flex-1 overflow-hidden relative">
            {/* Backdrop for mobile */}
            {(sidebarOpen || aiPanelOpen || commentsPanelOpen) && (
                <div 
                    className={cn(
                        "md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-30 transition-all duration-500",
                        (sidebarOpen || aiPanelOpen || commentsPanelOpen) ? "opacity-100" : "opacity-0 pointer-events-none"
                    )}
                    onClick={() => {
                        setSidebarOpen(false)
                        setAiPanelOpen(false)
                        setCommentsPanelOpen(false)
                        setSceneAssetsOpen(false)
                    }}
                />
            )}

            {/* Left sidebar */}
            <div className={cn(
                'bg-[#f5f4ef] flex flex-col transition-all duration-300 ease-in-out overflow-hidden z-40 md:z-20',
                'fixed top-14 bottom-0 left-0 md:relative md:inset-auto md:h-full',
                sidebarOpen 
                    ? 'w-[280px] lg:w-[320px] border-r border-slate-200 opacity-100 translate-x-0' 
                    : 'w-0 border-none opacity-0 -translate-x-full md:translate-x-0 md:opacity-100'
            )}>
                <div className="w-[280px] lg:w-[320px] h-full flex flex-col">
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
                {/* Linked Context (Sticky) */}
                {activeNodeId && activeScene && (
                    <div className="bg-[#fbf9f5] border-b border-slate-100 z-10">
                        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
                             <LinkedContext
                                sceneId={activeScene.id}
                                sceneCharacters={activeScene.scene_characters}
                                sceneIdeas={activeScene.scene_ideas}
                                sceneLocations={activeScene.scene_locations}
                                sceneObjects={activeScene.scene_objects}
                                projectCharacters={projectCharacters}
                                projectIdeas={projectIdeas}
                                projectLocations={projectLocations}
                                projectObjects={projectObjects}
                                onUpdate={() => router.refresh()}
                                activeCharacters={activeCharacters}
                                setActiveCharacters={setActiveCharacters}
                                activeIdeas={activeIdeas}
                                setActiveIdeas={setActiveIdeas}
                                activeLocations={activeLocations}
                                setActiveLocations={setActiveLocations}
                                activeObjects={activeObjects}
                                setActiveObjects={setActiveObjects}
                                selectedNodeIds={selectedNodeIds}
                                onToggleNodeSelection={handleNodeToggleSelection}
                                allNodes={nodes}
                            />
                        </div>
                    </div>
                )}

                {/* Editor content (Scrolls internally) */}
                <div className="flex-1 overflow-y-auto w-full scroll-smooth custom-scrollbar">
                    <div className="max-w-full mx-auto">
                        {activeNodeId && activeScene ? (
                            <SceneEditor
                                ref={editorRef}
                                scene={activeScene}
                                title={nodes.find(n => n.id === activeNodeId)?.title || ''}
                                writingMode={writingMode}
                                onUpdate={handleSceneUpdate}
                                onTitleUpdate={handleTitleUpdate}
                                onTextChange={setCurrentSceneText}
                                isProjectEmpty={nodes.length <= (project.type === 'tv_script' ? 3 : 2)}
                                projectType={project.type as any}
                                projectCharacters={projectCharacters}
                                projectIdeas={projectIdeas}
                                projectLocations={projectLocations}
                                projectObjects={projectObjects}
                                aiSettings={aiSettings}
                            />
                        ) : activeNodeId ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4 animate-in fade-in duration-500">
                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">
                                    <BookOpen className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-serif font-bold text-slate-800">Scene Not Found</h3>
                                    <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">
                                        This scene may have been moved or deleted by a collaborator.
                                    </p>
                                </div>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setActiveNodeId(null)}
                                    className="rounded-xl border-slate-200 text-slate-500"
                                >
                                    Dismiss
                                </Button>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="w-24 h-24 bg-primary/5 rounded-[2.5rem] flex items-center justify-center text-primary/40 relative">
                                    <Sparkles className="w-10 h-10 animate-pulse" />
                                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-serif italic text-slate-400">Your story awaits...</h3>
                                    <p className="text-sm text-slate-300 font-medium uppercase tracking-[0.2em]">Select a scene to begin writing</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* AI Helper Sidebar */}
            <div className={cn(
                'bg-white flex flex-col border-l border-slate-200 transition-all duration-300 ease-in-out overflow-hidden z-40 md:z-20',
                'fixed top-14 bottom-0 right-0 md:relative md:inset-auto md:h-full',
                aiPanelOpen 
                    ? 'w-[320px] lg:w-[380px] opacity-100 translate-x-0' 
                    : 'w-0 border-none opacity-0 translate-x-full md:translate-x-0 md:opacity-100'
            )}>
                <div className="w-[320px] lg:w-[380px] h-full flex flex-col">
                    <AiHelperPanel
                        projectId={project.id}
                        sceneText={currentSceneText}
                        linkedCharacters={projectCharacters.filter(c => activeCharacters[c.id] !== false && activeScene?.scene_characters?.some((sc: any) => sc.characters?.id === c.id))}
                        linkedIdeas={projectIdeas.filter(i => activeIdeas[i.id] !== false && activeScene?.scene_ideas?.some((si: any) => si.ideas?.id === i.id))}
                        linkedLocations={projectLocations.filter(l => activeLocations[l.id] !== false && activeScene?.scene_locations?.some((sl: any) => sl.locations?.id === l.id))}
                        linkedObjects={projectObjects.filter(o => activeObjects[o.id] !== false && activeScene?.scene_objects?.some((so: any) => so.objects?.id === o.id))}
                        selectedNodes={nodes.filter(n => selectedNodeIds.includes(n.id))}
                        allNodes={nodes}
                        allScenes={scenes}
                        projectRelationships={projectRelationships}
                        projectType={project.type as any}
                        projectPremise={project.premise}
                        projectTone={project.tone}
                        aiSettings={aiSettings}
                        activeNodeId={activeNodeId}
                        activeSceneId={activeScene?.id}
                        onClearSelection={() => setSelectedNodeIds([])}
                        onInsert={(content) => editorRef.current?.insertContent(content)}
                    />
                </div>
            </div>

            {/* Comments Sidebar */}
            <div className={cn(
                'bg-white flex flex-col border-l border-slate-200 transition-all duration-300 ease-in-out overflow-hidden z-40 md:z-20',
                'fixed top-14 bottom-0 right-0 md:relative md:inset-auto md:h-full',
                commentsPanelOpen 
                    ? 'w-[320px] lg:w-[380px] opacity-100 translate-x-0' 
                    : 'w-0 border-none opacity-0 translate-x-full md:translate-x-0 md:opacity-100'
            )}>
                <div className="w-[320px] lg:w-[380px] h-full flex flex-col">
                    <CommentsPanel 
                        projectId={project.id}
                        activeNodeId={activeNodeId}
                        onSelectNode={handleSceneSelect}
                    />
                </div>
            </div>

            {/* Scene Assets Sidebar */}
            {activeNodeId && activeScene && (
                <div className={cn(
                    'bg-white flex flex-col border-l border-slate-200 transition-all duration-300 ease-in-out overflow-hidden z-40 md:z-20',
                    'fixed top-14 bottom-0 right-0 md:relative md:inset-auto md:h-full',
                    sceneAssetsOpen 
                        ? 'w-[320px] lg:w-[380px] opacity-100 translate-x-0' 
                        : 'w-0 border-none opacity-0 translate-x-full md:translate-x-0 md:opacity-100'
                )}>
                    <div className="w-[320px] lg:w-[380px] h-full flex flex-col">
                        <SceneAssetsPanel 
                            projectId={project.id}
                            sceneId={activeScene.id}
                            onClose={() => setSceneAssetsOpen(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
