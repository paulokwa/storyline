'use client'

import { useEffect, useState } from 'react'
import AiFullCanvas from '@/components/project/ai/AiFullCanvas'
import { loadLocalStoryWorkspaceData } from '@/lib/persistence/local-projects'

type StoryWorkspaceData = Awaited<ReturnType<typeof loadLocalStoryWorkspaceData>>

export default function LocalAiPage({ 
    projectId, 
    aiSettings 
}: { 
    projectId: string, 
    aiSettings: React.ComponentProps<typeof AiFullCanvas>['aiSettings'] 
}) {
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
                console.error('Failed to load local AI workspace:', error)
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
                    {status === 'missing' ? 'Local project data is unavailable.' : 'Opening AI Partner…'}
                </p>
            </div>
        )
    }

    return (
        <AiFullCanvas 
            projectId={projectId}
            project={data.project}
            allNodes={data.nodes}
            allScenes={data.allScenes}
            projectCharacters={data.projectCharacters}
            projectIdeas={data.projectIdeas}
            projectLocations={data.projectLocations}
            projectObjects={data.projectObjects}
            projectRelationships={data.projectRelationships}
            aiSettings={aiSettings}
        />
    )
}
