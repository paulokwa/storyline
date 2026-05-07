-- Keep shared-project notifications as an important-event inbox item, not a repeat feed.
-- Backfill one canonical event key per project/user so future re-adds do not create duplicates.
WITH ranked_project_shared_notifications AS (
    SELECT
        id,
        project_id,
        user_id,
        ROW_NUMBER() OVER (
            PARTITION BY project_id, user_id
            ORDER BY created_at DESC, id DESC
        ) AS row_number
    FROM public.notifications
    WHERE type = 'project_shared'
      AND project_id IS NOT NULL
)
UPDATE public.notifications AS notifications
SET event_key = 'project-shared:' || notifications.project_id::text || ':' || notifications.user_id::text
FROM ranked_project_shared_notifications
WHERE notifications.id = ranked_project_shared_notifications.id
  AND ranked_project_shared_notifications.row_number = 1
  AND notifications.event_key IS NULL
  AND NOT EXISTS (
      SELECT 1
      FROM public.notifications AS existing
      WHERE existing.event_key = 'project-shared:' || notifications.project_id::text || ':' || notifications.user_id::text
        AND existing.id <> notifications.id
  );

CREATE OR REPLACE FUNCTION public.notify_project_membership_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    owner_id UUID;
    owner_name TEXT;
    project_title TEXT;
    event_type public.notification_type;
    title_text TEXT;
    summary_text TEXT;
    body_text TEXT;
    event_key_text TEXT;
BEGIN
    IF TG_OP = 'INSERT' AND NEW.role = 'owner' THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.role = OLD.role THEN
        RETURN NEW;
    END IF;

    SELECT
        p.user_id,
        COALESCE(p.title, 'Untitled Project'),
        COALESCE(NULLIF(BTRIM(pr.display_name), ''), 'The owner')
    INTO owner_id, project_title, owner_name
    FROM public.projects p
    LEFT JOIN public.profiles pr ON pr.id = p.user_id
    WHERE p.id = NEW.project_id;

    IF owner_id IS NULL OR NEW.user_id = owner_id THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        event_type := 'project_shared';
        title_text := 'You were added to "' || project_title || '"';
        summary_text := owner_name || ' shared a project with you as ' || INITCAP(NEW.role::text) || '.';
        body_text := 'Open the project to read, review, and continue from the same workspace.';
        event_key_text := 'project-shared:' || NEW.project_id::text || ':' || NEW.user_id::text;
    ELSE
        event_type := 'project_role_changed';
        title_text := 'Your access changed for "' || project_title || '"';
        summary_text := 'You are now a ' || INITCAP(NEW.role::text) || ' on this shared project.';
        body_text := owner_name || ' updated your collaboration access.';
        event_key_text := 'project-role:' || NEW.project_id::text || ':' || NEW.user_id::text || ':' || NEW.role::text;
    END IF;

    PERFORM public.create_notification(
        NEW.user_id,
        event_type,
        title_text,
        summary_text,
        body_text,
        NEW.project_id,
        NULL,
        owner_id,
        '/project/' || NEW.project_id::text || '/story',
        event_key_text,
        jsonb_build_object('role', NEW.role)
    );

    RETURN NEW;
END;
$$;
