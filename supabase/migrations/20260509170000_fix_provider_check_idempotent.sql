-- Idempotent fix: ensure 'openrouter' is in the ai_usage_events provider check constraint.
-- Previous migration (20260509160000) may have been recorded as applied without the DDL
-- executing (e.g. the original constraint name differed). IF EXISTS handles both states.
ALTER TABLE ai_usage_events DROP CONSTRAINT IF EXISTS ai_usage_events_provider_check;
ALTER TABLE ai_usage_events ADD CONSTRAINT ai_usage_events_provider_check
    CHECK (provider = ANY (ARRAY['openai'::text, 'gemini'::text, 'ollama'::text, 'openrouter'::text]));
