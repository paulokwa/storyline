ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

UPDATE public.profiles
SET onboarding_completed = true
WHERE onboarding_completed IS DISTINCT FROM true;
