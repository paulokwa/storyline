-- Tracking stub: this migration version was applied directly to the linked Supabase project
-- (timestamp 20260507050303). It contained both the feedback_responses table and the
-- cloud migration notification enum values. Reconstructed from live remote schema
-- and verified 2026-05-07 against:
--   - information_schema.columns for feedback_responses (all 10 columns match)
--   - pg_policies for feedback_responses (INSERT + SELECT policies match)
--   - pg_enum for notification_type (cloud_migration_completed + cloud_migration_failed present)
--
-- On fresh local databases this stub is effectively a no-op because:
--   - 20260504_feedback_responses.sql runs first (CREATE TABLE IF NOT EXISTS)
--   - 20260507190000_add_cloud_migration_notification_types.sql runs later (ADD VALUE IF NOT EXISTS)
-- This file exists only to reconcile remote migration tracking history.

CREATE TABLE IF NOT EXISTS feedback_responses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now() NOT NULL,

    use_case text,
    satisfaction text,
    feedback_text text,

    page_path text,
    project_count integer,
    app_version text,
    user_agent text
);

ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert feedback"
    ON feedback_responses FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own feedback"
    ON feedback_responses FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

ALTER TYPE public.notification_type
    ADD VALUE IF NOT EXISTS 'cloud_migration_completed';

ALTER TYPE public.notification_type
    ADD VALUE IF NOT EXISTS 'cloud_migration_failed';
