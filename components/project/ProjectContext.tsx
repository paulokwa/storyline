'use client'

import React, { createContext, useContext, useState } from 'react'
import { getDeviceFingerprint } from '@/lib/client/device-fingerprint'

interface ProjectContextType {
    role: 'owner' | 'editor' | 'viewer'
    sidebarOpen: boolean
    setSidebarOpen: (val: boolean | ((prev: boolean) => boolean)) => void
    aiPanelOpen: boolean
    setAiPanelOpen: (val: boolean | ((prev: boolean) => boolean)) => void
    currentSceneText: string
    setCurrentSceneText: (val: string) => void
    currentSelectionText: string
    setCurrentSelectionText: (val: string) => void
    currentChapterText: string
    setCurrentChapterText: (val: string) => void
    // Analysis state (Scene context)
    isAnalyzing: boolean
    setIsAnalyzing: (val: boolean) => void
    analysisResult: any | null
    setAnalysisResult: (val: any | null) => void
    analyzeScene: () => Promise<void>
    activeNodeId: string | null
    setActiveNodeId: (val: string | null) => void
    sceneAssetsOpen: boolean
    setSceneAssetsOpen: (val: boolean | ((prev: boolean) => boolean)) => void
    // Dictation global sync
    isDictating: boolean
    setIsDictating: (val: boolean) => void
    dictationRequest: number // timestamp logic
    requestDictation: () => void

    // AI Selection Context persistence
    activeCharacters: Record<string, boolean>
    setActiveCharacters: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
    activeIdeas: Record<string, boolean>
    setActiveIdeas: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
    activeLocations: Record<string, boolean>
    setActiveLocations: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
    activeObjects: Record<string, boolean>
    setActiveObjects: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
    selectedNodeIds: string[]
    setSelectedNodeIds: React.Dispatch<React.SetStateAction<string[]>>
    showStructureHint: boolean
    setShowStructureHint: (val: boolean) => void
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({ 
    children,
    role = 'viewer'
}: { 
    children: React.ReactNode,
    role?: 'owner' | 'editor' | 'viewer'
}) {
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [aiPanelOpen, setAiPanelOpen] = useState(false)
    const [currentSceneText, setCurrentSceneText] = useState('')
    const [currentSelectionText, setCurrentSelectionText] = useState('')
    const [currentChapterText, setCurrentChapterText] = useState('')
    const [sceneAssetsOpen, setSceneAssetsOpen] = useState(false)
    
    // Analysis
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [analysisResult, setAnalysisResult] = useState<any | null>(null)
    const [activeNodeId, setActiveNodeId] = useState<string | null>(null)
    const [isDictating, setIsDictating] = useState(false)
    const [dictationRequest, setDictationRequest] = useState(0)

    const [activeCharacters, setActiveCharacters] = useState<Record<string, boolean>>({})
    const [activeIdeas, setActiveIdeas] = useState<Record<string, boolean>>({})
    const [activeLocations, setActiveLocations] = useState<Record<string, boolean>>({})
    const [activeObjects, setActiveObjects] = useState<Record<string, boolean>>({})
    const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
    const [showStructureHint, setShowStructureHint] = useState(false)

    const requestDictation = () => setDictationRequest(Date.now())

    const analyzeScene = async () => {
        if (!currentSceneText.trim()) return
        setIsAnalyzing(true)
        setAnalysisResult(null)
        try {
            const deviceFingerprint = await getDeviceFingerprint()
            const res = await fetch('/api/ai/analyze-scene', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sceneText: currentSceneText,
                    requestId: crypto.randomUUID(),
                    deviceFingerprint,
                }),
            })
            if (res.ok) {
                const data = await res.json()
                setAnalysisResult(data)
                setAiPanelOpen(false) // Close AI Partner when showing analysis
            }
        } catch (e) {
            console.error('Analysis failed', e)
        } finally {
            setIsAnalyzing(false)
        }
    }

    return (
        <ProjectContext.Provider value={{
            role,
            sidebarOpen,
            setSidebarOpen,
            aiPanelOpen,
            setAiPanelOpen,
            currentSceneText,
            setCurrentSceneText,
            currentSelectionText,
            setCurrentSelectionText,
            currentChapterText,
            setCurrentChapterText,
            isAnalyzing,
            setIsAnalyzing,
            analysisResult,
            setAnalysisResult,
            analyzeScene,
            activeNodeId,
            setActiveNodeId,
            sceneAssetsOpen,
            setSceneAssetsOpen,
            isDictating,
            setIsDictating,
            dictationRequest,
            requestDictation,
            activeCharacters,
            setActiveCharacters,
            activeIdeas,
            setActiveIdeas,
            activeLocations,
            setActiveLocations,
            activeObjects,
            setActiveObjects,
            selectedNodeIds,
            setSelectedNodeIds,
            showStructureHint,
            setShowStructureHint
        }}>
            {children}
        </ProjectContext.Provider>
    )
}

export function useProjectActions() {
    const context = useContext(ProjectContext)
    if (!context) throw new Error('useProjectActions must be used within ProjectProvider')
    return context
}
