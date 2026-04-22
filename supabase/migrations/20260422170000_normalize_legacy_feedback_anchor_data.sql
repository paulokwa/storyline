-- Normalize legacy feedback metadata without changing current app behavior.
-- This only repairs malformed/implicit anchor_data on older comments.

UPDATE public.project_comments
SET anchor_data = jsonb_build_object('type', 'scene')
WHERE anchor_data IS NULL
  AND deleted_at IS NULL
  AND parent_id IS NULL;

UPDATE public.project_comments
SET anchor_data = anchor_data || jsonb_build_object('type', 'scene')
WHERE anchor_data IS NOT NULL
  AND deleted_at IS NULL
  AND parent_id IS NULL
  AND NOT (anchor_data ? 'type');

UPDATE public.project_comments
SET anchor_data =
    (anchor_data - 'type')
    || jsonb_build_object('type', 'scene')
WHERE anchor_data IS NOT NULL
  AND deleted_at IS NULL
  AND parent_id IS NULL
  AND anchor_data ->> 'type' = 'inline'
  AND (
      NOT (anchor_data ? 'text')
      OR NOT (anchor_data ? 'from')
      OR NOT (anchor_data ? 'to')
  );
