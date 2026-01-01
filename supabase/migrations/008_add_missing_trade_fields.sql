-- Add missing Avantis fields to existing trades table
-- This migration is safe to run on existing schema

-- Add pair_index and trade_index for closing positions
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS pair_index INTEGER,
ADD COLUMN IF NOT EXISTS trade_index INTEGER;

-- Add privy fields for trading service (if not already present)
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS privy_user_id TEXT,
ADD COLUMN IF NOT EXISTS privy_wallet_address TEXT;

-- Note: avantis_trade_id already exists in your schema, so we don't add it

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_trades_pair_index ON trades(pair_index);
CREATE INDEX IF NOT EXISTS idx_trades_trade_index ON trades(trade_index);
CREATE INDEX IF NOT EXISTS idx_trades_avantis_trade_id ON trades(avantis_trade_id);
CREATE INDEX IF NOT EXISTS idx_trades_privy_user_id ON trades(privy_user_id);

-- Composite index for closing positions
CREATE INDEX IF NOT EXISTS idx_trades_pair_trade_index ON trades(pair_index, trade_index) 
WHERE pair_index IS NOT NULL AND trade_index IS NOT NULL;

-- Add helpful comment
COMMENT ON COLUMN trades.pair_index IS 'Avantis pair index for closing positions';
COMMENT ON COLUMN trades.trade_index IS 'Avantis trade index for closing positions';
COMMENT ON COLUMN trades.privy_user_id IS 'Privy user ID for server-side transaction signing';
COMMENT ON COLUMN trades.privy_wallet_address IS 'Privy wallet address for server-side transaction signing';


