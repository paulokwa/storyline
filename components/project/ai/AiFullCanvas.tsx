'use client'

import React, { useEffect, useMemo } from 'react'
import { Layout, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import AiHelperPanel from '../story/AiHelperPanel'
import { useProjectActions } from '../ProjectContext'
import { getSceneTextForAi } from '@/lib/story/scene-text'
import { readStoredSceneNodeId, resolveSceneNodeId, writeStoredSceneNodeId } from '@/lib/project/active-scene'
import { getAiProviderLabel } from '@/lib/ai/providers'
import { getBillingModeLabel } from '@/lib/ai/modes'
import { formatTrialRemainingPct } from '@/lib/ai/trial'
import { AI_TOUR_COMPLETE_KEY, queueAiTourStart } from '@/lib/ai/tour'

interface AiFullCanvasProps {
    projectId: string
    project: any
    allNodes: any[]
    allScenes: any[]
    projectCharacters: any[]
    projectIdeas: any[]
    projectLocations: any[]
    projectObjects: any[]
    projectRelationships: any[]
    projectAiFeedback: any[]
    aiSettings: any
}

export default function AiFullCanvas({
    projectId,
    project,
    allNodes,
    allScenes,
    projectCharacters,
    projectIdeas,
    projectLocations,
    projectObjects,
    projectRelationships,
    projectAiFeedback,
    aiSettings
}: AiFullCanvasProps) {
    const router = useRouter()
    const { 
        currentSceneText, 
        activeNodeId,
        setActiveNodeId,
        activeCharacters,
        activeIdeas,
        activeLocations,
        activeObjects,
        selectedNodeIds,
        setAiPanelOpen
    } = useProjectActions()

    const activeScene = allScenes.find(s => s.node_id === activeNodeId)
    const sceneNodeIds = useMemo(
        () => new Set(allScenes.map(scene => scene.node_id).filter(Boolean)),
        [allScenes]
    )
    const firstSceneNodeId = useMemo(
        () => allNodes.find(node => node.type === 'scene')?.id ?? null,
        [allNodes]
    )
    const fallbackSceneText = useMemo(
        () => activeScene ? getSceneTextForAi(activeScene.content) : '',
        [activeScene]
    )
    const selectedNodes = allNodes.filter(n => selectedNodeIds.includes(n.id))
    const isAiEnabled = !!aiSettings?.ai_enabled
    const collaborationLabel = isAiEnabled ? getBillingModeLabel(aiSettings?.billing_mode ?? 'app_managed_trial') : 'AI Partner is off'
    const collaborationDotClass = isAiEnabled ? 'bg-green-400' : 'bg-red-400'

    useEffect(() => {
        if (activeNodeId && sceneNodeIds.has(activeNodeId)) return

        const restoredNodeId = resolveSceneNodeId(
            [readStoredSceneNodeId(projectId), firstSceneNodeId],
            sceneNodeIds
        )

        if (restoredNodeId) {
            setActiveNodeId(restoredNodeId)
        }
    }, [activeNodeId, firstSceneNodeId, projectId, sceneNodeIds, setActiveNodeId])

    useEffect(() => {
        if (!activeScene?.node_id) return
        writeStoredSceneNodeId(projectId, activeScene.node_id)
    }, [activeScene?.node_id, projectId])

    useEffect(() => {
        if (typeof window === 'undefined') return
        if (localStorage.getItem(AI_TOUR_COMPLETE_KEY) === 'true') return

        queueAiTourStart()
    }, [])

    const handleReturnToSidebar = () => {
        setAiPanelOpen(true)
        router.push(`/project/${projectId}/story${activeNodeId ? `?nodeId=${activeNodeId}` : ''}`)
    }

    return (
        <div className="ai-full-canvas flex-1 flex flex-col bg-[#fbf9f5] overflow-hidden">
            {/* Minimalist Top Nav for AI Tab */}
            <div className="ai-full-canvas-topnav hidden h-16 items-center justify-between border-b border-slate-200/50 bg-white/50 px-8 backdrop-blur-md md:flex">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={handleReturnToSidebar}
                        className="flex items-center gap-2 rounded-xl px-3 text-slate-500 hover:bg-white/60 hover:text-indigo-600"
                    >
                        <Layout className="w-4 h-4" />
                        <span className="text-sm">Return to Side Panel</span>
                    </Button>
                    <div className="h-4 w-px bg-slate-200" />
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-indigo-500" />
                        </div>
                        <h1 className="text-sm font-serif italic text-slate-800 font-bold">AI Partner</h1>
                    </div>
                </div>
            </div>

            <div className="ai-full-canvas-body flex-1 flex justify-center overflow-hidden">
                <div className="ai-full-canvas-frame w-full flex flex-col h-full bg-white shadow-2xl shadow-slate-200/50 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <AiHelperPanel 
                        projectId={projectId}
                        projectTitle={project.title}
                        sceneText={currentSceneText || fallbackSceneText}
                        onInsert={(content) => {
                            console.log("Full Canvas: AI wants to insert content", content)
                        }}
                        sceneCharacters={activeScene?.scene_characters ?? []}
                        sceneIdeas={activeScene?.scene_ideas ?? []}
                        sceneLocations={activeScene?.scene_locations ?? []}
                        sceneObjects={activeScene?.scene_objects ?? []}
                        linkedCharacters={projectCharacters.filter(c => activeCharacters[c.id] !== false && activeScene?.scene_characters?.some((sc: any) => sc.characters?.id === c.id))}
                        linkedIdeas={projectIdeas.filter(i => activeIdeas[i.id] !== false && activeScene?.scene_ideas?.some((si: any) => si.ideas?.id === i.id))}
                        linkedLocations={projectLocations.filter(l => activeLocations[l.id] !== false && activeScene?.scene_locations?.some((sl: any) => sl.locations?.id === l.id))}
                        linkedObjects={projectObjects.filter(o => activeObjects[o.id] !== false && activeScene?.scene_objects?.some((so: any) => so.objects?.id === o.id))}
                        projectCharacters={projectCharacters}
                        projectIdeas={projectIdeas}
                        projectLocations={projectLocations}
                        projectObjects={projectObjects}
                        selectedNodes={selectedNodes}
                        projectAiFeedback={projectAiFeedback}
                        projectRelationships={projectRelationships}
                        allNodes={allNodes}
                        allScenes={allScenes}
                        aiSettings={aiSettings}
                        projectType={project.type}
                        projectPremise={project.premise}
                        projectTone={project.tone}
                        activeNodeId={activeNodeId}
                        activeSceneId={activeScene?.id}
                        isFullCanvas={true}
                        onReturnToSidebar={handleReturnToSidebar}
                    />
                </div>
            </div>

            {/* Bottom Status Bar */}
            <div className="ai-full-canvas-status hidden min-h-10 items-center justify-between gap-6 border-t border-slate-100 bg-white px-8 py-2 text-[10px] font-medium tracking-[0.08em] text-slate-500 md:flex">
                <div className="flex min-w-0 items-center gap-5">
                    <span className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${collaborationDotClass}`} />
                        {collaborationLabel}
                    </span>
                    {isAiEnabled && <span>AI Model: {getAiProviderLabel(aiSettings.billing_mode === 'app_managed_trial' ? 'openai' : aiSettings.ai_provider)}</span>}
                    {aiSettings?.billing_mode === 'app_managed_trial' && (
                        <span>Trial Left: {formatTrialRemainingPct(aiSettings?.trial?.remaining_micros, aiSettings?.trial?.granted_micros)}%</span>
                    )}
                </div>
                <div className="hidden shrink-0 whitespace-nowrap text-right text-[9px] leading-none tracking-[0.06em] text-slate-500 xl:block">
                    AI only receives the text you send when you use an AI feature. Your project storage mode does not change.
                </div>
            </div>

            <div className="ai-full-canvas-status border-t border-slate-100 bg-white px-4 py-2 text-[10px] font-medium tracking-[0.08em] text-slate-500 md:hidden">
                <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 min-w-0">
                        <div className={`w-1.5 h-1.5 rounded-full ${collaborationDotClass} shrink-0`} />
                        <span className="truncate">{collaborationLabel}</span>
                    </span>
                    {isAiEnabled && <span className="truncate">AI Model: {getAiProviderLabel(aiSettings.billing_mode === 'app_managed_trial' ? 'openai' : aiSettings.ai_provider)}</span>}
                </div>
            </div>
        </div>
    )
}
