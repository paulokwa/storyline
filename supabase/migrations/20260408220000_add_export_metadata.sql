-- Migration to add export_metadata to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS export_metadata JSONB DEFAULT '{}'::jsonb;
