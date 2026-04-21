CREATE TABLE IF NOT EXISTS public.project_comment_thread_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    root_comment_id UUID NOT NULL REFERENCES public.project_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    hidden_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (root_comment_id, user_id)
);

ALTER TABLE public.project_comment_thread_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comment_thread_prefs_select_own" ON public.project_comment_thread_preferences;
CREATE POLICY "comment_thread_prefs_select_own"
ON public.project_comment_thread_preferences
FOR SELECT
USING (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.project_members pm
        WHERE pm.project_id = project_comment_thread_preferences.project_id
          AND pm.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "comment_thread_prefs_insert_own" ON public.project_comment_thread_preferences;
CREATE POLICY "comment_thread_prefs_insert_own"
ON public.project_comment_thread_preferences
FOR INSERT
WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.project_members pm
        WHERE pm.project_id = project_comment_thread_preferences.project_id
          AND pm.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "comment_thread_prefs_update_own" ON public.project_comment_thread_preferences;
CREATE POLICY "comment_thread_prefs_update_own"
ON public.project_comment_thread_preferences
FOR UPDATE
USING (
    user_id = auth.uid()
)
WITH CHECK (
    user_id = auth.uid()
);

DROP POLICY IF EXISTS "comment_thread_prefs_delete_own" ON public.project_comment_thread_preferences;
CREATE POLICY "comment_thread_prefs_delete_own"
ON public.project_comment_thread_preferences
FOR DELETE
USING (
    user_id = auth.uid()
);

DROP FUNCTION IF EXISTS public.get_deleted_project_comments(uuid);

CREATE OR REPLACE FUNCTION public.get_deleted_project_comments(project_id_arg uuid)
RETURNS TABLE (
    id uuid,
    project_id uuid,
    node_id uuid,
    author_id uuid,
    author_email text,
    parent_id uuid,
    content text,
    status text,
    anchor_data jsonb,
    created_at timestamptz,
    updated_at timestamptz,
    resolved_at timestamptz,
    resolved_by uuid,
    order_index integer,
    is_shared boolean,
    deleted_at timestamptz,
    deleted_by uuid,
    can_restore boolean,
    can_permanently_delete boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT
        pc.id,
        pc.project_id,
        pc.node_id,
        pc.author_id,
        COALESCE(au.email, '') AS author_email,
        pc.parent_id,
        pc.content,
        pc.status::text,
        pc.anchor_data,
        pc.created_at,
        pc.updated_at,
        pc.resolved_at,
        pc.resolved_by,
        COALESCE(pc.order_index, 0) AS order_index,
        COALESCE(pc.is_shared, FALSE) AS is_shared,
        pc.deleted_at,
        pc.deleted_by,
        (pc.author_id = auth.uid()) AS can_restore,
        (pc.author_id = auth.uid()) AS can_permanently_delete
    FROM public.project_comments pc
    LEFT JOIN auth.users au
        ON au.id = pc.author_id
    WHERE pc.project_id = project_id_arg
      AND pc.deleted_at IS NOT NULL
      AND pc.author_id = auth.uid()
    ORDER BY pc.deleted_at DESC, COALESCE(pc.order_index, 0), pc.created_at DESC;
$$;

DROP FUNCTION IF EXISTS public.soft_delete_project_comment(uuid);

CREATE OR REPLACE FUNCTION public.soft_delete_project_comment(comment_id_arg uuid)
RETURNS TABLE (deleted_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    requester_id uuid := auth.uid();
    target_comment public.project_comments%ROWTYPE;
    deletion_timestamp timestamptz := now();
BEGIN
    SELECT *
    INTO target_comment
    FROM public.project_comments
    WHERE id = comment_id_arg
      AND deleted_at IS NULL
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Comment not found or already deleted';
    END IF;

    IF target_comment.author_id <> requester_id THEN
        RAISE EXCEPTION 'Only the comment author can delete this feedback';
    END IF;

    IF target_comment.parent_id IS NULL THEN
        RETURN QUERY
        WITH RECURSIVE thread_comments AS (
            SELECT pc.id
            FROM public.project_comments pc
            WHERE pc.id = target_comment.id
              AND pc.deleted_at IS NULL

            UNION

            SELECT child.id
            FROM public.project_comments child
            JOIN thread_comments tc
                ON tc.id = child.parent_id
            WHERE child.deleted_at IS NULL
        ),
        updated_comments AS (
            UPDATE public.project_comments pc
            SET deleted_at = deletion_timestamp,
                deleted_by = requester_id,
                updated_at = deletion_timestamp
            WHERE pc.id IN (SELECT id FROM thread_comments)
            RETURNING pc.id
        )
        SELECT id FROM updated_comments;
    ELSE
        UPDATE public.project_comments
        SET parent_id = target_comment.parent_id,
            updated_at = deletion_timestamp
        WHERE parent_id = target_comment.id
          AND deleted_at IS NULL;

        RETURN QUERY
        WITH updated_comment AS (
            UPDATE public.project_comments pc
            SET deleted_at = deletion_timestamp,
                deleted_by = requester_id,
                updated_at = deletion_timestamp
            WHERE pc.id = target_comment.id
            RETURNING pc.id
        )
        SELECT id FROM updated_comment;
    END IF;
END;
$$;

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
                updated_at = restore_timestamp
            WHERE pc.id = target_comment.id
            RETURNING pc.id
        )
        SELECT id FROM updated_comment;
    END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.permanently_delete_project_comment(uuid);

CREATE OR REPLACE FUNCTION public.permanently_delete_project_comment(comment_id_arg uuid)
RETURNS TABLE (deleted_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    requester_id uuid := auth.uid();
    target_comment public.project_comments%ROWTYPE;
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
        RAISE EXCEPTION 'Only the comment author can permanently delete this feedback';
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
        deleted_comments AS (
            DELETE FROM public.project_comments pc
            WHERE pc.id IN (SELECT id FROM thread_comments)
            RETURNING pc.id
        )
        SELECT id FROM deleted_comments;
    ELSE
        RETURN QUERY
        WITH deleted_comment AS (
            DELETE FROM public.project_comments pc
            WHERE pc.id = target_comment.id
            RETURNING pc.id
        )
        SELECT id FROM deleted_comment;
    END IF;
END;
$$;
