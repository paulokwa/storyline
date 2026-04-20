ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS allow_collaborator_exports BOOLEAN NOT NULL DEFAULT FALSE;
