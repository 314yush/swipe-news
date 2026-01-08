-- Create user_news_interactions table
-- Tracks user interactions with news items (swiped, dismissed, traded)

CREATE TABLE IF NOT EXISTS user_news_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  news_id UUID NOT NULL REFERENCES news_cache(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('dismissed', 'longed', 'shorted')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id for user interaction queries
CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON user_news_interactions(user_id);

-- Create index on news_id for news interaction analytics
CREATE INDEX IF NOT EXISTS idx_interactions_news_id ON user_news_interactions(news_id);

-- Create index on interaction_type for filtering
CREATE INDEX IF NOT EXISTS idx_interactions_type ON user_news_interactions(interaction_type);

-- Create composite index for user-news lookups
CREATE INDEX IF NOT EXISTS idx_interactions_user_news ON user_news_interactions(user_id, news_id);

-- Create unique constraint to prevent duplicate interactions
-- A user can only have one interaction per news item
CREATE UNIQUE INDEX IF NOT EXISTS idx_interactions_user_news_unique ON user_news_interactions(user_id, news_id);

-- Enable Row Level Security
ALTER TABLE user_news_interactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own interactions
CREATE POLICY "Users can view own interactions" ON user_news_interactions
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users 
      WHERE privy_id = current_setting('app.current_user_id', true)
    )
  );

-- Policy: Users can insert their own interactions
CREATE POLICY "Users can insert own interactions" ON user_news_interactions
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM users 
      WHERE privy_id = current_setting('app.current_user_id', true)
    )
  );

-- Policy: Users can update their own interactions (to change interaction type)
CREATE POLICY "Users can update own interactions" ON user_news_interactions
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM users 
      WHERE privy_id = current_setting('app.current_user_id', true)
    )
  );






