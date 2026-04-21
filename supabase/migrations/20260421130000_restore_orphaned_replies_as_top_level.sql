DROP FUNCTION IF EXISTS public.restore_project_comment(uuid);

CREATE OR REPLACE FUNCTION public.restore_project_comment(comment_id_arg uuid)
RETURNS TABLE (restored_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    requester_id uuid := auth.uid();
    target_comment public.project_comments%ROWTYPE;
    restore_timestamp timestamptz := now();
    parent_is_available boolean := false;
BEGIN
    SELECT *
    INTO target_comment
    FROM public.project_comments
    WHERE id = comment_id_arg
      AND deleted_at IS NOT NULL
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Deleted comment not found';
    END IF;

    IF target_comment.author_id <> requester_id THEN
        RAISE EXCEPTION 'Only the comment author can restore this feedback';
    END IF;

    IF target_comment.parent_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1
            FROM public.project_comments parent_comment
            WHERE parent_comment.id = target_comment.parent_id
              AND parent_comment.deleted_at IS NULL
        )
        INTO parent_is_available;
    END IF;

    IF target_comment.parent_id IS NULL THEN
        RETURN QUERY
        WITH RECURSIVE thread_comments AS (
            SELECT pc.id
            FROM public.project_comments pc
            WHERE pc.id = target_comment.id

            UNION

            SELECT child.id
            FROM public.project_comments child
            JOIN thread_comments tc
                ON tc.id = child.parent_id
        ),
        updated_comments AS (
            UPDATE public.project_comments pc
            SET deleted_at = NULL,
                deleted_by = NULL,
                updated_at = restore_timestamp
            WHERE pc.id IN (SELECT id FROM thread_comments)
            RETURNING pc.id
        )
        SELECT id FROM updated_comments;
    ELSE
        RETURN QUERY
        WITH updated_comment AS (
            UPDATE public.project_comments pc
            SET deleted_at = NULL,
                deleted_by = NULL,
                updated_at = restore_timestamp,
                parent_id = CASE
                    WHEN parent_is_available THEN pc.parent_id
                    ELSE NULL
                END
            WHERE pc.id = target_comment.id
            RETURNING pc.id
        )
        SELECT id FROM updated_comment;
    END IF;
END;
$$;
