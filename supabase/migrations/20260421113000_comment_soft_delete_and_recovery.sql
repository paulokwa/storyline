ALTER TABLE public.project_comments
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_project_comments_project_deleted_at
ON public.project_comments(project_id, deleted_at);

DROP FUNCTION IF EXISTS public.get_project_comments_extended(uuid);

CREATE OR REPLACE FUNCTION public.get_project_comments_extended(project_id_arg uuid)
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
    is_shared boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
    WITH RECURSIVE request_context AS (
        SELECT
            pm.role AS requester_role,
            pm.user_id AS requester_id,
            p.user_id AS owner_id,
            COALESCE(p.share_owner_feedback, FALSE) AS share_owner_feedback
        FROM public.projects p
        JOIN public.project_members pm
            ON pm.project_id = p.id
        WHERE p.id = project_id_arg
          AND pm.user_id = auth.uid()
        LIMIT 1
    ),
    visible_roots AS (
        SELECT pc.id
        FROM public.project_comments pc
        JOIN request_context rc ON TRUE
        WHERE pc.project_id = project_id_arg
          AND pc.parent_id IS NULL
          AND pc.deleted_at IS NULL
          AND (
            pc.author_id = rc.requester_id
            OR COALESCE(pc.is_shared, FALSE)
            OR (rc.share_owner_feedback AND pc.author_id = rc.owner_id)
          )
    ),
    visible_comments AS (
        SELECT id FROM visible_roots

        UNION

        SELECT child.id
        FROM public.project_comments child
        JOIN visible_comments vc
            ON vc.id = child.parent_id
        WHERE child.project_id = project_id_arg
          AND child.deleted_at IS NULL
    )
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
        COALESCE(pc.is_shared, FALSE) AS is_shared
    FROM public.project_comments pc
    JOIN visible_comments vc
        ON vc.id = pc.id
    LEFT JOIN auth.users au
        ON au.id = pc.author_id
    ORDER BY COALESCE(pc.order_index, 0), pc.created_at DESC;
$$;

DROP FUNCTION IF EXISTS public.get_comment_details(uuid);

CREATE OR REPLACE FUNCTION public.get_comment_details(comment_id_arg uuid)
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
    is_shared boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
    WITH RECURSIVE target_comment AS (
        SELECT *
        FROM public.project_comments
        WHERE id = comment_id_arg
          AND deleted_at IS NULL
        LIMIT 1
    ),
    request_context AS (
        SELECT
            pm.role AS requester_role,
            pm.user_id AS requester_id,
            p.user_id AS owner_id,
            COALESCE(p.share_owner_feedback, FALSE) AS share_owner_feedback,
            tc.project_id
        FROM target_comment tc
        JOIN public.projects p
            ON p.id = tc.project_id
        JOIN public.project_members pm
            ON pm.project_id = p.id
        WHERE pm.user_id = auth.uid()
        LIMIT 1
    ),
    visible_roots AS (
        SELECT pc.id
        FROM public.project_comments pc
        JOIN request_context rc ON TRUE
        WHERE pc.project_id = rc.project_id
          AND pc.parent_id IS NULL
          AND pc.deleted_at IS NULL
          AND (
            pc.author_id = rc.requester_id
            OR COALESCE(pc.is_shared, FALSE)
            OR (rc.share_owner_feedback AND pc.author_id = rc.owner_id)
          )
    ),
    visible_comments AS (
        SELECT id FROM visible_roots

        UNION

        SELECT child.id
        FROM public.project_comments child
        JOIN visible_comments vc
            ON vc.id = child.parent_id
        JOIN request_context rc
            ON rc.project_id = child.project_id
        WHERE child.deleted_at IS NULL
    )
    SELECT
        tc.id,
        tc.project_id,
        tc.node_id,
        tc.author_id,
        COALESCE(au.email, '') AS author_email,
        tc.parent_id,
        tc.content,
        tc.status::text,
        tc.anchor_data,
        tc.created_at,
        tc.updated_at,
        tc.resolved_at,
        tc.resolved_by,
        COALESCE(tc.order_index, 0) AS order_index,
        COALESCE(tc.is_shared, FALSE) AS is_shared
    FROM target_comment tc
    JOIN visible_comments vc
        ON vc.id = tc.id
    LEFT JOIN auth.users au
        ON au.id = tc.author_id;
