-- Migration: Add Objects and Scene Objects
-- Description: Creates the objects table and a join table for scenes.

/* Objects Table */
CREATE TABLE IF NOT EXISTS objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  significance TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

/* Scene Objects (links objects to scenes) */
CREATE TABLE IF NOT EXISTS scene_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id UUID REFERENCES scenes(id) ON DELETE CASCADE NOT NULL,
  object_id UUID REFERENCES objects(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scene_id, object_id)
);

/* Indexes */
CREATE INDEX IF NOT EXISTS idx_objects_project_id ON objects(project_id);
CREATE INDEX IF NOT EXISTS idx_scene_objects_scene_id ON scene_objects(scene_id);
CREATE INDEX IF NOT EXISTS idx_scene_objects_object_id ON scene_objects(object_id);

/* RLS */
ALTER TABLE objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE scene_objects ENABLE ROW LEVEL SECURITY;

/* Policies */
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'objects'
          AND policyname = 'objects_own'
    ) THEN
        CREATE POLICY "objects_own" ON objects FOR ALL
          USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = objects.project_id AND projects.user_id = auth.uid()));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'scene_objects'
          AND policyname = 'scene_objects_own'
    ) THEN
        CREATE POLICY "scene_objects_own" ON scene_objects FOR ALL
          USING (EXISTS (
            SELECT 1 FROM scenes
            JOIN objects ON scenes.project_id = objects.project_id
            JOIN projects ON scenes.project_id = projects.id
            WHERE scenes.id = scene_objects.scene_id
            AND objects.id = scene_objects.object_id
            AND projects.user_id = auth.uid()
          ));
    END IF;
END $$;

/* Update updated_at trigger */
DROP TRIGGER IF EXISTS objects_updated_at ON objects;
CREATE TRIGGER objects_updated_at BEFORE UPDATE ON objects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
