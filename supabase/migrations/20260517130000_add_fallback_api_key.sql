-- Separate the Ollama fallback API key from the main BYOK api_key column.
-- Previously both shared the same column, causing the fallback key to overwrite
-- the main provider key when saved.

ALTER TABLE user_api_keys
    ADD COLUMN IF NOT EXISTS fallback_api_key TEXT DEFAULT NULL;
