-- Add 'openrouter' to the ai_usage_events provider check constraint.
-- The constraint was written before OpenRouter BYOK was implemented, so all
-- OpenRouter usage event writes were silently rejected with code 23514.

ALTER TABLE ai_usage_events DROP CONSTRAINT ai_usage_events_provider_check;
ALTER TABLE ai_usage_events ADD CONSTRAINT ai_usage_events_provider_check
    CHECK (provider = ANY (ARRAY['openai'::text, 'gemini'::text, 'ollama'::text, 'openrouter'::text]));
