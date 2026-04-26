INSERT INTO storage.buckets (id, name, public)
VALUES ('project-assets', 'project-assets', true)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Project assets are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Project editors can upload assets" ON storage.objects;
DROP POLICY IF EXISTS "Project editors can update assets" ON storage.objects;
DROP POLICY IF EXISTS "Project editors can delete assets" ON storage.objects;

CREATE POLICY "Project assets are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-assets');

CREATE POLICY "Project editors can upload assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'project-assets'
    AND (storage.foldername(name))[1] = 'projects'
    AND public.can_edit_project(((storage.foldername(name))[2])::UUID)
);

CREATE POLICY "Project editors can update assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'project-assets'
    AND (storage.foldername(name))[1] = 'projects'
    AND public.can_edit_project(((storage.foldername(name))[2])::UUID)
)
WITH CHECK (
    bucket_id = 'project-assets'
    AND (storage.foldername(name))[1] = 'projects'
    AND public.can_edit_project(((storage.foldername(name))[2])::UUID)
);

CREATE POLICY "Project editors can delete assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'project-assets'
    AND (storage.foldername(name))[1] = 'projects'
    AND public.can_edit_project(((storage.foldername(name))[2])::UUID)
);
