CREATE OR REPLACE FUNCTION public.notify_owner_of_collaborator_feedback()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    owner_id UUID;
    project_title TEXT;
    project_type_label TEXT;
    actor_name TEXT;
    trimmed_content TEXT;
    node_title TEXT;
    node_type TEXT;
    parent_title TEXT;
    parent_type TEXT;
    location_label TEXT;
BEGIN
    trimmed_content := NULLIF(BTRIM(COALESCE(NEW.content, '')), '');

    IF trimmed_content IS NULL OR trimmed_content = 'Add your feedback...' THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' AND COALESCE(OLD.content, '') = COALESCE(NEW.content, '') THEN
        RETURN NEW;
    END IF;

    SELECT
        p.user_id,
        COALESCE(p.title, 'Untitled Project'),
        CASE
            WHEN p.type = 'novel' THEN 'Book'
            WHEN p.type = 'tv_script' THEN 'Screenplay'
            ELSE 'Project'
        END
    INTO owner_id, project_title, project_type_label
    FROM public.projects p
    WHERE p.id = NEW.project_id;

    IF owner_id IS NULL OR owner_id = NEW.author_id THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(NULLIF(BTRIM(display_name), ''), 'A collaborator')
    INTO actor_name
    FROM public.profiles
    WHERE id = NEW.author_id;

    IF NEW.node_id IS NOT NULL THEN
        SELECT
            NULLIF(BTRIM(node.title), ''),
            node.type,
            NULLIF(BTRIM(parent.title), ''),
            parent.type
        INTO node_title, node_type, parent_title, parent_type
        FROM public.structure_nodes node
        LEFT JOIN public.structure_nodes parent
            ON parent.id = node.parent_id
        WHERE node.id = NEW.node_id;
    END IF;

    IF node_type = 'scene' AND parent_type IN ('chapter', 'act') THEN
        location_label := CONCAT(
            CASE WHEN parent_type = 'chapter' THEN 'Chapter' ELSE 'Act' END,
            CASE WHEN parent_title IS NOT NULL THEN ': ' || parent_title ELSE '' END,
            ' / Scene',
            CASE WHEN node_title IS NOT NULL THEN ': ' || node_title ELSE '' END
        );
    ELSIF node_type = 'scene' THEN
        location_label := CONCAT(
            'Scene',
            CASE WHEN node_title IS NOT NULL THEN ': ' || node_title ELSE '' END
        );
    ELSIF node_type IN ('chapter', 'act') THEN
        location_label := CONCAT(
            CASE WHEN node_type = 'chapter' THEN 'Chapter' ELSE 'Act' END,
            CASE WHEN node_title IS NOT NULL THEN ': ' || node_title ELSE '' END
        );
    END IF;

    PERFORM public.create_notification(
        owner_id,
        'collaborator_feedback',
        'New feedback on "' || project_title || '"',
        COALESCE(actor_name, 'A collaborator') || ' added feedback to your ' || LOWER(project_type_label) || '.',
        LEFT(trimmed_content, 600),
        NEW.project_id,
        NEW.id,
        NEW.author_id,
        '/project/' || NEW.project_id::text || '/story',
        'comment-feedback:' || NEW.id::text,
        jsonb_build_object(
            'node_id', NEW.node_id,
            'parent_id', NEW.parent_id,
            'project_type_label', project_type_label,
            'location_label', location_label,
            'node_type', node_type,
            'node_title', node_title,
            'parent_type', parent_type,
            'parent_title', parent_title
        )
    );

    RETURN NEW;
END;
$$;
