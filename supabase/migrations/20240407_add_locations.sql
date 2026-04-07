-- Migration: Add Locations and Scene Locations
-- Description: Creates the locations table and a join table for scenes.

-- Locations Table
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  atmosphere TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scene Locations (links locations to scenes)
CREATE TABLE IF NOT EXISTS scene_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id UUID REFERENCES scenes(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scene_id, location_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_locations_project_id ON locations(project_id);
CREATE INDEX IF NOT EXISTS idx_scene_locations_scene_id ON scene_locations(scene_id);
CREATE INDEX IF NOT EXISTS idx_scene_locations_location_id ON scene_locations(location_id);

-- RLS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE scene_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "locations_own" ON locations FOR ALL
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = locations.project_id AND projects.user_id = auth.uid()));

CREATE POLICY "scene_locations_own" ON scene_locations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM scenes
    JOIN locations ON scenes.project_id = locations.project_id
    JOIN projects ON scenes.project_id = projects.id
    WHERE scenes.id = scene_locations.scene_id
    AND locations.id = scene_locations.location_id
    AND projects.user_id = auth.uid()
  ));

-- Update updated_at trigger
CREATE TRIGGER locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
