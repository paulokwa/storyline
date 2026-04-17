'use client'

import React from 'react'
import { Layout, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import AiHelperPanel from '../story/AiHelperPanel'
import { useProjectActions } from '../ProjectContext'

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
    aiSettings
}: AiFullCanvasProps) {
    const router = useRouter()
    const { 
        currentSceneText, 
        activeNodeId,
        activeCharacters,
        activeIdeas,
        activeLocations,
        activeObjects,
        selectedNodeIds,
        setAiPanelOpen
    } = useProjectActions()

    const activeScene = allScenes.find(s => s.node_id === activeNodeId)
    const selectedNodes = allNodes.filter(n => selectedNodeIds.includes(n.id))

    const handleReturnToSidebar = () => {
        setAiPanelOpen(true)
        router.push(`/project/${projectId}/story${activeNodeId ? `?nodeId=${activeNodeId}` : ''}`)
    }

    return (
        <div className="flex-1 flex flex-col bg-[#fbf9f5] overflow-hidden">
            {/* Minimalist Top Nav for AI Tab */}
            <div className="hidden h-16 items-center justify-between border-b border-slate-200/50 bg-white/50 px-8 backdrop-blur-md md:flex">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={handleReturnToSidebar}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-slate-500 transition-all hover:bg-indigo-50/50 hover:text-indigo-600"
                    >
                        <Layout className="w-4 h-4" />
                        <span>Return to Side Panel</span>
                    </button>
                    <div className="h-4 w-px bg-slate-200" />
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-indigo-500" />
                        </div>
                        <h1 className="text-sm font-serif italic text-slate-800 font-bold">AI Partner</h1>
                    </div>
                </div>

            </div>

            <div className="flex-1 flex justify-center overflow-hidden">
                <div className="w-full max-w-5xl flex flex-col h-full bg-white shadow-2xl shadow-slate-200/50 border-x border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <AiHelperPanel 
                        projectId={projectId}
                        sceneText={currentSceneText || ''}
                        onInsert={(content) => {
                            // In full canvas mode, we might want to handle insertion differently
                            // For now, let's just log and maybe navigate back
                            console.log("Full Canvas: AI wants to insert content", content)
                            // We can use the global state if available, but for now we just show the output
                        }}
                        linkedCharacters={projectCharacters.filter(c => activeCharacters[c.id] !== false && activeScene?.scene_characters?.some((sc: any) => sc.characters?.id === c.id))}
                        linkedIdeas={projectIdeas.filter(i => activeIdeas[i.id] !== false && activeScene?.scene_ideas?.some((si: any) => si.ideas?.id === i.id))}
                        linkedLocations={projectLocations.filter(l => activeLocations[l.id] !== false && activeScene?.scene_locations?.some((sl: any) => sl.locations?.id === l.id))}
                        linkedObjects={projectObjects.filter(o => activeObjects[o.id] !== false && activeScene?.scene_objects?.some((so: any) => so.objects?.id === o.id))}
                        selectedNodes={selectedNodes}
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
            <div className="hidden h-10 items-center justify-between border-t border-slate-100 bg-white px-8 text-[9px] font-bold uppercase tracking-widest text-slate-400 md:flex">
                <div className="flex items-center gap-6">
                    <span className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        Ready for collaboration
                    </span>
                    <span>AI Model: {aiSettings.ai_provider}</span>
                </div>
                <div className="hidden sm:block italic lowercase capitalize tracking-normal font-serif text-slate-300">
                    Your story stays private and protected with your AI Partner.
                </div>
            </div>

            <div className="border-t border-slate-100 bg-white px-4 py-2 text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400 md:hidden">
                <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                        <span className="truncate">Ready for collaboration</span>
                    </span>
                    <span className="truncate">AI Model: {aiSettings.ai_provider}</span>
                </div>
            </div>
        </div>
    )
}
