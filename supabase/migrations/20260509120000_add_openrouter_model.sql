-- Add per-user OpenRouter model selection to user_api_keys.
-- The default matches the new curated free model in providers.ts.
ALTER TABLE user_api_keys
ADD COLUMN IF NOT EXISTS openrouter_model TEXT DEFAULT 'meta-llama/llama-3.1-8b-instruct:free';
