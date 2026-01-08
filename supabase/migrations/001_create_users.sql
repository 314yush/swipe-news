-- Create users table
-- Stores user information from Privy authentication

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_id TEXT UNIQUE NOT NULL,
  wallet_address TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on privy_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_privy_id ON users(privy_id);

-- Create index on wallet_address for wallet-based queries
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT
  USING (auth.uid()::text = privy_id OR privy_id = current_setting('app.current_user_id', true));

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE
  USING (auth.uid()::text = privy_id OR privy_id = current_setting('app.current_user_id', true));

-- Policy: Users can insert their own data
CREATE POLICY "Users can insert own data" ON users
  FOR INSERT
  WITH CHECK (auth.uid()::text = privy_id OR privy_id = current_setting('app.current_user_id', true));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();






