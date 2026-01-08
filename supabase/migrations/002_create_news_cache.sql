-- Create news_cache table
-- Stores news articles fetched from external APIs

CREATE TABLE IF NOT EXISTS news_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headline TEXT NOT NULL,
  brief TEXT,
  source TEXT,
  url TEXT,
  image_url TEXT,
  category TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on category for filtering
CREATE INDEX IF NOT EXISTS idx_news_cache_category ON news_cache(category);

-- Create index on published_at for sorting
CREATE INDEX IF NOT EXISTS idx_news_cache_published_at ON news_cache(published_at DESC);

-- Create index on created_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_news_cache_created_at ON news_cache(created_at);

-- Create unique constraint on url to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_news_cache_url_unique ON news_cache(url) WHERE url IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE news_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read news (public data)
CREATE POLICY "News is publicly readable" ON news_cache
  FOR SELECT
  USING (true);

-- Policy: Only service role can insert/update news (via edge functions)
-- Note: In production, this should be restricted to service role only
CREATE POLICY "Service can manage news" ON news_cache
  FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger to automatically update updated_at
CREATE TRIGGER update_news_cache_updated_at
  BEFORE UPDATE ON news_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();






