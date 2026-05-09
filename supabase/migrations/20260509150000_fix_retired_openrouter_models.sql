-- The Llama 3.1 8B :free and Mistral 7B :free variants were retired from OpenRouter as of May 2026.
-- Any user rows storing these model IDs will receive 404 errors from OpenRouter.
-- Reset them to the current confirmed-free default.

UPDATE user_api_keys
SET openrouter_model = 'meta-llama/llama-3.3-70b-instruct:free'
WHERE openrouter_model IN (
    'meta-llama/llama-3.1-8b-instruct:free',
    'mistralai/mistral-7b-instruct:free'
)
   OR openrouter_model IS NULL;

-- Also update the column default so new rows start with the working model.
ALTER TABLE user_api_keys
    ALTER COLUMN openrouter_model SET DEFAULT 'meta-llama/llama-3.3-70b-instruct:free';
