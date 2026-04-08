import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CharactersTab from '@/components/project/characters/CharactersTab'

export default async function CharactersPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [{ data: characters }, { data: locations }, { data: objects }, { data: projectData }] = await Promise.all([
        supabase.from('characters').select('*').eq('project_id', id).is('deleted_at', null).order('order_index', { ascending: true }),
        supabase.from('locations').select('id, name').eq('project_id', id).is('deleted_at', null).order('name', { ascending: true }),
        supabase.from('objects').select('id, name').eq('project_id', id).is('deleted_at', null).order('name', { ascending: true }),
        supabase.from('projects').select('type').eq('id', id).single()
    ])

    const project = projectData as any
    const availableEntities = [
        ...((characters || []) as any[]).map(c => ({ id: c.id, name: c.name, type: 'character' as const })),
        ...((locations || []) as any[]).map(l => ({ id: l.id, name: l.name, type: 'location' as const })),
        ...((objects || []) as any[]).map(o => ({ id: o.id, name: o.name, type: 'object' as const }))
    ]

    return <CharactersTab projectId={id} characters={characters || []} projectType={(project?.type as any) || 'novel'} availableEntities={availableEntities} />
}
