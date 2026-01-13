-- Ensure update_updated_at_column function exists (created in migration 001)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create refresh_locks table for distributed locking
CREATE TABLE IF NOT EXISTS refresh_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lock_name TEXT NOT NULL UNIQUE,
  locked_by TEXT NOT NULL,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on lock_name for fast lookups
CREATE INDEX IF NOT EXISTS idx_refresh_locks_name ON refresh_locks(lock_name);
CREATE INDEX IF NOT EXISTS idx_refresh_locks_expires ON refresh_locks(expires_at);

-- Enable Row Level Security
ALTER TABLE refresh_locks ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can manage locks
CREATE POLICY "Service can manage locks" ON refresh_locks
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create news_snapshots table for global news snapshot
CREATE TABLE IF NOT EXISTS news_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_key TEXT NOT NULL UNIQUE,
  bucket TEXT NOT NULL,
  articles JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on snapshot_key for fast lookups
CREATE INDEX IF NOT EXISTS idx_news_snapshots_key ON news_snapshots(snapshot_key);
CREATE INDEX IF NOT EXISTS idx_news_snapshots_bucket ON news_snapshots(bucket);

-- Enable Row Level Security
ALTER TABLE news_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read snapshots (public data)
CREATE POLICY "Snapshots are publicly readable" ON news_snapshots
  FOR SELECT
  USING (true);

-- Policy: Service role can manage snapshots
CREATE POLICY "Service can manage snapshots" ON news_snapshots
  FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger to automatically update updated_at
CREATE TRIGGER update_news_snapshots_updated_at
  BEFORE UPDATE ON news_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

