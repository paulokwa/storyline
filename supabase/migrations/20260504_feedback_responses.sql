-- feedback_responses: stores in-app survey and feedback submissions
-- Designed for early-access product learning, not support tickets.
-- Support contacts continue to go through the existing email flow.

CREATE TABLE IF NOT EXISTS feedback_responses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now() NOT NULL,

    -- Survey answers
    use_case text,           -- What the user is mainly using the app for
    satisfaction text,       -- How it is going: 'great' | 'ok' | 'not_great'
    feedback_text text,      -- Free-text improvement / feature request

    -- Auto-captured context (no PII beyond user_id)
    page_path text,
    project_count integer,
    app_version text,
    user_agent text
);

ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;

-- Authenticated users can submit feedback
CREATE POLICY "Authenticated users can insert feedback"
    ON feedback_responses FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can read their own submissions (for deduplication if needed)
CREATE POLICY "Users can view own feedback"
    ON feedback_responses FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
