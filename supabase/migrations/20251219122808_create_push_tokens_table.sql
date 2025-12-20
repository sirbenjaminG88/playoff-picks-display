-- Create push_tokens table to store user device tokens for push notifications
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);

-- Enable RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only insert/update their own tokens
CREATE POLICY "Users can manage their own push tokens"
  ON push_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Service role can read all tokens (for sending notifications)
CREATE POLICY "Service role can read all tokens"
  ON push_tokens
  FOR SELECT
  TO service_role
  USING (true);

-- Add comment
COMMENT ON TABLE push_tokens IS 'Stores device push notification tokens for users';
