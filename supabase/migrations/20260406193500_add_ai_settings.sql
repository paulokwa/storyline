ALTER TABLE user_api_keys
    ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS ai_provider TEXT DEFAULT 'gemini',
    ADD COLUMN IF NOT EXISTS ai_fallback_enabled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS ollama_model TEXT DEFAULT 'llama3',
    ADD COLUMN IF NOT EXISTS ollama_url TEXT DEFAULT 'http://127.0.0.1:11434';

ALTER TABLE user_api_keys ALTER COLUMN api_key DROP NOT NULL;