'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import StructureTree from './StructureTree'
import SceneEditor, { SceneEditorRef } from './SceneEditor'
import AiHelperPanel, { getAiAccessIssue, type AiAccessContext } from './AiHelperPanel'
import { queueAiTourStart } from '@/lib/ai/tour'
import SceneAssetsPanel from './SceneAssetsPanel'
import LinkedContext from './LinkedContext'
import SceneAnalysisPanel from './SceneAnalysisPanel'
import { ReaderControls } from './ReaderMode'

import { PanelLeftOpen, BookOpen, Sparkles, X, Wand2, BarChart3, Clapperboard, Book, Download, Square, MessageSquare, Image as ImageIcon, Mic, MicOff, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Database, WritingMode } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'
import { useProjectActions } from '@/components/project/ProjectContext'
import { useComments } from '@/components/project/CommentsContext'
import { useProjectActionsStore } from '@/lib/store/projectActionsStore'
import { useTheme } from '@/components/providers/ThemeProvider'
import CommentsPanel from '@/components/project/sidebar/CommentsPanel'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { analyzeContextSize, ContextSizingResult } from '@/lib/ai/config'
import { AiSafeguardDialogs } from '@/components/project/ai/AiSafeguardDialogs'
import { readStoredSceneNodeId, resolveSceneNodeId, writeStoredSceneNodeId } from '@/lib/project/active-scene'
import { getSceneTextForAi } from '@/lib/story/scene-text'
import type { ProjectStorageMode } from '@/lib/persistence/project-mode'

type Project = Database['public']['Tables']['projects']['Row']
type StructureNode = Database['public']['Tables']['structure_nodes']['Row']
type Scene = Database['public']['Tables']['scenes']['Row']

function extractNodeText(value: any): string {
    if (!value) return ''
    if (typeof value === 'string') return value
    if (Array.isArray(value)) return value.map(extractNodeText).filter(Boolean).join(' ')
    if (typeof value === 'object') {
        const ownText = typeof value.text === 'string' ? value.text : ''
        const childText = Array.isArray(value.content) ? value.content.map(extractNodeText).filter(Boolean).join(' ') : ''
        return [ownText, childText].filter(Boolean).join(' ').trim()
    }
    return ''
}

interface StoryTabProps {
    project: Project
    initialNodes: StructureNode[]
    initialScenes: any[]
    projectCharacters: any[]
    projectIdeas: any[]
    projectLocations: any[]
    projectObjects: any[]
    projectAiFeedback: any[]
    projectRelationships: any[]
    aiSettings: {
        ai_enabled: boolean
        billing_mode: string
        ai_provider: string
        ai_fallback_enabled: boolean
        ollama_model: string
        ollama_url: string
        api_key: string | null
        trial?: {
            status: string
            remaining_micros: number
            granted_micros: number
            consumed_micros: number
        } | null
    }
    storageMode?: ProjectStorageMode
}

