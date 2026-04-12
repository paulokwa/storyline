import AiFullCanvas from '@/components/project/ai/AiFullCanvas'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AIPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: project } = await supabase.from('projects').select('*').eq('id', id).single()
    const { data: nodes } = await supabase
        .from('structure_nodes')
        .select('*')
        .eq('project_id', id)
        .is('deleted_at', null)
        .order('order_index')

    const [
        { data: projectCharacters },
        { data: projectIdeas },
        { data: projectLocations },
        { data: projectObjects },
        { data: allScenes },
        { data: projectRelationships }
    ] = await Promise.all([
        supabase.from('characters').select('*').eq('project_id', id).is('deleted_at', null).order('order_index'),
        supabase.from('ideas').select('*').eq('project_id', id).is('deleted_at', null).order('order_index'),
        supabase.from('locations').select('*').eq('project_id', id).is('deleted_at', null).order('order_index'),
        supabase.from('objects').select('*').eq('project_id', id).is('deleted_at', null).order('order_index'),
        supabase.from('scenes').select(`
            *,
            scene_characters(characters(*)),
            scene_ideas(ideas(*)),
            scene_locations(locations(*)),
            scene_objects(objects(*))
        `)
        .eq('project_id', id)
        .is('deleted_at', null),
        supabase.from('entity_relationships').select('*').eq('project_id', id)
    ])

    const { data: aiSettings } = (await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', user.id)
        .single()) as { data: any | null }

    return (
        <AiFullCanvas 
            projectId={id}
            project={project!}
            allNodes={nodes ?? []}
            allScenes={allScenes as any ?? []}
            projectCharacters={projectCharacters ?? []}
            projectIdeas={projectIdeas ?? []}
            projectLocations={projectLocations ?? []}
            projectObjects={projectObjects ?? []}
            projectRelationships={projectRelationships ?? []}
            aiSettings={aiSettings ?? { ai_enabled: false }}
        />
    )
}
