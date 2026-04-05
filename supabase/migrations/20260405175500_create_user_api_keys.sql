CREATE TABLE IF NOT EXISTS user_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    api_key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own keys
CREATE POLICY "Users can insert their own api key" ON user_api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own api key" ON user_api_keys FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own api key" ON user_api_keys FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can select their own api key" ON user_api_keys FOR SELECT USING (auth.uid() = user_id);
