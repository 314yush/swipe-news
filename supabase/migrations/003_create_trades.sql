-- Create trades table
-- Stores all trading positions and their history

CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  news_id UUID REFERENCES news_cache(id) ON DELETE SET NULL,
  market TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('long', 'short')),
  collateral DECIMAL(18, 8) NOT NULL,
  leverage INTEGER NOT NULL DEFAULT 75,
  entry_price DECIMAL(18, 8) NOT NULL,
  exit_price DECIMAL(18, 8),
  take_profit DECIMAL(10, 2),
  stop_loss DECIMAL(10, 2),
  pnl DECIMAL(18, 8) DEFAULT 0,
  pnl_percent DECIMAL(10, 4) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'liquidated')),
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id for user portfolio queries
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);

-- Create index on status for filtering active/closed trades
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);

-- Create index on market for market-based queries
CREATE INDEX IF NOT EXISTS idx_trades_market ON trades(market);

-- Create index on opened_at for sorting
CREATE INDEX IF NOT EXISTS idx_trades_opened_at ON trades(opened_at DESC);

-- Create composite index for user portfolio queries
CREATE INDEX IF NOT EXISTS idx_trades_user_status ON trades(user_id, status);

-- Enable Row Level Security
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own trades
CREATE POLICY "Users can view own trades" ON trades
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users 
      WHERE privy_id = current_setting('app.current_user_id', true)
    )
  );

-- Policy: Users can insert their own trades
CREATE POLICY "Users can insert own trades" ON trades
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM users 
      WHERE privy_id = current_setting('app.current_user_id', true)
    )
  );

-- Policy: Users can update their own trades
CREATE POLICY "Users can update own trades" ON trades
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM users 
      WHERE privy_id = current_setting('app.current_user_id', true)
    )
  );

-- Trigger to automatically update updated_at
CREATE TRIGGER update_trades_updated_at
  BEFORE UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();






