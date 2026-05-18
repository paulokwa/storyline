-- Add ai_fallback_provider column to user_api_keys.
-- Replaces the hardcoded Gemini-only fallback with a user-selectable cloud provider.
-- Existing rows with ai_fallback_enabled = true are migrated to 'gemini' to preserve behaviour.

ALTER TABLE user_api_keys
    ADD COLUMN IF NOT EXISTS ai_fallback_provider TEXT DEFAULT NULL;

ALTER TABLE user_api_keys
    ADD CONSTRAINT user_api_keys_fallback_provider_check
    CHECK (ai_fallback_provider IS NULL OR ai_fallback_provider IN ('gemini', 'openai', 'openrouter'));

UPDATE user_api_keys
    SET ai_fallback_provider = 'gemini'
    WHERE ai_fallback_enabled = true
      AND ai_fallback_provider IS NULL;
