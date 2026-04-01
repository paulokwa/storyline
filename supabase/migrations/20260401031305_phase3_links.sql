-- Phase 3: Scene Links

-- ============================================================
-- Table: scene_characters
-- ============================================================
CREATE TABLE IF NOT EXISTS scene_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id UUID REFERENCES scenes(id) ON DELETE CASCADE NOT NULL,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scene_id, character_id)
);

-- ============================================================
-- Table: scene_ideas
-- ============================================================
CREATE TABLE IF NOT EXISTS scene_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id UUID REFERENCES scenes(id) ON DELETE CASCADE NOT NULL,
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scene_id, idea_id)
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_scene_characters_scene_id ON scene_characters(scene_id);
CREATE INDEX IF NOT EXISTS idx_scene_characters_character_id ON scene_characters(character_id);
CREATE INDEX IF NOT EXISTS idx_scene_ideas_scene_id ON scene_ideas(scene_id);
CREATE INDEX IF NOT EXISTS idx_scene_ideas_idea_id ON scene_ideas(idea_id);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE scene_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE scene_ideas ENABLE ROW LEVEL SECURITY;

-- Policy: scene_characters
-- Ensures: scene and character belong to the same project, and user owns that project.
CREATE POLICY "scene_characters_own" ON scene_characters FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM scenes
      JOIN characters ON scenes.project_id = characters.project_id
      JOIN projects ON scenes.project_id = projects.id
      WHERE scenes.id = scene_characters.scene_id
      AND characters.id = scene_characters.character_id
      AND projects.user_id = auth.uid()
    )
  );

-- Policy: scene_ideas
-- Ensures: scene and idea belong to the same project, and user owns that project.
CREATE POLICY "scene_ideas_own" ON scene_ideas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM scenes
      JOIN ideas ON scenes.project_id = ideas.project_id
      JOIN projects ON scenes.project_id = projects.id
      WHERE scenes.id = scene_ideas.scene_id
      AND ideas.id = scene_ideas.idea_id
      AND projects.user_id = auth.uid()
    )
  );
