import { createClient } from '@/lib/supabase/server'
import StoryTab from '@/components/project/story/StoryTab'
import type { Database } from '@/lib/supabase/types'
import { requireVerifiedUser } from '@/lib/supabase/auth'
import { getAiRuntimeState } from '@/lib/ai/runtime'

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
        { data: projectAiFeedback },
        { data: allScenes },
        { data: projectRelationships }
    ] = await Promise.all([
        supabase.from('characters').select('*').eq('project_id', id).is('deleted_at', null).order('order_index'),
        supabase.from('ideas').select('*').eq('project_id', id).is('deleted_at', null).order('order_index'),
        supabase.from('locations').select('*').eq('project_id', id).is('deleted_at', null).order('order_index'),
        supabase.from('objects').select('*').eq('project_id', id).is('deleted_at', null).order('order_index'),
        supabase.from('ai_responses').select('*').eq('project_id', id).eq('type', 'analysis_feedback').is('deleted_at', null).order('created_at', { ascending: false }),
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

    const runtime = await getAiRuntimeState(supabase, user.id)

    return (
        <StoryTab
            project={project!}
            initialNodes={nodes ?? []}
            initialScenes={(allScenes as SceneWithLinks[] | null) ?? []}
            projectCharacters={projectCharacters ?? []}
            projectIdeas={projectIdeas ?? []}
            projectLocations={projectLocations ?? []}
            projectObjects={projectObjects ?? []}
            projectAiFeedback={projectAiFeedback ?? []}
            projectRelationships={projectRelationships ?? []}
            aiSettings={{
                ai_enabled: runtime.aiSettings?.ai_enabled ?? true,
                billing_mode: runtime.aiSettings?.billing_mode ?? 'app_managed_trial',
                ai_provider: runtime.aiSettings?.ai_provider ?? 'openai',
                ai_fallback_enabled: runtime.aiSettings?.ai_fallback_enabled ?? false,
                ollama_model: runtime.aiSettings?.ollama_model ?? '',
                ollama_url: runtime.aiSettings?.ollama_url ?? '',
                api_key: runtime.aiSettings?.api_key ?? null,
                trial: runtime.trialAccount,
            }}
        />
    )
}
