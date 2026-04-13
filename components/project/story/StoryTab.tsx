'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import StructureTree from './StructureTree'
import SceneEditor, { SceneEditorRef } from './SceneEditor'
import AiHelperPanel from './AiHelperPanel'
import SceneAssetsPanel from './SceneAssetsPanel'
import LinkedContext from './LinkedContext'
import SceneAnalysisPanel from './SceneAnalysisPanel'

import { PanelLeftClose, PanelLeftOpen, BookOpen, Sparkles, X, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Database, WritingMode } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'
import { useProjectActions } from '@/components/project/ProjectContext'
import { useComments } from '@/components/project/CommentsContext'
import CommentsPanel from '@/components/project/sidebar/CommentsPanel'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { analyzeContextSize, ContextSizingResult } from '@/lib/ai/config'
import { AiSafeguardDialogs } from '@/components/project/ai/AiSafeguardDialogs'

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
    const searchParams = useSearchParams()
    const { 
        sidebarOpen, setSidebarOpen, 
        aiPanelOpen, setAiPanelOpen, 
        sceneAssetsOpen, setSceneAssetsOpen,
        currentSceneText, setCurrentSceneText,
        analyzeScene, isAnalyzing,
        analysisResult, setAnalysisResult,
        activeNodeId, setActiveNodeId,
        activeCharacters, setActiveCharacters,
        activeIdeas, setActiveIdeas,
        activeLocations, setActiveLocations,
        activeObjects, setActiveObjects,
        selectedNodeIds, setSelectedNodeIds,
        showStructureHint, setShowStructureHint
    } = useProjectActions()
    const [isPeeking, setIsPeeking] = useState(false)
    const { commentsPanelOpen, setCommentsPanelOpen, fetchComments } = useComments()
    
    const [nodes, setNodes] = useState(initialNodes)
    const [scenes, setScenes] = useState(initialScenes)

    // Safeguard States for Analysis
    const [preflight, setPreflight] = useState<ContextSizingResult | null>(null)
    const [isConfirmingCost, setIsConfirmingCost] = useState(false)
    const [isExtremeContext, setIsExtremeContext] = useState(false)

    // Handle initial node selection
    useEffect(() => {
        const nodeIdFromUrl = searchParams.get('nodeId')
        
        if (nodeIdFromUrl) {
            setActiveNodeId(nodeIdFromUrl)
        } else if (!activeNodeId) {
             // Default to first scene if nothing is selected
             setActiveNodeId(initialNodes.find(n => n.type === 'scene')?.id ?? null)
        }

        // On small mobile, if no node is explicitly selected via URL, we show the tree (null id)
        if (typeof window !== 'undefined' && window.innerWidth < 768 && !nodeIdFromUrl) {
            setActiveNodeId(null)
        }
    }, [])

    useEffect(() => {
        fetchComments(project.id)
    }, [project.id, fetchComments])
    const writingMode = (project.writing_mode ?? 'simple') as WritingMode
    
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

    useEffect(() => {
        const isMobile = window.innerWidth < 768
        if (isMobile || sidebarOpen) {
            if (isPeeking) setIsPeeking(false)
            return
        }

        const handleMouseMove = (e: MouseEvent) => {
            if (e.clientX < 40) {
                setIsPeeking(true)
            } else if (e.clientX > 100) {
                setIsPeeking(false)
            }
        }

        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [sidebarOpen, isPeeking])

    const [showExportHint, setShowExportHint] = useState(false)
    const [portalRoot, setPortalRoot] = useState<Element | null>(null)

    useEffect(() => {
        setPortalRoot(document.getElementById('app-nav-portal'))
        
        if (nodes.length >= 5) {
            const discovered = localStorage.getItem('storyline-export-discovered')
            const shownSession = sessionStorage.getItem('storyline-export-shown')
            if (!discovered && !shownSession) {
                const timer = setTimeout(() => {
                    setShowExportHint(true)
                    sessionStorage.setItem('storyline-export-shown', 'true')
                }, 4000)
                return () => clearTimeout(timer)
            }
        }
    }, [nodes.length])

    const dismissExportHint = useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setShowExportHint(false)
        localStorage.setItem('storyline-export-discovered', 'true')
    }, [])



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
                // Deselecting: remove node and all its descendants
                let newSelected = prev.filter(id => !targetIds.includes(id))
                
                // Recursively check parents. If a parent has NO remaining selected children, deselect the parent too.
                const removeEmptyParents = (childId: string, currentSel: string[]): string[] => {
                    const child = nodes.find(n => n.id === childId)
                    if (child && child.parent_id) {
                        const parentId = child.parent_id
                        const siblingIds = nodes.filter(n => n.parent_id === parentId).map(n => n.id)
                        const hasSelectedSiblings = siblingIds.some(id => currentSel.includes(id))
                        if (!hasSelectedSiblings && currentSel.includes(parentId)) {
                            // Uncheck parent
                            const nextSel = currentSel.filter(id => id !== parentId)
                            return removeEmptyParents(parentId, nextSel)
                        }
                    }
                    return currentSel
                }
                
                return removeEmptyParents(nodeId, newSelected)
            } else {
                // Selecting: add node and all its descendants
                const newSelected = [...prev]
                targetIds.forEach(id => {
                    if (!newSelected.includes(id)) newSelected.push(id)
                })
                
                // Also select all ascendants (parents) so the tree accurately reflects the checked state
                const selectParents = (childId: string, currentSel: string[]): string[] => {
                    const child = nodes.find(n => n.id === childId)
                    if (child && child.parent_id) {
                        const parentId = child.parent_id
                        if (!currentSel.includes(parentId)) {
                            currentSel.push(parentId)
                        }
                        return selectParents(parentId, currentSel)
                    }
                    return currentSel
                }

                return selectParents(nodeId, newSelected)
            }
        })
    }, [nodes])

    const handleSceneUpdate = useCallback((updated: Scene) => {
        setScenes((prev: any[]) => prev.map((s: any) => s.id === updated.id ? updated : s))
    }, [])

    const handleTitleUpdate = useCallback((newTitle: string) => {
        setNodes((prev: any[]) => prev.map((n: any) => n.id === activeNodeId ? { ...n, title: newTitle } : n))
    }, [activeNodeId])

    const handleAnalyzeTrigger = () => {
        if (!currentSceneText) return
        
        const analysis = analyzeContextSize(
            currentSceneText, 
            aiSettings.ai_provider, 
            aiSettings.ai_provider === 'gemini' ? (aiSettings.ai_fallback_enabled ? 'gemini-1.5-flash' : 'gemini-1.5-pro') : 'default'
        )
        setPreflight(analysis)

        if (analysis.level === 'extreme') {
            setIsExtremeContext(true)
            return
        }
        if (analysis.level === 'high') {
            setIsConfirmingCost(true)
            return
        }

        // Proceed normally
        analyzeScene()
    }

    return (
        <div className="flex flex-1 overflow-hidden relative">
            {/* Backdrop for mobile */}
            {(sidebarOpen || aiPanelOpen || commentsPanelOpen) && (
                <div 
                    className={cn(
                        "md:hidden absolute inset-0 bg-black/20 backdrop-blur-sm z-30 transition-all duration-500",
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
            <div 
                data-tour="structure-panel"
                onClick={() => {
                    if (isPeeking && !sidebarOpen) {
                        setSidebarOpen(true)
                        setIsPeeking(false)
                    }
                }}
                className={cn(
                'bg-[#f5f4ef] flex flex-col transition-all duration-500 ease-in-out overflow-hidden z-40 md:z-20',
                'absolute top-0 bottom-0 left-0 md:relative md:inset-auto md:h-full',
                sidebarOpen 
                    ? 'w-[280px] lg:w-[320px] border-r border-slate-200 opacity-100 translate-x-0' 
                    : isPeeking
                        ? 'w-4 border-r-2 border-primary/20 bg-primary/5 cursor-pointer opacity-100 translate-x-0 hover:bg-primary/10 transition-colors shadow-[4px_0_12px_rgba(0,0,0,0.02)]'
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
            <div data-tour="main-editor" className="flex-1 flex flex-col overflow-hidden bg-[#fbf9f5] w-full">
                {/* Linked Context (Sticky) */}
                {activeNodeId && activeScene && (
                    <div className="bg-[#fbf9f5] border-b border-slate-100 z-10">
                        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-start sm:items-center justify-between gap-4">
                            <div className="flex-1 snap-row">
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
                            <div className="flex items-center gap-4 shrink-0">
                                <div className="hidden lg:flex items-center gap-1.5 p-1 bg-violet-50/50 rounded-2xl border border-violet-100/50">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleAnalyzeTrigger}
                                                    disabled={isAnalyzing || !currentSceneText}
                                                    className={cn(
                                                        "rounded-xl transition-all h-9 w-9 p-0",
                                                        isAnalyzing ? "bg-white text-violet-600 shadow-sm animate-pulse font-bold" : "text-slate-500 hover:bg-white hover:text-violet-600"
                                                    )}
                                                >
                                                    <Wand2 className="w-4 h-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom">Analyze with AI</TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setAnalysisResult(null)
                                                        setAiPanelOpen(!aiPanelOpen)
                                                    }}
                                                    className={cn(
                                                        "rounded-xl transition-all h-9 w-9 p-0",
                                                        aiPanelOpen ? "bg-white text-indigo-600 shadow-sm font-bold" : "text-slate-500 hover:bg-white hover:text-indigo-600"
                                                    )}
                                                >
                                                    <Sparkles className="w-4 h-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom">Ask AI Partner</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>


                            </div>
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
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-serif italic text-slate-400">Your story awaits...</h3>
                                        <p className="text-sm text-slate-300 font-medium uppercase tracking-[0.2em]">Select a scene to begin writing</p>
                                    </div>
                                    <div className="md:hidden pt-4 flex justify-center">
                                        <button 
                                            onClick={() => {
                                                setSidebarOpen(true)
                                                // Trigger onboarding hint if not discovered
                                                const discovered = localStorage.getItem('storyline-mobile-structure-discovered')
                                                if (!discovered) {
                                                    setShowStructureHint(true)
                                                    // Note: ProjectShell handles persistence when dismissed
                                                }
                                            }}
                                            className="flex flex-col items-center gap-3 group animate-in zoom-in-95 duration-700 delay-300"
                                        >
                                            <div className="w-16 h-16 rounded-[2rem] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-[#546354] group-hover:scale-110 group-hover:shadow-xl transition-all duration-500">
                                                <PanelLeftOpen className="w-7 h-7" />
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] group-hover:text-[#546354] transition-colors">Open Structure</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* AI Helper Sidebar */}
            <div className={cn(
                'bg-white flex flex-col border-l border-slate-200 transition-all duration-300 ease-in-out overflow-hidden z-40 md:z-20',
                'absolute top-0 bottom-0 right-0 md:relative md:inset-auto md:h-full',
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
                'absolute top-0 bottom-0 right-0 md:relative md:inset-auto md:h-full',
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
                    'absolute top-0 bottom-0 right-0 md:relative md:inset-auto md:h-full',
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

            {showExportHint && portalRoot && createPortal(
                <div className="mr-2 animate-in fade-in slide-in-from-right-4 duration-500 hidden sm:flex items-center">
                    <div className="bg-emerald-600 text-white text-[11px] font-medium py-1.5 pl-3 pr-2 rounded-full shadow-lg shadow-emerald-900/10 flex items-center gap-2 whitespace-nowrap relative">
                        <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 border-4 border-transparent border-l-emerald-600" />
                        You can export your project from the menu.
                        <button 
                            onClick={dismissExportHint} 
                            className="bg-white/20 hover:bg-white/30 rounded-full p-0.5 ml-1 transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                </div>,
                portalRoot
            )}
            <SceneAnalysisPanel 
                result={analysisResult} 
                onClose={() => setAnalysisResult(null)} 
                projectType={project.type as any}
                projectId={project.id}
                sceneId={activeNodeId || undefined}
            />

            <AiSafeguardDialogs
                preflight={preflight}
                isConfirmingCost={isConfirmingCost}
                setIsConfirmingCost={setIsConfirmingCost}
                isExtremeContext={isExtremeContext}
                setIsExtremeContext={setIsExtremeContext}
                provider={aiSettings.ai_provider}
                onConfirm={() => {
                    setIsConfirmingCost(false)
                    setIsExtremeContext(false)
                    analyzeScene()
                }}
                onCancel={() => {
                    setIsConfirmingCost(false)
                    setIsExtremeContext(false)
                    setPreflight(null)
                }}
            />
        </div>
    )
}
