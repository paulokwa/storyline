import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';

type EntityTable = 'characters' | 'ideas' | 'locations' | 'objects' | 'ai_responses';

function getRecoveryErrorMessage(error: unknown) {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === 'object' && error !== null) {
        const candidate = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
        const parts = [candidate.message, candidate.details, candidate.hint, candidate.code]
            .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

        if (parts.length > 0) {
            return parts.join(' | ');
        }
    }

    return String(error);
}

/**
 * Soft deletes a structure node and all its descendants recursively.
 * Also soft deletes all linked scenes.
 */
export async function softDeleteStructureNode(
    supabase: SupabaseClient<Database>,
    projectId: string,
    nodeId: string,
    allNodes: Database['public']['Tables']['structure_nodes']['Row'][]
) {
    const deletedAt = new Date().toISOString();
    const descendantIds = getDescendantIds(allNodes, nodeId);
    const allIdsToDelete = [nodeId, ...descendantIds];

    // 1. Soft delete structure nodes
    const { error: nodeError } = await supabase
        .from('structure_nodes')
        .update({ deleted_at: deletedAt })
        .in('id', allIdsToDelete);

    if (nodeError) throw nodeError;

    // 2. Soft delete matching scenes
    const { error: sceneError } = await supabase
        .from('scenes')
        .update({ deleted_at: deletedAt })
        .in('node_id', allIdsToDelete);

    if (sceneError) throw sceneError;

    return allIdsToDelete;
}

/**
 * Restores a structure node and its descendants.
 * Also restores linked scenes.
 */
export async function restoreStructureNode(
    supabase: SupabaseClient<Database>,
    nodeId: string,
    descendantIds: string[]
) {
    const allIdsToRestore = [nodeId, ...descendantIds];

    // 1. Restore structure nodes
    const { error: nodeError } = await supabase
        .from('structure_nodes')
        .update({ deleted_at: null })
        .in('id', allIdsToRestore);

    if (nodeError) throw nodeError;

    // 2. Restore matching scenes
    const { error: sceneError } = await supabase
        .from('scenes')
        .update({ deleted_at: null })
        .in('node_id', allIdsToRestore);

    if (sceneError) throw sceneError;

    return allIdsToRestore;
}

export async function softDeleteEntity(
    supabase: SupabaseClient<Database>,
    table: EntityTable,
    id: string
) {
    const { error } = await supabase.from(table as any)
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('id', id);

    if (error) throw error;
}

export async function restoreEntity(
    supabase: SupabaseClient<Database>,
    table: EntityTable,
    id: string
) {
    const { error } = await supabase.from(table as any)
        .update({ deleted_at: null } as any)
        .eq('id', id);

    if (error) throw error;
}

export async function restoreDeletedComment(
    supabase: SupabaseClient<Database>,
    id: string
) {
    const { error } = await supabase.rpc('restore_project_comment', { comment_id_arg: id });
    if (error) throw error;
}

export async function permanentlyDeleteComment(
    supabase: SupabaseClient<Database>,
    id: string
) {
    const { error } = await supabase.rpc('permanently_delete_project_comment', { comment_id_arg: id });
    if (error) throw error;
}

/**
 * Helper to get descendant IDs from a flat list of nodes
 */
function getDescendantIds(nodes: Database['public']['Tables']['structure_nodes']['Row'][], parentId: string): string[] {
    const children = nodes.filter(n => n.parent_id === parentId);
    return children.flatMap(c => [c.id, ...getDescendantIds(nodes, c.id)]);
}

/**
 * Captures a scene version if the content has changed.
 * Enforces a 20-version cap per scene.
 */
