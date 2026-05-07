-- Add AI Partner context mode support without changing existing manual scene links.
-- Existing settings rows stay conservative: Manual Context.
-- New settings rows default to Smart Context.

ALTER TABLE public.user_api_keys
    ADD COLUMN IF NOT EXISTS ai_context_mode TEXT;

UPDATE public.user_api_keys
SET ai_context_mode = 'manual'
WHERE ai_context_mode IS NULL;

ALTER TABLE public.user_api_keys
    ALTER COLUMN ai_context_mode SET DEFAULT 'smart',
    ALTER COLUMN ai_context_mode SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'user_api_keys_ai_context_mode_check'
    ) THEN
        ALTER TABLE public.user_api_keys
            ADD CONSTRAINT user_api_keys_ai_context_mode_check
            CHECK (ai_context_mode IN ('smart', 'manual'));
    END IF;
END;
$$;

ALTER TABLE public.characters
    ADD COLUMN IF NOT EXISTS exclude_from_ai BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.ideas
    ADD COLUMN IF NOT EXISTS exclude_from_ai BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.locations
    ADD COLUMN IF NOT EXISTS exclude_from_ai BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.objects
    ADD COLUMN IF NOT EXISTS exclude_from_ai BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_characters_project_ai_eligible
ON public.characters(project_id, deleted_at, exclude_from_ai);

CREATE INDEX IF NOT EXISTS idx_ideas_project_ai_eligible
ON public.ideas(project_id, deleted_at, exclude_from_ai);

CREATE INDEX IF NOT EXISTS idx_locations_project_ai_eligible
ON public.locations(project_id, deleted_at, exclude_from_ai);

CREATE INDEX IF NOT EXISTS idx_objects_project_ai_eligible
ON public.objects(project_id, deleted_at, exclude_from_ai);

CREATE OR REPLACE FUNCTION public.ensure_default_ai_settings_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.user_api_keys (
        user_id,
        ai_enabled,
        ai_provider,
        billing_mode,
        ai_context_mode,
        ai_fallback_enabled,
        ollama_model,
        ollama_url
    )
    VALUES (
        NEW.id,
        true,
        'openai',
        'app_managed_trial',
        'smart',
        false,
        'llama3',
        'http://127.0.0.1:11434'
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;
