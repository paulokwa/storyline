-- Add last_accessed_at column to projects table
ALTER TABLE projects ADD COLUMN last_accessed_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing projects to have last_accessed_at equal to updated_at
UPDATE projects SET last_accessed_at = updated_at;

-- Create index for faster sorting
CREATE INDEX idx_projects_last_accessed_at ON projects(last_accessed_at DESC);
