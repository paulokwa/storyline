-- Add per-provider API key columns so switching between Gemini, OpenAI, and OpenRouter
-- no longer overwrites each other's key. The shared api_key column is preserved for
-- backward compatibility but runtime code now reads from the provider-specific column.

ALTER TABLE user_api_keys
    ADD COLUMN IF NOT EXISTS gemini_api_key TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS openai_api_key TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS openrouter_api_key TEXT DEFAULT NULL;

-- Migrate existing stored keys into the correct provider column based on ai_provider.
UPDATE user_api_keys
    SET gemini_api_key = api_key
    WHERE ai_provider = 'gemini' AND billing_mode = 'byok' AND api_key IS NOT NULL AND gemini_api_key IS NULL;

UPDATE user_api_keys
    SET openai_api_key = api_key
    WHERE ai_provider = 'openai' AND billing_mode = 'byok' AND api_key IS NOT NULL AND openai_api_key IS NULL;

UPDATE user_api_keys
    SET openrouter_api_key = api_key
    WHERE ai_provider = 'openrouter' AND billing_mode = 'byok' AND api_key IS NOT NULL AND openrouter_api_key IS NULL;
