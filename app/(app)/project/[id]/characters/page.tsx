import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CharactersTab from '@/components/project/characters/CharactersTab'
import { loadCharactersWorkspaceData } from '@/lib/persistence/project-content'

export default async function CharactersPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    const { characters, projectType, availableEntities } = await loadCharactersWorkspaceData(supabase, id)

    return <CharactersTab projectId={id} characters={characters} projectType={projectType} availableEntities={availableEntities} />
}
