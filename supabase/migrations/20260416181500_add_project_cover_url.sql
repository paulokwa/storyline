ALTER TABLE public.projects ADD COLUMN cover_url TEXT;

COMMENT ON COLUMN public.projects.cover_url IS 'URL to the cover image for the project library card.';
