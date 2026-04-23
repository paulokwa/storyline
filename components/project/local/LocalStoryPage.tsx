'use client'

import { useEffect, useState } from 'react'
import StoryTab from '@/components/project/story/StoryTab'
import { loadLocalStoryWorkspaceData } from '@/lib/persistence/local-projects'

type StoryWorkspaceData = Awaited<ReturnType<typeof loadLocalStoryWorkspaceData>>

const LOCAL_AI_SETTINGS = {
    ai_enabled: true,
    billing_mode: 'app_managed_trial',
    ai_provider: 'openai',
    ai_fallback_enabled: false,
    ollama_model: '',
    ollama_url: '',
    api_key: null,
    trial: null,
} as const

export default function LocalStoryPage({ projectId }: { projectId: string }) {
    const [data, setData] = useState<StoryWorkspaceData | null>(null)
    const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading')

    useEffect(() => {
        let cancelled = false

        void (async () => {
            try {
                const nextData = await loadLocalStoryWorkspaceData(projectId)
                if (!cancelled) {
                    setData(nextData)
                    setStatus('ready')
                }
            } catch (error) {
                console.error('Failed to load local story workspace:', error)
                if (!cancelled) setStatus('missing')
            }
        })()

        return () => {
            cancelled = true
        }
    }, [projectId])

    if (status !== 'ready' || !data) {
        return (
            <div className="flex flex-1 items-center justify-center bg-[#fbf9f5] px-6 py-12">
                <p className="text-sm font-medium text-slate-400">
                    {status === 'missing' ? 'Local story data is unavailable.' : 'Loading story workspace…'}
                </p>
            </div>
        )
    }

    return (
        <StoryTab
            project={data.project}
            initialNodes={data.nodes}
            initialScenes={data.allScenes}
            projectCharacters={data.projectCharacters}
            projectIdeas={data.projectIdeas}
            projectLocations={data.projectLocations}
            projectObjects={data.projectObjects}
            projectAiFeedback={data.projectAiFeedback}
            projectRelationships={data.projectRelationships}
            aiSettings={LOCAL_AI_SETTINGS}
            storageMode="local-only"
        />
    )
}
