import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

type Supabase = SupabaseClient<Database>
type SceneWithLinks = Database['public']['Tables']['scenes']['Row'] & {
    scene_characters: { characters: Database['public']['Tables']['characters']['Row'] | null }[]
    scene_ideas: { ideas: Database['public']['Tables']['ideas']['Row'] | null }[]
    scene_locations: { locations: Database['public']['Tables']['locations']['Row'] | null }[]
    scene_objects: { objects: Database['public']['Tables']['objects']['Row'] | null }[]
}

export async function loadStoryWorkspaceData(supabase: Supabase, projectId: string) {
    const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single()
    const { data: nodes } = await supabase
        .from('structure_nodes')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('order_index')

    const [
        { data: projectCharacters },
        { data: projectIdeas },
        { data: projectLocations },
        { data: projectObjects },
        { data: projectAiFeedback },
        { data: allScenes },
        { data: projectRelationships },
    ] = await Promise.all([
        supabase.from('characters').select('*').eq('project_id', projectId).is('deleted_at', null).order('order_index'),
        supabase.from('ideas').select('*').eq('project_id', projectId).is('deleted_at', null).order('order_index'),
        supabase.from('locations').select('*').eq('project_id', projectId).is('deleted_at', null).order('order_index'),
        supabase.from('objects').select('*').eq('project_id', projectId).is('deleted_at', null).order('order_index'),
        supabase.from('ai_responses').select('*').eq('project_id', projectId).eq('type', 'analysis_feedback').is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('scenes').select(`
            *,
            scene_characters(characters(*)),
            scene_ideas(ideas(*)),
            scene_locations(locations(*)),
            scene_objects(objects(*))
        `)
            .eq('project_id', projectId)
            .is('deleted_at', null),
        supabase.from('entity_relationships').select('*').eq('project_id', projectId),
    ])

    return {
        project,
        nodes: nodes ?? [],
        projectCharacters: projectCharacters ?? [],
        projectIdeas: projectIdeas ?? [],
        projectLocations: projectLocations ?? [],
        projectObjects: projectObjects ?? [],
        projectAiFeedback: projectAiFeedback ?? [],
        allScenes: (allScenes as SceneWithLinks[] | null) ?? [],
        projectRelationships: projectRelationships ?? [],
    }
}

export async function loadCharactersWorkspaceData(supabase: Supabase, projectId: string) {
    const [{ data: characters }, { data: locations }, { data: objects }, { data: projectData }] = await Promise.all([
        supabase.from('characters').select('*').eq('project_id', projectId).is('deleted_at', null).order('order_index', { ascending: true }),
        supabase.from('locations').select('id, name').eq('project_id', projectId).is('deleted_at', null).order('name', { ascending: true }),
        supabase.from('objects').select('id, name').eq('project_id', projectId).is('deleted_at', null).order('name', { ascending: true }),
        supabase.from('projects').select('type').eq('id', projectId).single(),
    ])

    const availableEntities = [
        ...((characters ?? []) as Array<{ id: string; name: string }>).map((character) => ({ id: character.id, name: character.name, type: 'character' as const })),
        ...((locations ?? []) as Array<{ id: string; name: string }>).map((location) => ({ id: location.id, name: location.name, type: 'location' as const })),
        ...((objects ?? []) as Array<{ id: string; name: string }>).map((object) => ({ id: object.id, name: object.name, type: 'object' as const })),
    ]

    return {
        characters: characters ?? [],
        projectType: (projectData?.type as Database['public']['Tables']['projects']['Row']['type'] | undefined) ?? 'novel',
        availableEntities,
    }
}

export async function loadIdeasWorkspaceData(supabase: Supabase, projectId: string) {
    const { data: ideas } = await supabase
        .from('ideas')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('order_index', { ascending: true })

    return { ideas: ideas ?? [] }
}

export async function loadLocationsWorkspaceData(supabase: Supabase, projectId: string) {
    const { data: locations } = await supabase
        .from('locations')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('order_index', { ascending: true })

    return { locations: locations ?? [] }
}

export async function loadObjectsWorkspaceData(supabase: Supabase, projectId: string) {
    const { data: objects } = await supabase
        .from('objects')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('order_index', { ascending: true })

    return { objects: objects ?? [] }
}

export async function loadRecoveryWorkspaceData(supabase: Supabase, projectId: string) {
    const [
        { data: deletedNodes },
        { data: deletedCharacters },
        { data: deletedIdeas },
        { data: deletedLocations },
        { data: deletedObjects },
        { data: deletedResponses },
        { data: deletedComments },
        { data: allNodes },
        { data: historyEntries },
        { data: snapshots },
    ] = await Promise.all([
        supabase.from('structure_nodes').select('*').eq('project_id', projectId).not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
        supabase.from('characters').select('*').eq('project_id', projectId).not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
        supabase.from('ideas').select('*').eq('project_id', projectId).not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
        supabase.from('locations').select('*').eq('project_id', projectId).not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
        supabase.from('objects').select('*').eq('project_id', projectId).not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
        supabase.from('ai_responses').select('*').eq('project_id', projectId).not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
        supabase.rpc('get_deleted_project_comments', { project_id_arg: projectId }),
        supabase.from('structure_nodes').select('*').eq('project_id', projectId),
        supabase.from('scene_versions').select(`
            *,
            scenes!inner (
                id,
                node_id,
                structure_nodes!inner (
                    title
                )
            )
        `).eq('project_id', projectId).order('created_at', { ascending: false }).limit(100),
        supabase.from('project_snapshots').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    ])

    return {
        deletedNodes: deletedNodes ?? [],
        deletedCharacters: deletedCharacters ?? [],
        deletedIdeas: deletedIdeas ?? [],
        deletedLocations: deletedLocations ?? [],
        deletedObjects: deletedObjects ?? [],
        deletedResponses: deletedResponses ?? [],
        deletedComments: deletedComments ?? [],
        allNodes: allNodes ?? [],
        historyEntries: historyEntries ?? [],
        snapshots: snapshots ?? [],
    }
}
