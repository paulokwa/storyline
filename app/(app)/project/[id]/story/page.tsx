import { createClient } from '@/lib/supabase/server'
import StoryTab from '@/components/project/story/StoryTab'
import type { Database } from '@/lib/supabase/types'
import { requireVerifiedUser } from '@/lib/supabase/auth'

type SceneWithLinks = Database['public']['Tables']['scenes']['Row'] & {
    scene_characters: { characters: Database['public']['Tables']['characters']['Row'] | null }[]
    scene_ideas: { ideas: Database['public']['Tables']['ideas']['Row'] | null }[]
    scene_locations: { locations: Database['public']['Tables']['locations']['Row'] | null }[]
    scene_objects: { objects: Database['public']['Tables']['objects']['Row'] | null }[]
}

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const user = await requireVerifiedUser()

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

    const { data: aiSettings } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', user.id)
        .single()

    const { data: trialAccount } = await supabase
        .from('ai_trial_accounts')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

    return (
        <StoryTab
            project={project!}
            initialNodes={nodes ?? []}
            initialScenes={(allScenes as SceneWithLinks[] | null) ?? []}
            projectCharacters={projectCharacters ?? []}
            projectIdeas={projectIdeas ?? []}
            projectLocations={projectLocations ?? []}
            projectObjects={projectObjects ?? []}
            projectRelationships={projectRelationships ?? []}
            aiSettings={{
                ...(aiSettings ?? { ai_enabled: true, billing_mode: 'app_managed_trial', ai_provider: 'openai' }),
                trial: trialAccount ?? null,
            }}
        />
    )
}
