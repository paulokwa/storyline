import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CharactersTab from '@/components/project/characters/CharactersTab'

export default async function CharactersPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [{ data: characters }, { data: projectData }] = await Promise.all([
        supabase.from('characters').select('*').eq('project_id', id).order('order_index', { ascending: true }),
        supabase.from('projects').select('type').eq('id', id).single()
    ])

    const project = projectData as any

    return <CharactersTab projectId={id} characters={characters || []} projectType={project?.type || 'novel'} />
}
