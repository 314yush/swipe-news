-- Add optional performance indexes
-- These are safe to run and will improve query performance

-- Index for news feed queries (category + published_at)
CREATE INDEX IF NOT EXISTS idx_news_cache_category_published 
  ON news_cache(category, published_at DESC);

-- Index for trade history queries (user + status + opened_at)
CREATE INDEX IF NOT EXISTS idx_trades_user_status_opened 
  ON trades(user_id, status, opened_at DESC);

-- Index for open trades by user
CREATE INDEX IF NOT EXISTS idx_trades_user_open 
  ON trades(user_id) 
  WHERE status = 'open';

-- Index for closed trades by user
CREATE INDEX IF NOT EXISTS idx_trades_user_closed 
  ON trades(user_id) 
  WHERE status = 'closed';

-- Index for news interactions by type and date
CREATE INDEX IF NOT EXISTS idx_interactions_type_created 
  ON user_news_interactions(interaction_type, created_at DESC);

-- Note: Partial index with NOW() removed (NOW() is not IMMUTABLE)
-- The idx_news_cache_category_published index already covers recent news queries

-- Index on users privy_user_id (if not exists)
CREATE INDEX IF NOT EXISTS idx_users_privy_user_id ON users(privy_user_id);

