import AiFullCanvas from '@/components/project/ai/AiFullCanvas'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAiRuntimeState } from '@/lib/ai/runtime'

import { isLocalProjectId } from '@/lib/persistence/project-mode'
import LocalAiPage from '@/components/project/local/LocalAiPage'

export default async function AIPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: rawId } = await params
    const id = decodeURIComponent(rawId)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const runtime = await getAiRuntimeState(supabase, user.id)
    const aiSettings = {
        ai_enabled: runtime.aiSettings?.ai_enabled ?? true,
        billing_mode: runtime.aiSettings?.billing_mode ?? 'app_managed_trial',
        ai_provider: runtime.aiSettings?.ai_provider ?? 'openai',
        ai_fallback_enabled: runtime.aiSettings?.ai_fallback_enabled ?? false,
        ollama_model: runtime.aiSettings?.ollama_model ?? '',
        ollama_url: runtime.aiSettings?.ollama_url ?? '',
        api_key: runtime.aiSettings?.api_key ?? null,
        trial: runtime.trialAccount,
    }

    if (isLocalProjectId(id)) {
        return <LocalAiPage projectId={id} aiSettings={aiSettings} />
    }

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
        { data: projectRelationships },
        { data: projectAiFeedback }
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
        supabase.from('entity_relationships').select('*').eq('project_id', id),
        supabase.from('ai_responses').select('*').eq('project_id', id).is('deleted_at', null).order('created_at', { ascending: false })
    ])

    return (
        <AiFullCanvas 
            projectId={id}
            project={project!}
            allNodes={nodes ?? []}
            allScenes={allScenes ?? []}
            projectCharacters={projectCharacters ?? []}
            projectIdeas={projectIdeas ?? []}
            projectLocations={projectLocations ?? []}
            projectObjects={projectObjects ?? []}
            projectRelationships={projectRelationships ?? []}
            projectAiFeedback={projectAiFeedback ?? []}
            aiSettings={aiSettings}
        />
    )
}
