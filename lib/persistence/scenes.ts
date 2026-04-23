import { createClient } from '@/lib/supabase/client'
import { getUserSafely } from '@/lib/supabase/client-auth'
import { captureSceneVersion } from '@/lib/supabase/recovery'
import { getLocalRecord, getLocalRecordsByNodeId, putLocalRecord, LOCAL_STORE_NAMES } from '@/lib/persistence/local-db'
import { isLocalProjectId } from '@/lib/persistence/project-mode'
import type { Database } from '@/lib/supabase/types'

type SceneRow = Database['public']['Tables']['scenes']['Row']
type SceneContent = Database['public']['Tables']['scenes']['Update']['content']

export type SaveSceneContentInput = {
    scene: SceneRow
    localVersion: number
    content: unknown
    currentTitle: string
    initialTitle: string
}

export type SaveSceneContentResult =
    | { status: 'conflict' }
    | { status: 'error'; error: unknown }
    | {
        status: 'saved'
        savedVersion: number
        userId: string | null
    }

export async function saveSceneContent({
    scene,
    localVersion,
    content,
    currentTitle,
    initialTitle,
}: SaveSceneContentInput): Promise<SaveSceneContentResult> {
    if (isLocalProjectId(scene.project_id)) {
        const storedScene = await getLocalRecord<SceneRow>(LOCAL_STORE_NAMES.scenes, scene.id)
        if (!storedScene) {
            return { status: 'error', error: new Error('Local scene not found.') }
        }

        if (storedScene.version !== localVersion) {
            return { status: 'conflict' }
        }

        const updatedScene: SceneRow = {
            ...storedScene,
            content: (content as SceneContent) ?? null,
            updated_at: new Date().toISOString(),
            version: localVersion + 1,
        }

        await putLocalRecord(LOCAL_STORE_NAMES.scenes, updatedScene)

        if (currentTitle !== initialTitle) {
            const storedNode = await getLocalRecord<Database['public']['Tables']['structure_nodes']['Row']>(LOCAL_STORE_NAMES.structureNodes, scene.node_id)
            if (storedNode) {
                await putLocalRecord(LOCAL_STORE_NAMES.structureNodes, {
                    ...storedNode,
                    title: currentTitle,
                })
            }
        }

        return {
            status: 'saved',
            savedVersion: localVersion + 1,
            userId: null,
        }
    }

    const supabase = createClient()
    const { user } = await getUserSafely(supabase)

    const { error: sceneError, count } = await supabase
        .from('scenes')
        .update({
            content: content as SceneContent,
            version: localVersion + 1,
            last_editor_id: user?.id,
            updated_at: new Date().toISOString(),
        }, { count: 'exact' })
        .eq('id', scene.id)
        .eq('version', localVersion)

    await captureSceneVersion(supabase, scene.project_id, scene.id, content)

    let nodeErrorResult: unknown = null
    if (currentTitle !== initialTitle) {
        const { error: nodeError } = await supabase
            .from('structure_nodes')
            .update({ title: currentTitle })
            .eq('id', scene.node_id)
        nodeErrorResult = nodeError
    }

    if (count === 0 && !sceneError) {
        return { status: 'conflict' }
    }

    if (sceneError || nodeErrorResult) {
        return { status: 'error', error: sceneError || nodeErrorResult }
    }

    return {
        status: 'saved',
        savedVersion: localVersion + 1,
        userId: user?.id ?? null,
    }
}

export async function restoreSceneVersion(
    projectId: string,
    sceneId: string,
    content: unknown
) {
    if (isLocalProjectId(projectId)) {
        const scene = await getLocalRecord<SceneRow>(LOCAL_STORE_NAMES.scenes, sceneId)
        if (!scene) throw new Error('Local scene not found.')

        await putLocalRecord(LOCAL_STORE_NAMES.scenes, {
            ...scene,
            content: content as SceneContent,
            updated_at: new Date().toISOString(),
            version: (scene.version ?? 1) + 1,
        })
        return
    }

    const supabase = createClient()
    const { data: currentScene } = await supabase
        .from('scenes')
        .select('*')
        .eq('id', sceneId)
        .single()

    if (currentScene) {
        await captureSceneVersion(supabase, projectId, sceneId, currentScene.content)
    }

    const { error } = await supabase
        .from('scenes')
        .update({
            content: content as SceneContent,
            updated_at: new Date().toISOString(),
        })
        .eq('id', sceneId)

    if (error) throw error
}

export async function insertContentIntoSceneNode(sceneNodeId: string, contentToAppend: string) {
    if (isLocalProjectId(sceneNodeId)) {
        const [scene] = await getLocalRecordsByNodeId<SceneRow>(LOCAL_STORE_NAMES.scenes, sceneNodeId)
        if (scene) {
            const currentContent = (scene as { content?: string | null }).content || ''
            await putLocalRecord(LOCAL_STORE_NAMES.scenes, {
                ...scene,
                content: `${currentContent}<p>${contentToAppend.replace(/\n/g, '<br>')}</p>`,
                updated_at: new Date().toISOString(),
            })
            return
        }
    }

    const supabase = createClient()
    const { data: scene, error: fetchError } = await supabase
        .from('scenes')
        .select('content')
        .eq('node_id', sceneNodeId)
        .single()

    if (fetchError) throw fetchError
    if (!scene) return

    const currentContent = (scene as { content?: string | null }).content || ''
    const newContent = `${currentContent}<p>${contentToAppend.replace(/\n/g, '<br>')}</p>`

    const { error: updateError } = await supabase
        .from('scenes')
        .update({
            content: newContent,
            updated_at: new Date().toISOString(),
        })
        .eq('node_id', sceneNodeId)

    if (updateError) throw updateError
}
