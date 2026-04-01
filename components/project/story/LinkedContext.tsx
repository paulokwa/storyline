import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Users, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Entity {
    id: string
    name?: string
    title?: string
}

interface LinkedContextProps {
    sceneId: string
    sceneCharacters: { characters: any }[]
    sceneIdeas: { ideas: any }[]
    projectCharacters: any[]
    projectIdeas: any[]
    onUpdate: () => void
}

export default function LinkedContext({ 
    sceneId, 
    sceneCharacters, 
    sceneIdeas, 
    projectCharacters, 
    projectIdeas,
    onUpdate
}: LinkedContextProps) {
    const supabase = createClient()
    const [isPending, startTransition] = useTransition()

    const linkedChars = sceneCharacters?.map(sc => sc.characters).filter(Boolean) || []
    const linkedIds = sceneIdeas?.map(si => si.ideas).filter(Boolean) || []

    const unlinkedCharacters = projectCharacters.filter(pc => !linkedChars.some(lc => lc.id === pc.id))
    const unlinkedIdeas = projectIdeas.filter(pi => !linkedIds.some(li => li.id === pi.id))

    async function addCharacter(characterId: string) {
        startTransition(async () => {
            // @ts-ignore
            const { error } = await supabase.from('scene_characters' as any).insert({ scene_id: sceneId, character_id: characterId })
            if (!error || error.code === '23505') onUpdate()
        })
    }

    async function removeCharacter(characterId: string) {
        startTransition(async () => {
            await supabase.from('scene_characters' as any).delete().eq('scene_id', sceneId).eq('character_id', characterId)
            onUpdate()
        })
    }

    async function addIdea(ideaId: string) {
        startTransition(async () => {
            // @ts-ignore
            const { error } = await supabase.from('scene_ideas' as any).insert({ scene_id: sceneId, idea_id: ideaId })
            if (!error || error.code === '23505') onUpdate()
        })
    }

    async function removeIdea(ideaId: string) {
        startTransition(async () => {
            await supabase.from('scene_ideas' as any).delete().eq('scene_id', sceneId).eq('idea_id', ideaId)
            onUpdate()
        })
    }

    return (
        <div className="flex flex-col gap-4 mb-8 bg-black/5 p-4 rounded-2xl border border-black/5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#546354]/60">Linked Context</h3>
            
            <div className="flex flex-wrap gap-2">
                {/* Linked Characters */}
                {linkedChars.map(char => (
                    <div key={char.id} className="flex items-center gap-2 bg-[#546354]/10 text-[#546354] px-3 py-1.5 rounded-full text-sm font-medium">
                        <Users className="w-3.5 h-3.5 opacity-60" />
                        {char.name}
                        <button onClick={() => removeCharacter(char.id)} className="ml-1 opacity-50 hover:opacity-100 transition-opacity" disabled={isPending}>
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
                
                {/* Linked Ideas */}
                {linkedIds.map(idea => (
                    <div key={idea.id} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full text-sm font-medium border border-indigo-100/50">
                        <Lightbulb className="w-3.5 h-3.5 opacity-60" />
                        {idea.title}
                        <button onClick={() => removeIdea(idea.id)} className="ml-1 opacity-50 hover:opacity-100 transition-opacity" disabled={isPending}>
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}

                {/* Add Character Dropdown */}
                {unlinkedCharacters.length > 0 && (
                    <div className="relative flex items-center bg-transparent border border-dashed border-[#546354]/30 text-[#546354] rounded-full px-3 py-1 h-8 opacity-70 hover:opacity-100 hover:bg-[#546354]/5 transition-colors">
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        <select 
                            className="bg-transparent text-sm font-medium outline-none appearance-none cursor-pointer pr-4"
                            value=""
                            onChange={(e) => e.target.value && addCharacter(e.target.value)}
                            disabled={isPending}
                        >
                            <option value="" disabled>Character</option>
                            {unlinkedCharacters.map(char => (
                                <option key={char.id} value={char.id}>{char.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Add Idea Dropdown */}
                {unlinkedIdeas.length > 0 && (
                    <div className="relative flex items-center bg-transparent border border-dashed border-indigo-300 text-indigo-600 rounded-full px-3 py-1 h-8 opacity-70 hover:opacity-100 hover:bg-indigo-50 transition-colors">
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        <select 
                            className="bg-transparent text-sm font-medium outline-none appearance-none cursor-pointer pr-4"
                            value=""
                            onChange={(e) => e.target.value && addIdea(e.target.value)}
                            disabled={isPending}
                        >
                            <option value="" disabled>Idea</option>
                            {unlinkedIdeas.map(idea => (
                                <option key={idea.id} value={idea.id}>{idea.title}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
        </div>
    )
}