$$;

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
    WITH RECURSIVE request_context AS (
        SELECT
            pm.role AS requester_role,
            pm.user_id AS requester_id,
            p.user_id AS owner_id,
            COALESCE(p.share_owner_feedback, FALSE) AS share_owner_feedback
        FROM public.projects p
        JOIN public.project_members pm
            ON pm.project_id = p.id
        WHERE p.id = project_id_arg
          AND pm.user_id = auth.uid()
        LIMIT 1
    ),
    visible_roots AS (
        SELECT pc.id
        FROM public.project_comments pc
        JOIN request_context rc ON TRUE
        WHERE pc.project_id = project_id_arg
          AND pc.parent_id IS NULL
          AND (
            pc.author_id = rc.requester_id
            OR COALESCE(pc.is_shared, FALSE)
            OR (rc.share_owner_feedback AND pc.author_id = rc.owner_id)
          )
    ),
    visible_comments AS (
        SELECT id FROM visible_roots

        UNION

        SELECT child.id
        FROM public.project_comments child
        JOIN visible_comments vc
            ON vc.id = child.parent_id
        WHERE child.project_id = project_id_arg
    )
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
        (
            pc.author_id = rc.requester_id
            OR (
                rc.requester_role IN ('owner', 'editor')
                AND EXISTS (
                    SELECT 1
                    FROM visible_comments vc
                    WHERE vc.id = pc.id
                )
            )
        ) AS can_restore,
        (
            pc.author_id = rc.requester_id
            OR (
                rc.requester_role IN ('owner', 'editor')
                AND EXISTS (
                    SELECT 1
                    FROM visible_comments vc
                    WHERE vc.id = pc.id
                )
            )
        ) AS can_permanently_delete
    FROM public.project_comments pc
    JOIN request_context rc ON TRUE
    JOIN visible_comments vc
        ON vc.id = pc.id
    LEFT JOIN auth.users au
        ON au.id = pc.author_id
    WHERE pc.project_id = project_id_arg
      AND pc.deleted_at IS NOT NULL
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
    requester_role public.project_role;
    owner_id uuid;
    share_owner_feedback boolean;
    target_comment public.project_comments%ROWTYPE;
    can_manage boolean := false;
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

    SELECT
        pm.role,
        p.user_id,
        COALESCE(p.share_owner_feedback, FALSE)
    INTO requester_role, owner_id, share_owner_feedback
    FROM public.project_members pm
    JOIN public.projects p
        ON p.id = pm.project_id
    WHERE pm.project_id = target_comment.project_id
      AND pm.user_id = requester_id
    LIMIT 1;

    IF requester_role IS NULL THEN
        RAISE EXCEPTION 'Not authorized to manage comments in this project';
    END IF;

    WITH RECURSIVE visible_roots AS (
        SELECT pc.id
        FROM public.project_comments pc
        WHERE pc.project_id = target_comment.project_id
          AND pc.parent_id IS NULL
          AND pc.deleted_at IS NULL
          AND (
            pc.author_id = requester_id
            OR COALESCE(pc.is_shared, FALSE)
            OR (share_owner_feedback AND pc.author_id = owner_id)
          )
    ),
    visible_comments AS (
        SELECT id FROM visible_roots

        UNION

        SELECT child.id
        FROM public.project_comments child
        JOIN visible_comments vc
            ON vc.id = child.parent_id
        WHERE child.project_id = target_comment.project_id
          AND child.deleted_at IS NULL
    )
    SELECT
        target_comment.author_id = requester_id
        OR (
            requester_role IN ('owner', 'editor')
            AND EXISTS (SELECT 1 FROM visible_comments vc WHERE vc.id = target_comment.id)
        )
    INTO can_manage;

    IF NOT can_manage THEN
        RAISE EXCEPTION 'Not authorized to delete this feedback';
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
    requester_role public.project_role;
    owner_id uuid;
    share_owner_feedback boolean;
    target_comment public.project_comments%ROWTYPE;
    can_restore boolean := false;
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

    SELECT
        pm.role,
        p.user_id,
        COALESCE(p.share_owner_feedback, FALSE)
    INTO requester_role, owner_id, share_owner_feedback
    FROM public.project_members pm
    JOIN public.projects p
        ON p.id = pm.project_id
    WHERE pm.project_id = target_comment.project_id
      AND pm.user_id = requester_id
    LIMIT 1;

    IF requester_role IS NULL THEN
        RAISE EXCEPTION 'Not authorized to restore comments in this project';
    END IF;

    WITH RECURSIVE visible_roots AS (
        SELECT pc.id
        FROM public.project_comments pc
        WHERE pc.project_id = target_comment.project_id
          AND pc.parent_id IS NULL
          AND (
            pc.author_id = requester_id
            OR COALESCE(pc.is_shared, FALSE)
            OR (share_owner_feedback AND pc.author_id = owner_id)
          )
    ),
    visible_comments AS (
        SELECT id FROM visible_roots

        UNION

        SELECT child.id
        FROM public.project_comments child
        JOIN visible_comments vc
            ON vc.id = child.parent_id
        WHERE child.project_id = target_comment.project_id
    )
    SELECT
        target_comment.author_id = requester_id
        OR (
            requester_role IN ('owner', 'editor')
            AND EXISTS (SELECT 1 FROM visible_comments vc WHERE vc.id = target_comment.id)
        )
    INTO can_restore;

    IF NOT can_restore THEN
        RAISE EXCEPTION 'Not authorized to restore this feedback';
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
    requester_role public.project_role;
    owner_id uuid;
    share_owner_feedback boolean;
    target_comment public.project_comments%ROWTYPE;
    can_delete boolean := false;
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

    SELECT
        pm.role,
        p.user_id,
        COALESCE(p.share_owner_feedback, FALSE)
    INTO requester_role, owner_id, share_owner_feedback
    FROM public.project_members pm
    JOIN public.projects p
        ON p.id = pm.project_id
    WHERE pm.project_id = target_comment.project_id
      AND pm.user_id = requester_id
    LIMIT 1;

    IF requester_role IS NULL THEN
        RAISE EXCEPTION 'Not authorized to permanently delete comments in this project';
    END IF;

    WITH RECURSIVE visible_roots AS (
        SELECT pc.id
        FROM public.project_comments pc
        WHERE pc.project_id = target_comment.project_id
          AND pc.parent_id IS NULL
          AND (
            pc.author_id = requester_id
            OR COALESCE(pc.is_shared, FALSE)
            OR (share_owner_feedback AND pc.author_id = owner_id)
          )
    ),
    visible_comments AS (
        SELECT id FROM visible_roots

        UNION

        SELECT child.id
        FROM public.project_comments child
        JOIN visible_comments vc
            ON vc.id = child.parent_id
        WHERE child.project_id = target_comment.project_id
    )
    SELECT
        target_comment.author_id = requester_id
        OR (
            requester_role IN ('owner', 'editor')
            AND EXISTS (SELECT 1 FROM visible_comments vc WHERE vc.id = target_comment.id)
        )
    INTO can_delete;

    IF NOT can_delete THEN
        RAISE EXCEPTION 'Not authorized to permanently delete this feedback';
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
