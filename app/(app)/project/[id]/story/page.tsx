import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StoryTab from '@/components/project/story/StoryTab'

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: project } = await supabase.from('projects').select('*').eq('id', id).single()
    const { data: nodes } = await supabase
        .from('structure_nodes')
        .select('*')
        .eq('project_id', id)
        .order('order_index')
    const { data: scenes } = await supabase
        .from('scenes')
        .select(`
            *,
            scene_characters(characters(*)),
            scene_ideas(ideas(*))
        `)
        .eq('project_id', id)

    const { data: projectCharacters } = await supabase
        .from('characters')
        .select('*')
        .eq('project_id', id)
        .order('order_index')

    const { data: projectIdeas } = await supabase
        .from('ideas')
        .select('*')
        .eq('project_id', id)
        .order('order_index')

    return (
        <StoryTab
            project={project!}
            initialNodes={nodes ?? []}
            initialScenes={scenes as any ?? []}
            projectCharacters={projectCharacters ?? []}
            projectIdeas={projectIdeas ?? []}
        />
    )
}
