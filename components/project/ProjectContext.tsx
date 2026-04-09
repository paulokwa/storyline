'use client'

import React, { createContext, useContext, useState } from 'react'

interface ProjectContextType {
    role: 'owner' | 'editor' | 'viewer'
    sidebarOpen: boolean
    setSidebarOpen: (val: boolean | ((prev: boolean) => boolean)) => void
    aiPanelOpen: boolean
    setAiPanelOpen: (val: boolean | ((prev: boolean) => boolean)) => void
    currentSceneText: string
    setCurrentSceneText: (val: string) => void
    // Analysis state (Scene context)
    isAnalyzing: boolean
    setIsAnalyzing: (val: boolean) => void
    analysisResult: any | null
    setAnalysisResult: (val: any | null) => void
    analyzeScene: () => Promise<void>
    activeNodeId: string | null
    setActiveNodeId: (val: string | null) => void
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
    
    // Analysis
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [analysisResult, setAnalysisResult] = useState<any | null>(null)
    const [activeNodeId, setActiveNodeId] = useState<string | null>(null)

    const analyzeScene = async () => {
        if (!currentSceneText.trim()) return
        setIsAnalyzing(true)
        setAnalysisResult(null)
        try {
            const res = await fetch('/api/ai/analyze-scene', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sceneText: currentSceneText }),
            })
            if (res.ok) {
                const data = await res.json()
                setAnalysisResult(data)
                setAiPanelOpen(true) // Automatically open AI helper to show results
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
            isAnalyzing,
            setIsAnalyzing,
            analysisResult,
            setAnalysisResult,
            analyzeScene,
            activeNodeId,
            setActiveNodeId
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
