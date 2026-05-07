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
    thread_root_id UUID;
    thread_author_id UUID;
    recipient_id UUID;
    summary_text TEXT;
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

    IF owner_id IS NULL THEN
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

    IF NEW.parent_id IS NULL THEN
        IF owner_id = NEW.author_id THEN
            RETURN NEW;
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
                'kind', 'top_level',
                'thread_id', NEW.id,
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
    END IF;

    WITH RECURSIVE thread_ancestors AS (
        SELECT
            pc.id,
            pc.parent_id,
            pc.author_id
        FROM public.project_comments pc
        WHERE pc.id = NEW.parent_id

        UNION ALL

        SELECT
            parent.id,
            parent.parent_id,
            parent.author_id
        FROM public.project_comments parent
        JOIN thread_ancestors ancestor
            ON parent.id = ancestor.parent_id
    )
    SELECT id, author_id
    INTO thread_root_id, thread_author_id
    FROM thread_ancestors
    WHERE parent_id IS NULL
    LIMIT 1;

    IF thread_root_id IS NULL THEN
        thread_root_id := NEW.parent_id;
        SELECT pc.author_id
        INTO thread_author_id
        FROM public.project_comments pc
        WHERE pc.id = thread_root_id;
    END IF;

    FOR recipient_id IN
        WITH RECURSIVE thread_comments AS (
            SELECT
                root.id,
                root.parent_id,
                root.author_id
            FROM public.project_comments root
            WHERE root.id = thread_root_id

            UNION ALL

            SELECT
                child.id,
                child.parent_id,
                child.author_id
            FROM public.project_comments child
            JOIN thread_comments thread_comment
                ON child.parent_id = thread_comment.id
        )
        SELECT DISTINCT thread_comment.author_id
        FROM thread_comments thread_comment
        WHERE thread_comment.author_id IS NOT NULL
          AND thread_comment.author_id <> NEW.author_id
    LOOP
        summary_text := CASE
            WHEN recipient_id = thread_author_id THEN
                COALESCE(actor_name, 'A collaborator') || ' replied to a feedback thread you started.'
            ELSE
                COALESCE(actor_name, 'A collaborator') || ' replied in a feedback thread you participated in.'
        END;

        PERFORM public.create_notification(
            recipient_id,
            'collaborator_feedback',
            'New reply on "' || project_title || '"',
            summary_text,
            LEFT(trimmed_content, 600),
            NEW.project_id,
            NEW.id,
            NEW.author_id,
            '/project/' || NEW.project_id::text || '/story',
            'comment-reply:' || thread_root_id::text || ':' || NEW.id::text || ':' || recipient_id::text,
            jsonb_build_object(
                'kind', 'reply',
                'thread_id', thread_root_id,
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
    END LOOP;

    RETURN NEW;
END;
$$;
