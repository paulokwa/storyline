'use client'

import { useEffect, useState } from 'react'
import CharactersTab from '@/components/project/characters/CharactersTab'
import { loadLocalCharactersWorkspaceData } from '@/lib/persistence/local-projects'

type CharactersWorkspaceData = Awaited<ReturnType<typeof loadLocalCharactersWorkspaceData>>

export default function LocalCharactersPage({ projectId }: { projectId: string }) {
    const [data, setData] = useState<CharactersWorkspaceData | null>(null)

    useEffect(() => {
        let cancelled = false
        void loadLocalCharactersWorkspaceData(projectId)
            .then((nextData) => {
                if (!cancelled) setData(nextData)
            })
            .catch((error) => {
                console.error('Failed to load local characters workspace:', error)
                if (!cancelled) setData(null)
            })

        return () => {
            cancelled = true
        }
    }, [projectId])

    if (!data) {
        return (
            <div className="flex flex-1 items-center justify-center bg-[#fbf9f5] px-6 py-12">
                <p className="text-sm font-medium text-slate-400">Loading local characters…</p>
            </div>
        )
    }

    return (
        <CharactersTab
            projectId={projectId}
            characters={data.characters}
            projectType={data.projectType}
            availableEntities={data.availableEntities}
            isLocalProject
        />
    )
}
