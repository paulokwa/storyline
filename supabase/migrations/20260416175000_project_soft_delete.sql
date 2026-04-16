-- Migration for Project Soft Delete and Recovery System
-- Policy: 60 days retention before permanent deletion.

-- 1. Add deleted_at column to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- 2. Add index for performance on filtering deleted/active projects
CREATE INDEX IF NOT EXISTS idx_projects_deleted ON projects(user_id, deleted_at);

-- 3. Setup auto-cleanup for projects older than 60 days
-- Requires pg_cron to be enabled in Supabase Dashboard. 
-- We attempt to schedule it here if the extension exists.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Schedule a daily job to delete projects soft-deleted more than 60 days ago
        PERFORM cron.schedule(
            'project-soft-delete-cleanup', 
            '0 0 * * *', -- Every day at midnight
            $$DELETE FROM projects WHERE deleted_at < NOW() - INTERVAL '60 days'$$
        );
    END IF;
END $$;
