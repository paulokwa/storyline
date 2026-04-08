-- PHASE 1: RECOVERY SYSTEM FOUNDATION
-- Add soft-delete columns, scene history, and project snapshots

-- 1. Add deleted_at columns to core entities
ALTER TABLE structure_nodes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
ALTER TABLE objects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
ALTER TABLE ai_responses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- 2. Add indexes for efficient active/deleted filtering
CREATE INDEX IF NOT EXISTS idx_structure_nodes_project_deleted ON structure_nodes(project_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_scenes_project_deleted ON scenes(project_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_characters_project_deleted ON characters(project_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_ideas_project_deleted ON ideas(project_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_locations_project_deleted ON locations(project_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_objects_project_deleted ON objects(project_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_ai_responses_project_deleted ON ai_responses(project_id, deleted_at);

-- 3. Scene Versions table for detailed history
CREATE TABLE IF NOT EXISTS scene_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    content JSONB NOT NULL,
    source_text TEXT, -- Optional info like 'autosave', 'manual', 'restore'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for scene versions
CREATE INDEX IF NOT EXISTS idx_scene_versions_scene_id ON scene_versions(scene_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scene_versions_project_id ON scene_versions(project_id, created_at DESC);

-- 4. Project Snapshots table for milestones
CREATE TABLE IF NOT EXISTS project_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    storage_path TEXT, -- For future Supabase Storage integration
    snapshot_data JSONB, -- Initial storage of the snapshot payload
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for project snapshots
CREATE INDEX IF NOT EXISTS idx_project_snapshots_project_id ON project_snapshots(project_id, created_at DESC);

-- Enable RLS on new tables
ALTER TABLE scene_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "scene_versions_own" ON scene_versions FOR ALL
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = scene_versions.project_id AND projects.user_id = auth.uid()));

CREATE POLICY "project_snapshots_own" ON project_snapshots FOR ALL
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = project_snapshots.project_id AND projects.user_id = auth.uid()));
