-- ============================================================
-- Storyline V1 Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Profiles (auto-created on signup via trigger)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Project',
  type TEXT CHECK (type IN ('tv_script', 'novel')) NOT NULL,
  writing_mode TEXT CHECK (writing_mode IN ('simple', 'screenplay')) NOT NULL DEFAULT 'simple',
  premise TEXT,
  tone TEXT,
  setting TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Structure Nodes (Episode, Act, Scene, Chapter)
CREATE TABLE IF NOT EXISTS structure_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES structure_nodes(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('episode', 'act', 'scene', 'chapter')),
  title TEXT NOT NULL DEFAULT 'Untitled',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scene content (1:1 with structure_node of type 'scene')
CREATE TABLE IF NOT EXISTS scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES structure_nodes(id) ON DELETE CASCADE UNIQUE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  content JSONB,
  writing_mode TEXT CHECK (writing_mode IN ('simple', 'screenplay')) NOT NULL DEFAULT 'simple',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Characters
CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  notes TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ideas (brain dump / note cards)
CREATE TABLE IF NOT EXISTS ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  content TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_structure_nodes_project_id ON structure_nodes(project_id);
CREATE INDEX IF NOT EXISTS idx_structure_nodes_parent_id ON structure_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_scenes_project_id ON scenes(project_id);
CREATE INDEX IF NOT EXISTS idx_characters_project_id ON characters(project_id);
CREATE INDEX IF NOT EXISTS idx_ideas_project_id ON ideas(project_id);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE structure_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

-- Profiles: own row only
CREATE POLICY "profiles_own" ON profiles FOR ALL USING (auth.uid() = id);

-- Projects: own projects only
CREATE POLICY "projects_own" ON projects FOR ALL USING (auth.uid() = user_id);

-- Structure nodes: via project ownership
CREATE POLICY "structure_nodes_own" ON structure_nodes FOR ALL
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = structure_nodes.project_id AND projects.user_id = auth.uid()));

-- Scenes: via project ownership
CREATE POLICY "scenes_own" ON scenes FOR ALL
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = scenes.project_id AND projects.user_id = auth.uid()));

-- Characters: via project ownership
CREATE POLICY "characters_own" ON characters FOR ALL
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = characters.project_id AND projects.user_id = auth.uid()));

-- Ideas: via project ownership
CREATE POLICY "ideas_own" ON ideas FOR ALL
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = ideas.project_id AND projects.user_id = auth.uid()));

-- ============================================================
-- Trigger: Create profile on user signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Trigger: updated_at auto-update
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER scenes_updated_at BEFORE UPDATE ON scenes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER ideas_updated_at BEFORE UPDATE ON ideas FOR EACH ROW EXECUTE FUNCTION update_updated_at();
