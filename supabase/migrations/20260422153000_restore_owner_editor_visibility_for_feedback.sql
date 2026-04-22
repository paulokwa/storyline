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
            rc.requester_role IN ('owner', 'editor')
            OR pc.author_id = rc.requester_id
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
            rc.requester_role IN ('owner', 'editor')
            OR pc.author_id = rc.requester_id
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
