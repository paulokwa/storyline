ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS ai_onboarding_completed BOOLEAN NOT NULL DEFAULT false;

UPDATE public.profiles
SET ai_onboarding_completed = true
WHERE ai_onboarding_completed IS DISTINCT FROM true;
