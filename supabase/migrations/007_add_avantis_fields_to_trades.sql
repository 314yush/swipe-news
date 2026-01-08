-- Add Avantis-specific fields to trades table
-- These are needed for closing positions and tracking on-chain trades

ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS pair_index INTEGER,
ADD COLUMN IF NOT EXISTS trade_index INTEGER,
ADD COLUMN IF NOT EXISTS avantis_trade_id TEXT,
ADD COLUMN IF NOT EXISTS privy_user_id TEXT,
ADD COLUMN IF NOT EXISTS privy_wallet_address TEXT;

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_trades_pair_index ON trades(pair_index);
CREATE INDEX IF NOT EXISTS idx_trades_trade_index ON trades(trade_index);
CREATE INDEX IF NOT EXISTS idx_trades_avantis_trade_id ON trades(avantis_trade_id);
CREATE INDEX IF NOT EXISTS idx_trades_privy_user_id ON trades(privy_user_id);

-- Composite index for closing positions
CREATE INDEX IF NOT EXISTS idx_trades_pair_trade_index ON trades(pair_index, trade_index) 
WHERE pair_index IS NOT NULL AND trade_index IS NOT NULL;