export async function captureSceneVersion(
    supabase: SupabaseClient<Database>,
    projectId: string,
    sceneId: string,
    content: any
) {
    // 1. Get latest version to avoid duplicates
    const { data: latestVersion, error: fetchError } = await supabase
        .from('scene_versions')
        .select('content')
        .eq('scene_id', sceneId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (fetchError) throw fetchError;

    // Compare content
    const currentContentStr = JSON.stringify(content);
    const latestContentStr = latestVersion ? JSON.stringify(latestVersion.content) : null;

    if (currentContentStr === latestContentStr) {
        return; // No change, skip
    }

    // 2. Insert new version
    const { error: insertError } = await supabase
        .from('scene_versions')
        .insert({
            project_id: projectId,
            scene_id: sceneId,
            content: content || ''
        });

    if (insertError) throw insertError;

    // 3. Prune old versions (keep latest 20)
    const { data: versions, error: listError } = await supabase
        .from('scene_versions')
        .select('id')
        .eq('scene_id', sceneId)
        .order('created_at', { ascending: false });

    if (listError) throw listError;

    if (versions && versions.length > 20) {
        const idsToDelete = versions.slice(20).map(v => v.id);
        const { error: pruneError } = await supabase
            .from('scene_versions')
            .delete()
            .in('id', idsToDelete);
        
        if (pruneError) console.error('Error pruning scene versions:', pruneError);
    }
}

/**
 * Creates a manual project snapshot.
 * Captures all active structure, content, and assets.
 */
export async function createProjectSnapshot(
    supabase: SupabaseClient<Database>,
    projectId: string,
    name: string,
    description?: string | null
) {
    // 1. Enforce 5 snapshot limit
    const { count, error: countError } = await supabase
        .from('project_snapshots')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

    if (countError) throw countError;
    if (count !== null && count >= 5) {
        throw new Error('Project snapshot limit reached (max 5). Please delete an existing snapshot first.');
    }

    // 2. Fetch all active state
    const fetchActive = (table: any) => (supabase.from(table as any) as any).select('*').eq('project_id', projectId).is('deleted_at', null);
    
    const [
        { data: nodes },
        { data: scenes },
        { data: characters },
        { data: ideas },
        { data: locations },
        { data: objects },
        { data: aiResponses },
        // Join tables (don't have project_id in all of them, but we can filter by project_id in most)
        { data: sceneCharacters },
        { data: sceneIdeas },
        { data: sceneLocations },
        { data: sceneObjects },
        { data: entityRelationships }
    ] = await Promise.all([
        fetchActive('structure_nodes'),
        fetchActive('scenes'),
        fetchActive('characters'),
        fetchActive('ideas'),
        fetchActive('locations'),
        fetchActive('objects'),
        fetchActive('ai_responses'),
        // Joins - filter by project_id where available, or just take those belonging to active scenes
        supabase.from('scene_characters').select('*, scenes!inner(project_id)').eq('scenes.project_id', projectId),
        supabase.from('scene_ideas').select('*, scenes!inner(project_id)').eq('scenes.project_id', projectId),
        supabase.from('scene_locations').select('*, scenes!inner(project_id)').eq('scenes.project_id', projectId),
        supabase.from('scene_objects').select('*, scenes!inner(project_id)').eq('scenes.project_id', projectId),
        supabase.from('entity_relationships').select('*').eq('project_id', projectId)
    ]);

    const snapshotData = {
        nodes: nodes || [],
        scenes: scenes || [],
        characters: characters || [],
        ideas: ideas || [],
        locations: locations || [],
        objects: objects || [],
        aiResponses: aiResponses || [],
        sceneCharacters: sceneCharacters || [],
        sceneIdeas: sceneIdeas || [],
        sceneLocations: sceneLocations || [],
        sceneObjects: sceneObjects || [],
        entityRelationships: entityRelationships || [],
        metadata: {
            nodeCount: nodes?.length || 0,
            sceneCount: scenes?.length || 0,
            characterCount: characters?.length || 0,
            ideaCount: ideas?.length || 0,
            locationCount: locations?.length || 0,
            objectCount: objects?.length || 0,
            aiResponseCount: aiResponses?.length || 0,
            capturedAt: new Date().toISOString()
        }
    };

    // 3. Store snapshot
    const { error: insertError } = await supabase
        .from('project_snapshots')
        .insert({
            project_id: projectId,
            name,
            description,
            snapshot_data: snapshotData as any
        });

    if (insertError) throw insertError;
}

export async function restoreProjectSnapshot(
    supabase: SupabaseClient<Database>,
    snapshotId: string
) {
    // 1. Fetch snapshot
    const { data: snapshot, error: fetchError } = await supabase
        .from('project_snapshots')
        .select('*')
        .eq('id', snapshotId)
        .single();

    if (fetchError) throw fetchError;
    if (!snapshot) throw new Error('Snapshot not found');

    const data = snapshot.snapshot_data as any;
    const projectId = snapshot.project_id;
    const deletedAt = new Date().toISOString();

    // 2. Step A: Prepare restoration environment
    // Fetch current active scenes to capture history before trashing them
    const { data: currentScenes, error: currentScenesError } = await supabase
        .from('scenes')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null);

    if (currentScenesError) {
        throw new Error(`Failed to load current scenes before restore: ${getRecoveryErrorMessage(currentScenesError)}`);
    }

    if (currentScenes) {
        for (const scene of currentScenes) {
            // Only capture if there is actually content or we want a blank starting point
            await captureSceneVersion(supabase, projectId, scene.id, scene.content || '');
        }
    }

    // 3. Step B: Soft-delete current active state (moving everything to Trash)
    const tablesToClear: EntityTable[] = ['characters', 'ideas', 'locations', 'objects', 'ai_responses'];
    const clearPromises = tablesToClear.map(table => 
        (supabase.from(table as any) as any).update({ deleted_at: deletedAt }).eq('project_id', projectId).is('deleted_at', null)
    );
    
    const clearResults = await Promise.all([
        ...clearPromises,
        supabase.from('structure_nodes').update({ deleted_at: deletedAt }).eq('project_id', projectId).is('deleted_at', null),
        supabase.from('scenes').update({ deleted_at: deletedAt }).eq('project_id', projectId).is('deleted_at', null)
    ]);

    const clearError = clearResults.find((result) => result.error)?.error;
    if (clearError) {
        throw new Error(`Failed to move the current project state to Trash: ${getRecoveryErrorMessage(clearError)}`);
    }

    // 4. Step C: Recreate and Remap
    const idMap = new Map<string, string>();

    // Helper to generate UUID and track mapping
    const createWithMapping = (oldId: string) => {
        const newId = crypto.randomUUID();
        idMap.set(oldId, newId);
        return newId;
    };

    /** 4.1 Restore structure_nodes (preserve hierarchy) **/
    const nodes = [...data.nodes].sort((a, b) => {
        if (!a.parent_id && b.parent_id) return -1;
        if (a.parent_id && !b.parent_id) return 1;
        return 0;
    });

    const pendingNodes = [...nodes];
    while (pendingNodes.length > 0) {
        const currentNode = pendingNodes.shift();
        if (!currentNode.parent_id || idMap.has(currentNode.parent_id)) {
            const newId = createWithMapping(currentNode.id);
            const { error } = await supabase.from('structure_nodes').insert({
                ...currentNode,
                id: newId,
                parent_id: currentNode.parent_id ? idMap.get(currentNode.parent_id) : null,
                deleted_at: null,
                created_at: new Date().toISOString()
            });
            if (error) {
                throw new Error(`Failed to restore structure node "${currentNode.title}": ${getRecoveryErrorMessage(error)}`);
            }
        } else {
            pendingNodes.push(currentNode);
            if (pendingNodes.length > nodes.length * 5) break; // Defensive skip
        }
    }

    /** 4.2 Restore scenes (Bulk) **/
    const scenesToInsert = data.scenes.map((scene: any) => {
        const newId = createWithMapping(scene.id);
        const newNodeId = idMap.get(scene.node_id);
        if (!newNodeId) return null;
        return {
            ...scene,
            id: newId,
            node_id: newNodeId,
            deleted_at: null,
            updated_at: new Date().toISOString()
        };
    }).filter(Boolean);

    if (scenesToInsert.length > 0) {
        const { error } = await supabase.from('scenes').insert(scenesToInsert.map((s: any) => ({
            ...s,
            content: s.content || ''
        })));
        if (error) {
            throw new Error(`Failed to restore scenes: ${getRecoveryErrorMessage(error)}`);
        }
    }

    /** 4.3 Restore Assets & Entities (Bulk) **/
    const entityTables = [
        { name: 'characters', data: data.characters },
        { name: 'ideas', data: data.ideas },
        { name: 'locations', data: data.locations },
        { name: 'objects', data: data.objects },
        { name: 'ai_responses', data: data.aiResponses }
    ];

    for (const ent of entityTables) {
        const rows = ent.data.map((item: any) => {
            const newId = createWithMapping(item.id);
            return {
                ...item,
                id: newId,
                deleted_at: null,
                created_at: item.created_at || new Date().toISOString()
            };
        });
        if (rows.length > 0) {
            const { error } = await (supabase.from(ent.name as any) as any).insert(rows);
            if (error) {
                throw new Error(`Failed to restore ${ent.name}: ${getRecoveryErrorMessage(error)}`);
            }
        }
    }

    /** 4.4 Restore Relationships & Joins (Bulk) **/
    const joinConfigs = [
        { table: 'scene_characters', items: data.sceneCharacters, entityField: 'character_id' },
        { table: 'scene_ideas', items: data.sceneIdeas, entity_field: 'idea_id' },
        { table: 'scene_locations', items: data.sceneLocations, entityField: 'location_id', regenerateId: true },
        { table: 'scene_objects', items: data.sceneObjects, entityField: 'object_id', regenerateId: true }
    ];

    for (const config of joinConfigs) {
        const eField = (config as any).entity_field || (config as any).entityField;
        const rowsToInsert = config.items.map((item: any) => {
            const newSceneId = idMap.get(item.scene_id);
            const newEntityId = idMap.get(item[eField]);
            if (!newSceneId || !newEntityId) return null;
            
            const { scenes, ...cleanItem } = item; 
            const restoredRow = {
                ...cleanItem,
                scene_id: newSceneId,
                [eField]: newEntityId,
                created_at: new Date().toISOString()
            };

            if ((config as any).regenerateId && 'id' in restoredRow) {
                restoredRow.id = crypto.randomUUID();
            }

            return restoredRow;
        }).filter(Boolean);

        if (rowsToInsert.length > 0) {
            const { error } = await (supabase.from(config.table as any) as any).insert(rowsToInsert);
            if (error) {
                throw new Error(`Failed to restore ${config.table} links: ${getRecoveryErrorMessage(error)}`);
            }
        }
    }

    // Restore Codex relationships
    const relRows = data.entityRelationships.map((rel: any) => {
        const newSourceId = idMap.get(rel.source_id);
        const newTargetId = idMap.get(rel.target_id);
        if (!newSourceId || !newTargetId) return null;
        return {
            ...rel,
            id: crypto.randomUUID(),
            source_id: newSourceId,
            target_id: newTargetId,
            created_at: new Date().toISOString()
        };
    }).filter(Boolean);

    if (relRows.length > 0) {
        const { error: relError } = await supabase.from('entity_relationships').insert(relRows);
        if (relError) {
            throw new Error(`Failed to restore entity relationships: ${getRecoveryErrorMessage(relError)}`);
        }
    }
}

