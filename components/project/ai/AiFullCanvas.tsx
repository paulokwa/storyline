'use client'

import React, { useState } from 'react'
import { Sparkles, ArrowLeft, Send, Loader2, MessageSquare, Copy, ChevronLeft, Layout, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

    return (
        <div className="flex-1 flex flex-col bg-[#fbf9f5] overflow-hidden">
            {/* Minimalist Top Nav for AI Tab */}
            <div className="h-16 px-8 flex items-center justify-between border-b border-slate-200/50 bg-white/50 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                            setAiPanelOpen(true)
                            router.push(`/project/${projectId}/story${activeNodeId ? `?nodeId=${activeNodeId}` : ''}`)
                        }}
                        className="rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 gap-2 transition-all"
                    >
                        <Layout className="w-4 h-4" />
                        <span className="hidden sm:inline">Return to Side Panel</span>
                        <span className="sm:hidden">Sidebar</span>
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
                    />
                </div>
            </div>

            {/* Bottom Status Bar */}
            <div className="h-10 px-8 border-t border-slate-100 flex items-center justify-between bg-white text-[9px] uppercase tracking-widest font-bold text-slate-400">
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
        </div>
    )
}
