-- Create the project-covers bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-covers', 'project-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the bucket
-- Allow public read access to all objects in the bucket
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-covers');

-- Allow authenticated users to upload their own covers
-- We organize them by user_id to ensure ownership
CREATE POLICY "Authenticated Upload Access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'project-covers' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow owners to update and delete their own covers
CREATE POLICY "Owner Edit Access"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'project-covers' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owner Delete Access"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'project-covers' AND
    (storage.foldername(name))[1] = auth.uid()::text
);
