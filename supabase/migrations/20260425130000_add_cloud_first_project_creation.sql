ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS preferred_storage_mode TEXT NOT NULL DEFAULT 'local';

ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_preferred_storage_mode_check;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_preferred_storage_mode_check
    CHECK (preferred_storage_mode IN ('local', 'cloud'));

CREATE OR REPLACE FUNCTION public.create_cloud_project(p_blueprint JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_project JSONB := COALESCE(p_blueprint->'project', '{}'::JSONB);
    v_entities JSONB := COALESCE(p_blueprint->'entities', '{}'::JSONB);
    v_project_id UUID;
    v_node_id UUID;
    v_parent_id UUID;
    v_node_map JSONB := '{}'::JSONB;
    v_node JSONB;
    v_scene JSONB;
    v_entity JSONB;
    v_node_key TEXT;
    v_parent_key TEXT;
    v_project_type TEXT := v_project->>'type';
    v_writing_mode TEXT := COALESCE(v_project->>'writingMode', CASE WHEN v_project_type = 'tv_script' THEN 'screenplay' ELSE 'simple' END);
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
    END IF;

    IF v_project_type NOT IN ('novel', 'tv_script') THEN
        RAISE EXCEPTION 'Invalid project type';
    END IF;

    IF v_writing_mode NOT IN ('simple', 'screenplay') THEN
        RAISE EXCEPTION 'Invalid writing mode';
    END IF;

    INSERT INTO public.projects (
        user_id,
        title,
        type,
        writing_mode,
        premise,
        tone,
        setting,
        cover_url,
        order_index,
        project_type,
        share_owner_feedback,
        allow_collaborator_exports,
        allow_viewer_feedback
    )
    VALUES (
        v_user_id,
        COALESCE(NULLIF(BTRIM(v_project->>'title'), ''), 'My New Project'),
        v_project_type,
        v_writing_mode,
        NULLIF(v_project->>'premise', ''),
        NULLIF(v_project->>'tone', ''),
        NULLIF(v_project->>'setting', ''),
        NULLIF(v_project->>'coverUrl', ''),
        COALESCE((v_project->>'orderIndex')::INTEGER, 0),
        v_project_type,
        FALSE,
        FALSE,
        FALSE
    )
    RETURNING id INTO v_project_id;

    INSERT INTO public.project_members (project_id, user_id, role)
    VALUES (v_project_id, v_user_id, 'owner'::public.project_role);

    FOR v_node IN SELECT value FROM jsonb_array_elements(COALESCE(p_blueprint->'nodes', '[]'::JSONB))
    LOOP
        v_node_key := v_node->>'key';
        v_parent_key := NULLIF(v_node->>'parentKey', '');
        v_parent_id := NULL;

        IF v_node_key IS NULL OR v_node_key = '' THEN
            RAISE EXCEPTION 'Blueprint node is missing key';
        END IF;

        IF v_parent_key IS NOT NULL THEN
            v_parent_id := (v_node_map->>v_parent_key)::UUID;
            IF v_parent_id IS NULL THEN
                RAISE EXCEPTION 'Blueprint node parent missing: %', v_parent_key;
            END IF;
        END IF;

        INSERT INTO public.structure_nodes (
            project_id,
            parent_id,
            type,
            title,
            order_index
        )
        VALUES (
            v_project_id,
            v_parent_id,
            v_node->>'type',
            COALESCE(NULLIF(BTRIM(v_node->>'title'), ''), 'Untitled'),
            COALESCE((v_node->>'orderIndex')::INTEGER, 0)
        )
        RETURNING id INTO v_node_id;

        v_node_map := jsonb_set(v_node_map, ARRAY[v_node_key], to_jsonb(v_node_id::TEXT), TRUE);
    END LOOP;

    FOR v_scene IN SELECT value FROM jsonb_array_elements(COALESCE(p_blueprint->'scenes', '[]'::JSONB))
    LOOP
        v_node_id := (v_node_map->>(v_scene->>'nodeKey'))::UUID;
        IF v_node_id IS NULL THEN
            RAISE EXCEPTION 'Blueprint scene node missing: %', v_scene->>'nodeKey';
        END IF;

        INSERT INTO public.scenes (
            node_id,
            project_id,
            content,
            writing_mode,
            version
        )
        VALUES (
            v_node_id,
            v_project_id,
            v_scene->'content',
            COALESCE(v_scene->>'writingMode', v_writing_mode),
            1
        );
    END LOOP;

    FOR v_entity IN SELECT value FROM jsonb_array_elements(COALESCE(v_entities->'characters', '[]'::JSONB))
    LOOP
        INSERT INTO public.characters (project_id, name, description, notes, order_index)
        VALUES (
            v_project_id,
            v_entity->>'name',
            COALESCE(v_entity->>'description', ''),
            COALESCE(v_entity->>'notes', ''),
            COALESCE((v_entity->>'orderIndex')::INTEGER, 0)
        );
    END LOOP;

    FOR v_entity IN SELECT value FROM jsonb_array_elements(COALESCE(v_entities->'ideas', '[]'::JSONB))
    LOOP
        INSERT INTO public.ideas (project_id, title, content, order_index)
        VALUES (
            v_project_id,
            COALESCE(NULLIF(BTRIM(v_entity->>'title'), ''), 'Untitled Idea'),
            COALESCE(v_entity->>'content', ''),
            COALESCE((v_entity->>'orderIndex')::INTEGER, 0)
        );
    END LOOP;

    FOR v_entity IN SELECT value FROM jsonb_array_elements(COALESCE(v_entities->'locations', '[]'::JSONB))
    LOOP
        INSERT INTO public.locations (project_id, name, description, atmosphere, order_index)
        VALUES (
            v_project_id,
            v_entity->>'name',
            COALESCE(v_entity->>'description', ''),
            COALESCE(v_entity->>'atmosphere', ''),
            COALESCE((v_entity->>'orderIndex')::INTEGER, 0)
        );
    END LOOP;

    FOR v_entity IN SELECT value FROM jsonb_array_elements(COALESCE(v_entities->'objects', '[]'::JSONB))
    LOOP
        INSERT INTO public.objects (project_id, name, description, significance, order_index)
        VALUES (
            v_project_id,
            v_entity->>'name',
            COALESCE(v_entity->>'description', ''),
            COALESCE(v_entity->>'significance', ''),
            COALESCE((v_entity->>'orderIndex')::INTEGER, 0)
        );
    END LOOP;

    RETURN v_project_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_cloud_project(JSONB) TO authenticated;
