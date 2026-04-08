'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import StructureTree from './StructureTree'
import SceneEditor, { SceneEditorRef } from './SceneEditor'
import AiHelperPanel from './AiHelperPanel'
import LinkedContext from './LinkedContext'
import WritingModeToggle from '@/components/shared/WritingModeToggle'
import { PanelLeftClose, PanelLeftOpen, BookOpen, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Database, WritingMode } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'
import { useProjectActions } from '@/components/project/ProjectContext'

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
    const { sidebarOpen, setSidebarOpen, aiPanelOpen, setAiPanelOpen, currentSceneText, setCurrentSceneText } = useProjectActions()
    
    const [nodes, setNodes] = useState(initialNodes)
    const [scenes, setScenes] = useState(initialScenes)
    const [activeNodeId, setActiveNodeId] = useState<string | null>(
        initialNodes.find(n => n.type === 'scene')?.id ?? null
    )

    // On mobile, we want to go direct to the tab column (list) instead of an entry.
    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setActiveNodeId(null)
        }
    }, [])
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
            {(sidebarOpen || aiPanelOpen) && (
                <div 
                    className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-30 transition-opacity duration-300"
                    onClick={() => {
                        setSidebarOpen(false)
                        setAiPanelOpen(false)
                    }}
                />
            )}

            {/* Left sidebar */}
            <div className={cn(
                'bg-[#f5f4ef] flex flex-col transition-all duration-300 overflow-hidden z-40 md:z-20',
                'fixed top-14 bottom-0 left-0 md:relative md:inset-auto md:h-full',
                sidebarOpen ? 'w-[280px] lg:w-[320px] border-r border-slate-200' : 'w-0 border-none'
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
                        ) : (
                            <div className="flex-1 flex items-center justify-center p-12 text-slate-400 font-serif italic text-lg">
                                Select a scene to begin writing...
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* AI Helper Sidebar */}
            <div className={cn(
                'bg-white flex flex-col border-l border-slate-200 transition-all duration-300 overflow-hidden z-40 md:z-20',
                'fixed top-14 bottom-0 right-0 md:relative md:inset-auto md:h-full',
                aiPanelOpen ? 'w-[320px] lg:w-[380px]' : 'w-0 border-none'
            )}>
                <div className="w-[320px] lg:w-[380px] h-full flex flex-col">
                    <AiHelperPanel
                        projectId={project.id}
                        sceneText={currentSceneText}
                        linkedCharacters={projectCharacters.filter(c => activeCharacters[c.id] !== false && activeScene?.scene_characters?.some((sc: any) => sc.character_id === c.id))}
                        linkedIdeas={projectIdeas.filter(i => activeIdeas[i.id] !== false && activeScene?.scene_ideas?.some((si: any) => si.idea_id === i.id))}
                        linkedLocations={projectLocations.filter(l => activeLocations[l.id] !== false && activeScene?.scene_locations?.some((sl: any) => sl.location_id === l.id))}
                        linkedObjects={projectObjects.filter(o => activeObjects[o.id] !== false && activeScene?.scene_objects?.some((so: any) => so.object_id === o.id))}
                        selectedNodes={nodes.filter(n => selectedNodeIds.includes(n.id))}
                        allNodes={nodes}
                        allScenes={scenes}
                        projectRelationships={projectRelationships}
                        projectType={project.type as any}
                        aiSettings={aiSettings}
                        activeNodeId={activeNodeId}
                        activeSceneId={activeScene?.id}
                        onClearSelection={() => setSelectedNodeIds([])}
                        onInsert={(text) => editorRef.current?.insertText(text)}
                    />
                </div>
            </div>
        </div>
    )
}
