-- Add Privy-specific fields to users table
-- These are needed for server-side transaction signing

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS privy_user_id TEXT,
ADD COLUMN IF NOT EXISTS privy_wallet_address TEXT;

-- Create index on privy_user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_privy_user_id ON users(privy_user_id);

-- Update existing users if they have privy_id set (migration helper)
-- Note: privy_id and privy_user_id may be the same, but we keep both for compatibility
UPDATE users 
SET privy_user_id = privy_id 
WHERE privy_user_id IS NULL AND privy_id IS NOT NULL;

-- Update existing users if they have wallet_address set
UPDATE users 
SET privy_wallet_address = wallet_address 
WHERE privy_wallet_address IS NULL AND wallet_address IS NOT NULL;






