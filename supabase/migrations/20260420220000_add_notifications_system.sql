DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'notification_type'
    ) THEN
        CREATE TYPE public.notification_type AS ENUM (
            'welcome',
            'collaborator_feedback',
            'project_shared',
            'project_role_changed'
        );
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.project_comments(id) ON DELETE CASCADE,
    type public.notification_type NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    body TEXT,
    link_href TEXT,
    event_key TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS notifications_event_key_key
    ON public.notifications(event_key)
    WHERE event_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
    ON public.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON public.notifications(user_id, read_at, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own"
    ON public.notifications
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own"
    ON public.notifications
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own"
    ON public.notifications
    FOR DELETE
    USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_type public.notification_type,
    p_title TEXT,
    p_summary TEXT DEFAULT NULL,
    p_body TEXT DEFAULT NULL,
    p_project_id UUID DEFAULT NULL,
    p_comment_id UUID DEFAULT NULL,
    p_actor_id UUID DEFAULT NULL,
    p_link_href TEXT DEFAULT NULL,
    p_event_key TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    inserted_id UUID;
BEGIN
    INSERT INTO public.notifications (
        user_id,
        actor_id,
        project_id,
        comment_id,
        type,
        title,
        summary,
        body,
        link_href,
        event_key,
        metadata
    )
    VALUES (
        p_user_id,
        p_actor_id,
        p_project_id,
        p_comment_id,
        p_type,
        p_title,
        p_summary,
        p_body,
        p_link_href,
        p_event_key,
        COALESCE(p_metadata, '{}'::jsonb)
    )
    ON CONFLICT (event_key) WHERE event_key IS NOT NULL DO NOTHING
    RETURNING id INTO inserted_id;

    RETURN inserted_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_welcome_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.create_notification(
        NEW.id,
        'welcome',
        'Welcome to Storyline',
        'Draft faster, collaborate in context, and use Help when you need a quick steer.',
        E'Start in your library to create a Book or Screenplay.\n\nInside a project you can draft scene by scene, invite collaborators, leave feedback inline, and open the Help tab whenever you want a guided walkthrough.',
        NULL,
        NULL,
        NULL,
        '/welcome',
        'welcome:' || NEW.id::text,
        jsonb_build_object('kind', 'welcome')
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_welcome_notification_on_profile ON public.profiles;
CREATE TRIGGER create_welcome_notification_on_profile
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.create_welcome_notification();

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
            'project_type_label', project_type_label
        )
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_owner_of_collaborator_feedback_on_comment ON public.project_comments;
CREATE TRIGGER notify_owner_of_collaborator_feedback_on_comment
    AFTER INSERT OR UPDATE OF content ON public.project_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_owner_of_collaborator_feedback();

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
        event_key_text := NULL;
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

DROP TRIGGER IF EXISTS notify_project_membership_changes_trigger ON public.project_members;
CREATE TRIGGER notify_project_membership_changes_trigger
    AFTER INSERT OR UPDATE OF role ON public.project_members
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_project_membership_changes();