/**
 * Permanently deletes an item from the trash (hard delete).
 */
export async function permanentlyDeleteTrashItem(
    supabase: SupabaseClient<Database>,
    type: 'structure' | 'assets' | 'ai' | 'feedback',
    id: string,
    typeLabel?: string
) {
    if (type === 'structure') {
        // First delete matching scenes to avoid foreign key violations if not cascaded
        await supabase.from('scenes').delete().eq('node_id', id);
        const { error } = await supabase.from('structure_nodes').delete().eq('id', id);
        if (error) throw error;
    } else if (type === 'ai') {
        const { error } = await supabase.from('ai_responses').delete().eq('id', id);
        if (error) throw error;
    } else if (type === 'feedback') {
        await permanentlyDeleteComment(supabase, id);
    } else {
        // assets (characters, ideas, etc.)
        const table = (typeLabel?.toLowerCase() + 's') as any;
        const { error } = await supabase.from(table as any).delete().eq('id', id);
        if (error) throw error;
    }
}

/**
 * Permanently deletes a specific scene version from history.
 */
export async function permanentlyDeleteHistoryVersion(
    supabase: SupabaseClient<Database>,
    versionId: string
) {
    const { error } = await supabase
        .from('scene_versions')
        .delete()
        .eq('id', versionId);

    if (error) throw error;
}
