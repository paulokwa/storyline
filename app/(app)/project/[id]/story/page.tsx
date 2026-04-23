import { createClient } from '@/lib/supabase/server'
import StoryTab from '@/components/project/story/StoryTab'
import { requireVerifiedUser } from '@/lib/supabase/auth'
import { getAiRuntimeState } from '@/lib/ai/runtime'
import { loadStoryWorkspaceData } from '@/lib/persistence/project-content'

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const user = await requireVerifiedUser()
    const {
        project,
        nodes,
        projectCharacters,
        projectIdeas,
        projectLocations,
        projectObjects,
        projectAiFeedback,
        allScenes,
        projectRelationships,
    } = await loadStoryWorkspaceData(supabase, id)

    const runtime = await getAiRuntimeState(supabase, user.id)

    return (
        <StoryTab
            project={project!}
            initialNodes={nodes}
            initialScenes={allScenes}
            projectCharacters={projectCharacters}
            projectIdeas={projectIdeas}
            projectLocations={projectLocations}
            projectObjects={projectObjects}
            projectAiFeedback={projectAiFeedback}
            projectRelationships={projectRelationships}
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
