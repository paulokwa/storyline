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
    order_index integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
    WITH request_context AS (
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
        COALESCE(pc.order_index, 0) AS order_index
    FROM public.project_comments pc
    JOIN request_context rc ON TRUE
    LEFT JOIN auth.users au
        ON au.id = pc.author_id
    WHERE pc.project_id = project_id_arg
      AND (
        rc.requester_role <> 'viewer'
        OR pc.author_id = rc.requester_id
        OR rc.share_owner_feedback
        OR pc.author_id <> rc.owner_id
      )
    ORDER BY COALESCE(pc.order_index, 0), pc.created_at DESC;
$$;

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
    order_index integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
    WITH target_comment AS (
        SELECT *
        FROM public.project_comments
        WHERE id = comment_id_arg
        LIMIT 1
    ),
    request_context AS (
        SELECT
            pm.role AS requester_role,
            pm.user_id AS requester_id,
            p.user_id AS owner_id,
            COALESCE(p.share_owner_feedback, FALSE) AS share_owner_feedback
        FROM target_comment tc
        JOIN public.projects p
            ON p.id = tc.project_id
        JOIN public.project_members pm
            ON pm.project_id = p.id
        WHERE pm.user_id = auth.uid()
        LIMIT 1
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
        COALESCE(tc.order_index, 0) AS order_index
    FROM target_comment tc
    JOIN request_context rc ON TRUE
    LEFT JOIN auth.users au
        ON au.id = tc.author_id
    WHERE (
        rc.requester_role <> 'viewer'
        OR tc.author_id = rc.requester_id
        OR rc.share_owner_feedback
        OR tc.author_id <> rc.owner_id
    );
$$;