export default function StoryTab({ project, initialNodes, initialScenes, projectCharacters, projectIdeas, projectLocations, projectObjects, projectAiFeedback, projectRelationships, aiSettings, storageMode = 'cloud-enabled' }: StoryTabProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { theme } = useTheme()
    const { 
        sidebarOpen, setSidebarOpen, 
        aiPanelOpen, setAiPanelOpen, 
        sceneAssetsOpen, setSceneAssetsOpen,
        currentSceneText, setCurrentSceneText,
        setCurrentChapterText,
        analyzeScene, stopAnalysis, isAnalyzing,
        analysisResult, setAnalysisResult,
        activeNodeId, setActiveNodeId,
        activeCharacters, setActiveCharacters,
        activeIdeas, setActiveIdeas,
        activeLocations, setActiveLocations,
        activeObjects, setActiveObjects,
        selectedNodeIds, setSelectedNodeIds,
        setShowStructureHint,
        currentSelectionText,
        currentChapterText,
        isDictating,
        requestDictation
    } = useProjectActions()
    const { exportAction, statsAction, canExport } = useProjectActionsStore()
    const { commentsPanelOpen, setCommentsPanelOpen, fetchComments, setActiveCommentId } = useComments()
    const isLocalOnly = storageMode === 'local-only'
    const sceneAssetsLabel = project.type === 'tv_script' ? 'Visual References' : 'Gallery'
    
    const [nodes, setNodes] = useState(initialNodes)
    const [scenes, setScenes] = useState(initialScenes)

    // Safeguard States for Analysis
    const [preflight, setPreflight] = useState<ContextSizingResult | null>(null)
    const [isConfirmingCost, setIsConfirmingCost] = useState(false)
    const [isExtremeContext, setIsExtremeContext] = useState(false)
    const [aiAccessContext, setAiAccessContext] = useState<AiAccessContext>('partner')

    useEffect(() => {
        if (project?.id) {
            fetchComments(project.id)
        }
    }, [fetchComments, isLocalOnly, project?.id])
    const writingMode = (project.writing_mode ?? 'simple') as WritingMode
    
    const editorRef = useRef<SceneEditorRef>(null)
    const hasInitializedSelectionRef = useRef(false)
    const sceneNodeIds = useMemo(
        () => new Set(nodes.filter(node => node.type === 'scene').map(node => node.id)),
        [nodes]
    )
    const nodeById = useMemo(
        () => new Map(nodes.map((node) => [node.id, node])),
        [nodes]
    )
    const childrenByParentId = useMemo(() => {
        const map = new Map<string | null, StructureNode[]>()
        for (const node of nodes) {
            const key = node.parent_id ?? null
            const siblings = map.get(key) ?? []
            siblings.push(node)
            map.set(key, siblings)
        }
        for (const siblings of map.values()) {
            siblings.sort((a, b) => a.order_index - b.order_index)
        }
        return map
    }, [nodes])
    const treeOrderIndex = useMemo(() => {
        const order = new Map<string, number>()
        let cursor = 0

        const visit = (parentId: string | null) => {
            const children = childrenByParentId.get(parentId) ?? []
            for (const child of children) {
                order.set(child.id, cursor++)
                visit(child.id)
            }
        }

        visit(null)
        return order
    }, [childrenByParentId])
    const firstSceneNodeId = useMemo(
        () => nodes.find(node => node.type === 'scene')?.id ?? null,
        [nodes]
    )

    const activeScene = scenes.find((s: Scene) => s.node_id === activeNodeId)

    useEffect(() => {
        hasInitializedSelectionRef.current = false
    }, [project.id])

    useEffect(() => {
        const nodeIdFromUrl = searchParams.get('nodeId')

        if (nodeIdFromUrl) {
            setActiveNodeId(resolveSceneNodeId([nodeIdFromUrl], sceneNodeIds) ?? nodeIdFromUrl)
            hasInitializedSelectionRef.current = true
            return
        }

        if (hasInitializedSelectionRef.current) return

        const restoredNodeId = resolveSceneNodeId(
            [readStoredSceneNodeId(project.id), firstSceneNodeId],
            sceneNodeIds
        )

        if (restoredNodeId) {
            setActiveNodeId(restoredNodeId)
            hasInitializedSelectionRef.current = true
            return
        }

        hasInitializedSelectionRef.current = true

        // On small mobile, if we do not have a restorable scene, show the structure tree first.
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setActiveNodeId(null)
            return
        }

        setActiveNodeId(null)
    }, [firstSceneNodeId, project.id, sceneNodeIds, searchParams, setActiveNodeId])

    useEffect(() => {
        if (searchParams.get('feedback') !== '1') return

        setCommentsPanelOpen(true)

        const commentId = searchParams.get('commentId')
        if (commentId) {
            setActiveCommentId(commentId)
        }
    }, [searchParams, setActiveCommentId, setCommentsPanelOpen])

    useEffect(() => {
        if (!activeScene) {
            setCurrentSceneText('')
            return
        }

        setCurrentSceneText(getSceneTextForAi(activeScene.content))
    }, [activeScene, setCurrentSceneText])

    useEffect(() => {
        if (!activeScene?.node_id) return
        writeStoredSceneNodeId(project.id, activeScene.node_id)
    }, [activeScene?.node_id, project.id])

    useEffect(() => {
        if (!activeNodeId) {
            setCurrentChapterText('')
            return
        }

        const activeSceneNode = nodes.find(n => n.id === activeNodeId)
        if (!activeSceneNode) {
            setCurrentChapterText('')
            return
        }

        const containerNode = activeSceneNode.parent_id
            ? nodes.find(n => n.id === activeSceneNode.parent_id) ?? null
            : null

        if (!containerNode) {
            const sceneText = extractNodeText(activeScene?.content).trim()
            setCurrentChapterText(sceneText)
            return
        }

        const chapterText = nodes
            .filter(node => node.type === 'scene' && node.parent_id === containerNode.id)
            .sort((a, b) => a.order_index - b.order_index)
            .map(node => {
                const scene = scenes.find((candidate: Scene) => candidate.node_id === node.id)
                const sceneText = extractNodeText(scene?.content).trim()
                if (!sceneText) return null
                return `${node.title}\n\n${sceneText}`
            })
            .filter((text): text is string => !!text)
            .join('\n\n')

        setCurrentChapterText(chapterText)
    }, [activeNodeId, activeScene, nodes, scenes, setCurrentChapterText])

    useEffect(() => {
        setScenes(initialScenes)
    }, [initialScenes])

    // Realtime Structure Sync
    useEffect(() => {
        if (isLocalOnly) return
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
    }, [activeNodeId, isLocalOnly, project.id, setActiveNodeId])

    const [showExportHint, setShowExportHint] = useState(false)
    const [portalRoot, setPortalRoot] = useState<Element | null>(null)

    useEffect(() => {
        setPortalRoot(document.getElementById('app-nav-portal'))

        if (!canExport) {
            setShowExportHint(false)
            return
        }
        
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
    }, [canExport, nodes.length])

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
    }, [setActiveNodeId, setCurrentSceneText])

    const handleSceneCreated = useCallback((scene: Scene) => {
        setScenes((prev: any[]) => [...prev, scene])
    }, [])

    const getDescendantIds = useCallback((parentId: string): string[] => {
        const descendants: string[] = []

        const visit = (currentParentId: string) => {
            const children = childrenByParentId.get(currentParentId) ?? []
            for (const child of children) {
                descendants.push(child.id)
                visit(child.id)
            }
        }

        visit(parentId)
        return descendants
    }, [childrenByParentId])

    const isDescendantOf = useCallback((nodeId: string, ancestorId: string) => {
        let currentParentId = nodeById.get(nodeId)?.parent_id ?? null
        while (currentParentId) {
            if (currentParentId === ancestorId) return true
            currentParentId = nodeById.get(currentParentId)?.parent_id ?? null
        }
        return false
    }, [nodeById])

    const sortNodeIdsInTreeOrder = useCallback((ids: string[]) => {
        const deduped = Array.from(new Set(ids))
        return deduped.sort((a, b) => {
            if (a === 'virtual-root') return -1
            if (b === 'virtual-root') return 1
            return (treeOrderIndex.get(a) ?? Number.MAX_SAFE_INTEGER) - (treeOrderIndex.get(b) ?? Number.MAX_SAFE_INTEGER)
        })
    }, [treeOrderIndex])

    const buildSelectionExcludingSubtree = useCallback((rootId: string, excludedId: string): string[] => {
        if (rootId === excludedId) return []
        if (!isDescendantOf(excludedId, rootId)) return [rootId]

        const directChildren = childrenByParentId.get(rootId) ?? []
        return directChildren.flatMap((child) => {
            if (child.id === excludedId) return []
            if (isDescendantOf(excludedId, child.id)) {
                return buildSelectionExcludingSubtree(child.id, excludedId)
            }
            return [child.id]
        })
    }, [childrenByParentId, isDescendantOf])

    const normalizeExplicitSelection = useCallback((ids: string[]) => {
        const normalized = new Set(ids)
        let changed = true

        while (changed) {
            changed = false

            for (const node of nodes) {
                const children = childrenByParentId.get(node.id) ?? []
                if (children.length === 0) continue

                const allChildrenExplicitlyCovered = children.every((child) => {
                    if (normalized.has(child.id)) return true
                    return Array.from(normalized).some((selectedId) => isDescendantOf(child.id, selectedId))
                })

                if (!allChildrenExplicitlyCovered) continue

                let removedAnyDescendants = false
                for (const selectedId of Array.from(normalized)) {
                    if (selectedId !== node.id && isDescendantOf(selectedId, node.id)) {
                        normalized.delete(selectedId)
                        removedAnyDescendants = true
                    }
                }

                if (!normalized.has(node.id) || removedAnyDescendants) {
                    normalized.add(node.id)
                    changed = true
                }
            }
        }

        return sortNodeIdsInTreeOrder(Array.from(normalized))
    }, [childrenByParentId, isDescendantOf, nodes, sortNodeIdsInTreeOrder])

    const getEffectiveSelectedNodeIds = useCallback((ids: string[]) => {
        if (ids.includes('virtual-root')) return ['virtual-root']

        const expanded = new Set<string>()
        for (const nodeId of ids) {
            expanded.add(nodeId)
            getDescendantIds(nodeId).forEach((id) => expanded.add(id))
        }

        let changed = true
        while (changed) {
            changed = false

            for (const node of nodes) {
                if (expanded.has(node.id)) continue

                const children = childrenByParentId.get(node.id) ?? []
                if (children.length === 0) continue

                const allChildrenSelected = children.every((child) => expanded.has(child.id))
                if (allChildrenSelected) {
                    expanded.add(node.id)
                    changed = true
                }
            }
        }

        return sortNodeIdsInTreeOrder(Array.from(expanded))
    }, [childrenByParentId, getDescendantIds, nodes, sortNodeIdsInTreeOrder])

    const handleNodeToggleSelection = useCallback((nodeId: string) => {
        setSelectedNodeIds(prev => {
            if (nodeId === 'virtual-root') {
                return prev.includes('virtual-root') ? prev.filter(id => id !== 'virtual-root') : ['virtual-root']
            }

            const explicitIds = prev.filter((id) => id !== 'virtual-root')
            const explicitSet = new Set(explicitIds)
            const descendantIds = getDescendantIds(nodeId)
            
            if (explicitSet.has(nodeId)) {
                explicitSet.delete(nodeId)
                explicitSet.delete('virtual-root')
                descendantIds.forEach((id) => explicitSet.delete(id))
                return normalizeExplicitSelection(Array.from(explicitSet))
            }

            let coveringAncestorId: string | null = null
            let currentParentId = nodeById.get(nodeId)?.parent_id ?? null
            while (currentParentId) {
                if (explicitSet.has(currentParentId)) {
                    coveringAncestorId = currentParentId
                    break
                }
                currentParentId = nodeById.get(currentParentId)?.parent_id ?? null
            }

            if (coveringAncestorId) {
                explicitSet.delete(coveringAncestorId)
                buildSelectionExcludingSubtree(coveringAncestorId, nodeId).forEach((id) => explicitSet.add(id))
                return normalizeExplicitSelection(Array.from(explicitSet))
            }

            const visuallySelected = new Set(getEffectiveSelectedNodeIds(explicitIds)).has(nodeId)
            if (visuallySelected) {
                descendantIds.forEach((id) => explicitSet.delete(id))
                explicitSet.delete(nodeId)
                return normalizeExplicitSelection(Array.from(explicitSet))
            }

            descendantIds.forEach((id) => explicitSet.delete(id))
            for (const explicitId of Array.from(explicitSet)) {
                if (isDescendantOf(explicitId, nodeId)) {
                    explicitSet.delete(explicitId)
                }
            }

            explicitSet.add(nodeId)
            return normalizeExplicitSelection(Array.from(explicitSet))
        })
    }, [buildSelectionExcludingSubtree, getDescendantIds, getEffectiveSelectedNodeIds, isDescendantOf, nodeById, normalizeExplicitSelection, setSelectedNodeIds])

    const effectiveSelectedNodeIds = useMemo(
        () => getEffectiveSelectedNodeIds(selectedNodeIds),
        [getEffectiveSelectedNodeIds, selectedNodeIds]
    )

    const orderedExplicitSelectedNodeIds = useMemo(
        () => sortNodeIdsInTreeOrder(selectedNodeIds),
        [selectedNodeIds, sortNodeIdsInTreeOrder]
    )

    const orderedExplicitSelectedNodes = useMemo(() => {
        return [
            ...(orderedExplicitSelectedNodeIds.includes('virtual-root') ? [{ id: 'virtual-root', title: project.title, type: 'root' }] : []),
            ...orderedExplicitSelectedNodeIds
                .filter((id) => id !== 'virtual-root')
                .map((id) => nodeById.get(id))
                .filter(Boolean)
        ]
    }, [nodeById, orderedExplicitSelectedNodeIds, project.title])

    const handleSceneUpdate = useCallback((updated: Scene) => {
        setScenes((prev: any[]) => prev.map((s: any) => s.id === updated.id ? updated : s))
    }, [])

    const handleTitleUpdate = useCallback((newTitle: string) => {
        setNodes((prev: any[]) => prev.map((n: any) => n.id === activeNodeId ? { ...n, title: newTitle } : n))
    }, [activeNodeId])

    const handleAnalyzeTrigger = () => {
        if (!currentSceneText) return

        const analyzerAccessIssue = getAiAccessIssue(aiSettings, 'analyzer')
        if (analyzerAccessIssue) {
            setAiAccessContext('analyzer')
            setAnalysisResult(null)
            queueAiTourStart()
            setAiPanelOpen(true)
            return
        }
        
        const analysis = analyzeContextSize(
            currentSceneText, 
            aiSettings.billing_mode === 'ollama' ? 'ollama' : aiSettings.billing_mode === 'app_managed_trial' ? 'openai' : aiSettings.ai_provider,
            aiSettings.billing_mode === 'byok' && aiSettings.ai_provider === 'gemini'
                ? (aiSettings.ai_fallback_enabled ? 'gemini-1.5-flash' : 'gemini-1.5-pro')
                : 'default'
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

    const handleToggleAiPanel = () => {
        const nextState = !aiPanelOpen
        if (nextState) {
            setAiAccessContext('partner')
            queueAiTourStart()
            setAnalysisResult(null)
            setCommentsPanelOpen(false)
            setSceneAssetsOpen(false)
        }
        setAiPanelOpen(nextState)
    }

    const handleToggleComments = useCallback(() => {
        const nextState = !commentsPanelOpen
        if (nextState) {
            setAiPanelOpen(false)
            setSceneAssetsOpen(false)
        }
        setCommentsPanelOpen(nextState)
    }, [commentsPanelOpen, setAiPanelOpen, setCommentsPanelOpen, setSceneAssetsOpen])

    const handleToggleAssets = useCallback(() => {
        if (!activeNodeId || !activeScene) return
        const nextState = !sceneAssetsOpen
        if (nextState) {
            setAiPanelOpen(false)
            setCommentsPanelOpen(false)
        }
        setSceneAssetsOpen(nextState)
    }, [activeNodeId, activeScene, sceneAssetsOpen, setAiPanelOpen, setCommentsPanelOpen, setSceneAssetsOpen])

    const handleCloseAiPanel = () => {
        setAiAccessContext('partner')
        setAiPanelOpen(false)
    }

    const closeRightPanels = useCallback(() => {
        setAiPanelOpen(false)
        setCommentsPanelOpen(false)
        setSceneAssetsOpen(false)
        setAiAccessContext('partner')
    }, [setAiPanelOpen, setCommentsPanelOpen, setSceneAssetsOpen])

    const desktopOpenPanel = aiPanelOpen
        ? 'ai'
        : commentsPanelOpen
            ? 'comments'
            : sceneAssetsOpen
                ? 'assets'
                : null

    return (
        <div className="flex flex-1 min-h-0 overflow-hidden relative">
            {/* Backdrop for mobile */}
            {(sidebarOpen || aiPanelOpen || commentsPanelOpen || sceneAssetsOpen) && (
                <div 
                    className={cn(
                        "md:hidden absolute inset-0 bg-black/20 backdrop-blur-sm z-30 transition-all duration-500",
                        (sidebarOpen || aiPanelOpen || commentsPanelOpen || sceneAssetsOpen) ? "opacity-100" : "opacity-0 pointer-events-none"
                    )}
                    onClick={() => {
                        setSidebarOpen(false)
                        closeRightPanels()
                    }}
                />
            )}

            {/* Left sidebar */}
            <div 
                data-tour="structure-panel"
                className={cn(
                    'flex flex-col transition-all duration-500 ease-in-out overflow-hidden z-40 md:z-20',
                    'absolute top-0 bottom-0 left-0 md:relative md:inset-auto md:h-full',
                    sidebarOpen
                        ? 'w-[280px] lg:w-[320px] border-r border-slate-200 opacity-100 translate-x-0 bg-[#f5f4ef]'
                        : theme === 'midnight'
                            ? 'w-0 border-none opacity-0 -translate-x-full md:w-14 md:translate-x-0 md:opacity-100 md:border-r md:border-slate-500/20 md:bg-[linear-gradient(180deg,rgba(19,28,45,0.96)_0%,rgba(16,24,38,0.98)_100%)] md:shadow-[inset_-1px_0_0_rgba(148,163,184,0.08),10px_0_30px_rgba(2,6,23,0.18)]'
                            : 'structure-collapsed-rail w-0 border-none opacity-0 -translate-x-full md:w-14 md:translate-x-0 md:opacity-100 md:border-r md:border-[#d8ddcf] md:bg-[#eef1e8] md:shadow-[inset_-1px_0_0_rgba(84,99,84,0.06)]'
                )}
            >
                {sidebarOpen ? (
                    <div className="w-[280px] lg:w-[320px] h-full min-h-0 flex flex-col overflow-hidden">
                        <StructureTree
                            project={project}
                            nodes={nodes}
                            activeNodeId={activeNodeId}
                            selectedNodeIds={effectiveSelectedNodeIds}
                            onNodeSelect={(id) => {
                                handleSceneSelect(id)
                                if (window.innerWidth < 768) setSidebarOpen(false)
                            }}
                            onNodeToggleSelection={handleNodeToggleSelection}
                            onNodesChange={handleNodesChange}
                            onSceneCreated={handleSceneCreated}
                            onClose={() => setSidebarOpen(false)}
                        />
                    </div>
                ) : (
                    <div className="hidden md:flex h-full w-full items-center justify-center px-2 py-6">
                        <button
                            type="button"
                            onClick={() => setSidebarOpen(true)}
                            className={cn(
                                "group flex h-full w-full flex-col items-center justify-center rounded-[1.5rem] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2",
                                theme === 'midnight'
                                    ? "border border-slate-400/15 bg-[linear-gradient(180deg,rgba(34,48,74,0.48)_0%,rgba(26,37,58,0.58)_100%)] text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_18px_40px_-30px_rgba(0,0,0,0.6)] hover:border-slate-300/20 hover:bg-[linear-gradient(180deg,rgba(44,63,98,0.56)_0%,rgba(32,47,74,0.66)_100%)] hover:text-slate-100 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_20px_44px_-28px_rgba(15,23,42,0.72)] focus-visible:ring-slate-300/20"
                                    : "structure-collapsed-rail-button border border-[#d5dccd] bg-[#f6f8f1] text-[#546354] hover:bg-[#f0f4e8] hover:shadow-[0_12px_30px_rgba(84,99,84,0.08)] focus-visible:ring-[#546354]/20"
                            )}
                            aria-label="Show structure panel"
                        >
                            <PanelLeftOpen className="mb-4 h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                            <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-bold uppercase tracking-[0.28em]">
                                Structure
                            </span>
                        </button>
                    </div>
                )}
            </div>

            {/* Main editor area */}
            <div data-tour="main-editor" className="story-workspace flex-1 flex flex-col overflow-hidden bg-[#fbf9f5] w-full">
                {/* Linked Context (Sticky) */}
                {activeNodeId && activeScene && !isLocalOnly && (
                    <div className="story-workspace-topbar bg-[#fbf9f5] border-b border-slate-100 z-10">
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
                                selectedNodeIds={orderedExplicitSelectedNodeIds}
                                onToggleNodeSelection={handleNodeToggleSelection}
                                allNodes={nodes}
                                />
                            </div>
                            <div className="flex items-center gap-4 shrink-0" />
                        </div>

                    </div>
                )}

                {/* Editor content (Scrolls internally) */}
                <div className="flex-1 overflow-y-auto w-full scroll-smooth custom-scrollbar">
                    <div className="max-w-full mx-auto">
                        {activeNodeId === 'virtual-root' ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="w-24 h-24 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center text-indigo-400 relative">
                                    {project.type === 'tv_script' ? <Clapperboard className="w-10 h-10" /> : <Book className="w-10 h-10" />}
                                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-400 border-2 border-white" />
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-3xl font-serif font-bold text-slate-800">{project.title}</h3>
                                    <div className="flex items-center justify-center gap-2">
                                        <Badge variant="outline" className="bg-white px-3 py-1 text-slate-400 font-bold uppercase tracking-widest text-[10px] rounded-lg border-slate-100">
                                            Entire Project Selected
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                                        {isLocalOnly
                                            ? `You've selected the entire ${project.type === 'tv_script' ? 'screenplay' : 'book'}. Choose a scene from the structure to keep writing.`
                                            : `You've selected the entire ${project.type === 'tv_script' ? 'screenplay' : 'book'}. Use the AI Partner to brainstorm across the project, or view project-wide statistics and structure analysis.`
                                        }
                                    </p>
                                    {!isLocalOnly && (
                                    <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                                        <Button 
                                            onClick={() => statsAction ? statsAction() : router.push(`/project/${project.id}/stats`)}
                                            className="bg-[#546354] hover:bg-[#3d4a3d] text-white rounded-xl gap-2 h-11 px-6 shadow-lg shadow-slate-900/10 transition-all active:scale-95"
                                        >
                                            <BarChart3 className="w-4 h-4" />
                                            Open Full Statistics
                                        </Button>
                                        <Button 
                                            variant="outline"
                                            onClick={() => exportAction?.()}
                                            disabled={!canExport}
                                            className="rounded-xl border-slate-200 text-slate-600 h-11 px-6 bg-white hover:bg-slate-50 transition-all active:scale-95"
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            {canExport ? 'Export Project' : 'Export Disabled by Owner'}
                                        </Button>
                                        <Button 
                                            variant="outline"
                                            onClick={() => {
                                                queueAiTourStart()
                                                setAiPanelOpen(true)
                                            }}
                                            data-tour="ai-sidebar-trigger"
                                            className="rounded-xl border-slate-200 text-slate-600 h-11 px-6 bg-white hover:bg-slate-50 transition-all active:scale-95"
                                        >
                                            <Sparkles className="w-4 h-4 mr-2" />
                                            Ask AI Partner
                                        </Button>
                                    </div>
                                    )}
                                </div>
                            </div>
                        ) : activeNodeId && activeScene ? (
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
                                allowViewerFeedback={project.allow_viewer_feedback ?? false}
                                isLocalProject={isLocalOnly}
                            />
                        ) : (activeNodeId && nodes.find(n => n.id === activeNodeId)?.type === 'scene') ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6 animate-in fade-in duration-500">
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

            {/* Mobile slide-out panels */}
            <div className={cn(
                'story-ai-sidebar bg-white flex flex-col transition-all duration-300 ease-in-out overflow-hidden z-40 absolute top-0 bottom-0 right-0 md:hidden',
                aiPanelOpen ? 'w-[320px] opacity-100 translate-x-0 border-l border-slate-200' : 'w-0 border-none opacity-0 translate-x-full'
            )}>
                <div className="w-[320px] h-full flex flex-col">
                    <AiHelperPanel
                        projectId={project.id}
                        projectTitle={project.title}
                        sceneText={currentSceneText}
                        sceneCharacters={activeScene?.scene_characters ?? []}
                        sceneIdeas={activeScene?.scene_ideas ?? []}
                        sceneLocations={activeScene?.scene_locations ?? []}
                        sceneObjects={activeScene?.scene_objects ?? []}
                        linkedCharacters={projectCharacters.filter(c => activeCharacters[c.id] !== false && activeScene?.scene_characters?.some((sc: any) => sc.characters?.id === c.id))}
                        linkedIdeas={projectIdeas.filter(i => activeIdeas[i.id] !== false && activeScene?.scene_ideas?.some((si: any) => si.ideas?.id === i.id))}
                        linkedLocations={projectLocations.filter(l => activeLocations[l.id] !== false && activeScene?.scene_locations?.some((sl: any) => sl.locations?.id === l.id))}
                        linkedObjects={projectObjects.filter(o => activeObjects[o.id] !== false && activeScene?.scene_objects?.some((so: any) => so.objects?.id === o.id))}
                        linkedAiFeedback={projectAiFeedback.filter(response => response.source_scene_id === activeScene?.id)}
                        projectCharacters={projectCharacters}
                        projectIdeas={projectIdeas}
                        projectLocations={projectLocations}
                        projectObjects={projectObjects}
                        projectAiFeedback={projectAiFeedback}
                        selectedNodes={orderedExplicitSelectedNodes}
                        allNodes={nodes}
                        allScenes={scenes}
                        projectRelationships={projectRelationships}
                        projectType={project.type as any}
                        projectPremise={project.premise}
                        projectTone={project.tone}
                        aiSettings={aiSettings}
                        accessContext={aiAccessContext}
                        allowViewerFeedback={project.allow_viewer_feedback ?? false}
                        activeNodeId={activeNodeId}
                        activeSceneId={activeScene?.id}
                        onClose={handleCloseAiPanel}
                        onClearSelection={() => setSelectedNodeIds([])}
                        onInsert={(content) => editorRef.current?.insertContent(content)}
                    />
                </div>
            </div>

            <div className={cn(
                'bg-white flex flex-col border-l border-slate-200 transition-all duration-300 ease-in-out overflow-hidden z-40 absolute top-0 bottom-0 right-0 md:hidden',
                commentsPanelOpen ? 'w-[320px] opacity-100 translate-x-0' : 'w-0 border-none opacity-0 translate-x-full'
            )}>
                <div className="w-[320px] h-full flex flex-col">
                    <CommentsPanel 
                        projectId={project.id}
                        projectOwnerId={project.user_id}
                        shareOwnerFeedback={project.share_owner_feedback ?? false}
                        allowViewerFeedback={project.allow_viewer_feedback ?? false}
                        activeNodeId={activeNodeId}
                        activeSceneId={activeScene?.id}
                        onSelectNode={handleSceneSelect}
                        onClose={() => setCommentsPanelOpen(false)}
                    />
                </div>
            </div>

            {activeNodeId && activeScene && (
                <div className={cn(
                    'bg-white flex flex-col border-l border-slate-200 transition-all duration-300 ease-in-out overflow-hidden z-40 absolute top-0 bottom-0 right-0 md:hidden',
                    sceneAssetsOpen ? 'w-[320px] opacity-100 translate-x-0' : 'w-0 border-none opacity-0 translate-x-full'
                )}>
                    <div className="w-[320px] h-full flex flex-col">
                        <SceneAssetsPanel 
                            projectId={project.id}
                            sceneId={activeScene.id}
                            projectType={project.type as any}
                            onClose={() => setSceneAssetsOpen(false)}
                        />
                    </div>
                </div>
            )}

            {/* Desktop / tablet utility rail */}
            <div className="hidden md:flex h-full shrink-0">
                {desktopOpenPanel && (
                    <div className={cn(
                        "h-full w-[320px] lg:w-[380px] flex-col overflow-hidden border-l transition-all duration-300 ease-in-out",
                        theme === 'midnight'
                            ? "flex border-slate-500/20 bg-[linear-gradient(180deg,rgba(19,28,45,0.96)_0%,rgba(16,24,38,0.98)_100%)] shadow-[-10px_0_30px_rgba(2,6,23,0.18)]"
                            : "flex border-[#d8ddcf] bg-white"
                    )}>
                        {desktopOpenPanel === 'ai' && (
                            <AiHelperPanel
                                projectId={project.id}
                                projectTitle={project.title}
                                sceneText={currentSceneText}
                                sceneCharacters={activeScene?.scene_characters ?? []}
                                sceneIdeas={activeScene?.scene_ideas ?? []}
                                sceneLocations={activeScene?.scene_locations ?? []}
                                sceneObjects={activeScene?.scene_objects ?? []}
                                linkedCharacters={projectCharacters.filter(c => activeCharacters[c.id] !== false && activeScene?.scene_characters?.some((sc: any) => sc.characters?.id === c.id))}
                                linkedIdeas={projectIdeas.filter(i => activeIdeas[i.id] !== false && activeScene?.scene_ideas?.some((si: any) => si.ideas?.id === i.id))}
                                linkedLocations={projectLocations.filter(l => activeLocations[l.id] !== false && activeScene?.scene_locations?.some((sl: any) => sl.locations?.id === l.id))}
                                linkedObjects={projectObjects.filter(o => activeObjects[o.id] !== false && activeScene?.scene_objects?.some((so: any) => so.objects?.id === o.id))}
                                linkedAiFeedback={projectAiFeedback.filter(response => response.source_scene_id === activeScene?.id)}
                                projectCharacters={projectCharacters}
                                projectIdeas={projectIdeas}
                                projectLocations={projectLocations}
                                projectObjects={projectObjects}
                                projectAiFeedback={projectAiFeedback}
                                selectedNodes={orderedExplicitSelectedNodes}
                                allNodes={nodes}
                                allScenes={scenes}
                                projectRelationships={projectRelationships}
                                projectType={project.type as any}
                                projectPremise={project.premise}
                                projectTone={project.tone}
                                aiSettings={aiSettings}
                                accessContext={aiAccessContext}
                                allowViewerFeedback={project.allow_viewer_feedback ?? false}
                                activeNodeId={activeNodeId}
                                activeSceneId={activeScene?.id}
                                onClose={handleCloseAiPanel}
                                onClearSelection={() => setSelectedNodeIds([])}
                                onInsert={(content) => editorRef.current?.insertContent(content)}
                            />
                        )}
                        {desktopOpenPanel === 'comments' && (
                            <CommentsPanel 
                                projectId={project.id}
                                projectOwnerId={project.user_id}
                                shareOwnerFeedback={project.share_owner_feedback ?? false}
                                allowViewerFeedback={project.allow_viewer_feedback ?? false}
                                activeNodeId={activeNodeId}
                                activeSceneId={activeScene?.id}
                                onSelectNode={handleSceneSelect}
                                onClose={() => setCommentsPanelOpen(false)}
                            />
                        )}
                        {desktopOpenPanel === 'assets' && activeScene && (
                            <SceneAssetsPanel 
                                projectId={project.id}
                                sceneId={activeScene.id}
                                projectType={project.type as any}
                                onClose={() => setSceneAssetsOpen(false)}
                            />
                        )}
                    </div>
                )}

                <div
                    className={cn(
                        "story-utility-rail flex h-full w-14 flex-col items-center justify-center border-l px-2 py-6",
                        theme === 'midnight'
                            ? "border-slate-500/20 bg-[linear-gradient(180deg,rgba(19,28,45,0.96)_0%,rgba(16,24,38,0.98)_100%)] shadow-[inset_1px_0_0_rgba(148,163,184,0.08),-10px_0_30px_rgba(2,6,23,0.18)]"
                            : "bg-[#eef1e8] border-[#d8ddcf] shadow-[inset_1px_0_0_rgba(84,99,84,0.06)]"
                    )}
                >
                    <div
                        className={cn(
                            "flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[1.5rem] px-0 py-5 transition-all duration-300",
                            theme === 'midnight'
                                ? "border border-slate-400/15 bg-[linear-gradient(180deg,rgba(34,48,74,0.48)_0%,rgba(26,37,58,0.58)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_18px_40px_-30px_rgba(0,0,0,0.6)]"
                                : "border border-[#d5dccd] bg-[#f6f8f1] shadow-[0_12px_30px_rgba(84,99,84,0.08)]"
                        )}
                    >
                        <TooltipProvider>
                            <div className="flex w-full flex-col items-center gap-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                        type="button"
                                        onClick={isAnalyzing ? stopAnalysis : handleAnalyzeTrigger}
                                        disabled={!isAnalyzing && !currentSceneText}
                                        className={cn(
                                            "flex h-9 w-9 items-center justify-center rounded-2xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-45",
                                            isAnalyzing
                                                ? "bg-violet-100 text-violet-700 shadow-sm ring-2 ring-violet-200/70"
                                                : theme === 'midnight'
                                                        ? "text-slate-300 hover:bg-white/8 hover:text-violet-200 focus-visible:ring-slate-300/20"
                                                        : "text-slate-500 hover:bg-white/80 hover:text-violet-700 focus-visible:ring-[#546354]/20"
                                            )}
                                            aria-label={isAnalyzing ? 'Stop analysis' : 'Analyze this scene'}
                                        >
                                            {isAnalyzing ? <Square className="h-4 w-4 fill-current" /> : <Wand2 className="h-4 w-4" />}
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">{isAnalyzing ? 'Stop analysis' : 'Analyze this scene'}</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                        type="button"
                                        onClick={handleToggleAiPanel}
                                        data-tour="ai-sidebar-trigger"
                                        className={cn(
                                            "flex h-9 w-9 items-center justify-center rounded-2xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2",
                                            aiPanelOpen
                                                ? theme === 'midnight'
                                                    ? "bg-white/10 text-indigo-200 shadow-sm ring-1 ring-white/10"
                                                        : "bg-white text-indigo-600 shadow-sm"
                                                    : theme === 'midnight'
                                                        ? "text-slate-300 hover:bg-white/8 hover:text-indigo-200 focus-visible:ring-slate-300/20"
                                                        : "text-slate-500 hover:bg-white/80 hover:text-indigo-600 focus-visible:ring-[#546354]/20"
                                            )}
                                            aria-label="Open AI Partner rail"
                                        >
                                            <Sparkles className="h-4 w-4" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">AI Partner</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                        type="button"
                                        onClick={handleToggleAssets}
                                        disabled={!activeNodeId || !activeScene}
                                        className={cn(
                                            "flex h-9 w-9 items-center justify-center rounded-2xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-45",
                                            sceneAssetsOpen
                                                ? theme === 'midnight'
                                                    ? "bg-white/10 text-emerald-200 shadow-sm ring-1 ring-white/10"
                                                        : "bg-white text-emerald-600 shadow-sm"
                                                    : theme === 'midnight'
                                                        ? "text-slate-300 hover:bg-white/8 hover:text-emerald-200 focus-visible:ring-slate-300/20"
                                                        : "text-slate-500 hover:bg-white/80 hover:text-emerald-600 focus-visible:ring-[#546354]/20"
                                            )}
                                            aria-label={sceneAssetsLabel}
                                        >
                                            <ImageIcon className="h-4 w-4" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">{sceneAssetsLabel}</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                        type="button"
                                        onClick={handleToggleComments}
                                        className={cn(
                                            "flex h-9 w-9 items-center justify-center rounded-2xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2",
                                            commentsPanelOpen
                                                ? theme === 'midnight'
                                                    ? "bg-white/10 text-rose-200 shadow-sm ring-1 ring-white/10"
                                                        : "bg-white text-rose-600 shadow-sm"
                                                    : theme === 'midnight'
                                                        ? "text-slate-300 hover:bg-white/8 hover:text-rose-200 focus-visible:ring-slate-300/20"
                                                        : "text-slate-500 hover:bg-white/80 hover:text-rose-600 focus-visible:ring-[#546354]/20"
                                            )}
                                            aria-label="Feedback"
                                        >
                                            <MessageSquare className="h-4 w-4" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">Feedback</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                        type="button"
                                        onClick={requestDictation}
                                        className={cn(
                                            "flex h-9 w-9 items-center justify-center rounded-2xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2",
                                            isDictating
                                                ? theme === 'midnight'
                                                    ? "bg-red-500/12 text-red-200 shadow-sm ring-1 ring-red-300/25"
                                                        : "bg-white text-red-600 shadow-sm"
                                                    : theme === 'midnight'
                                                        ? "text-slate-300 hover:bg-white/8 hover:text-red-200 focus-visible:ring-slate-300/20"
                                                        : "text-slate-500 hover:bg-white/80 hover:text-red-600 focus-visible:ring-[#546354]/20"
                                            )}
                                            aria-label="Dictate"
                                        >
                                            {isDictating ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">Dictate</TooltipContent>
                                </Tooltip>

                                <ReaderControls
                                    getSelection={() => currentSelectionText}
                                    getScene={() => currentSceneText}
                                    getChapter={() => currentChapterText}
                                    getSceneChunks={() => currentSceneText.split(/\n{2,}/).map((block) => block.replace(/\s+/g, ' ').trim()).filter(Boolean)}
                                    getChapterChunks={() => currentChapterText.split(/\n{2,}/).map((block) => block.replace(/\s+/g, ' ').trim()).filter(Boolean)}
                                    mode="icon-only"
                                    align="right"
                                    side="left"
                                    tooltipLabel="Read aloud"
                                    triggerClassName={cn(
                                        "bg-transparent",
                                        theme === 'midnight'
                                            ? "text-slate-300 hover:bg-white/8 hover:text-indigo-200 focus-visible:ring-slate-300/20"
                                            : "text-slate-500 hover:bg-white/80 hover:text-indigo-600 focus-visible:ring-[#546354]/20",
                                        "data-[state=open]:bg-indigo-50 data-[state=open]:text-slate-700"
                                    )}
                                />

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                        type="button"
                                        onClick={() => router.push(`/project/${project.id}/help`)}
                                        data-tour="help-icon"
                                        className={cn(
                                            "flex h-9 w-9 items-center justify-center rounded-2xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2",
                                            theme === 'midnight'
                                                ? "text-slate-300 hover:bg-white/8 hover:text-[#dbe5ff] focus-visible:ring-slate-300/20"
                                                : "text-slate-500 hover:bg-white/80 hover:text-primary focus-visible:ring-[#546354]/20"
                                        )}
                                        aria-label="Help center"
                                        >
                                            <HelpCircle className="h-4 w-4" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">Help center</TooltipContent>
                                </Tooltip>
                            </div>
                        </TooltipProvider>
                    </div>
                </div>
            </div>

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
                sceneId={activeScene?.id || undefined}
                nodeId={activeNodeId || undefined}
            />

            <AiSafeguardDialogs
                preflight={preflight}
                isConfirmingCost={isConfirmingCost}
                setIsConfirmingCost={setIsConfirmingCost}
                isExtremeContext={isExtremeContext}
                setIsExtremeContext={setIsExtremeContext}
                provider={aiSettings.billing_mode === 'ollama' ? 'ollama' : aiSettings.billing_mode === 'app_managed_trial' ? 'openai' : aiSettings.ai_provider}
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
