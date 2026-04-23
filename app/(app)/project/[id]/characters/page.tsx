import { createClient } from '@/lib/supabase/server'
import LocalCharactersPage from '@/components/project/local/LocalCharactersPage'
import { redirect } from 'next/navigation'
import CharactersTab from '@/components/project/characters/CharactersTab'
import { loadCharactersWorkspaceData } from '@/lib/persistence/project-content'
import { isLocalProjectId } from '@/lib/persistence/project-mode'

export default async function CharactersPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (isLocalProjectId(id)) return <LocalCharactersPage projectId={id} />
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    const { characters, projectType, availableEntities } = await loadCharactersWorkspaceData(supabase, id)

    return <CharactersTab projectId={id} characters={characters} projectType={projectType} availableEntities={availableEntities} />
}
