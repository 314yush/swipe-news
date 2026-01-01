-- Fix users table schema for proper Privy integration
-- This migration ensures privy_user_id has proper constraints
-- It handles cases where privy_id may or may not exist

-- First, check if privy_id column exists, and create it if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'privy_id'
    ) THEN
        -- Add privy_id column if it doesn't exist
        ALTER TABLE users 
        ADD COLUMN privy_id TEXT;
        
        -- Create index on privy_id
        CREATE INDEX IF NOT EXISTS idx_users_privy_id ON users(privy_id);
        
        -- Add unique constraint to privy_id
        ALTER TABLE users 
        ADD CONSTRAINT users_privy_id_key UNIQUE (privy_id);
    END IF;
END $$;

-- Ensure privy_user_id column exists
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS privy_user_id TEXT;

-- Create index on privy_user_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_users_privy_user_id ON users(privy_user_id);

-- Add UNIQUE constraint to privy_user_id if it doesn't exist
-- This allows us to use it for upsert operations
DO $$
BEGIN
    -- Check if unique constraint already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'users_privy_user_id_key'
    ) THEN
        -- Add unique constraint
        ALTER TABLE users 
        ADD CONSTRAINT users_privy_user_id_key UNIQUE (privy_user_id);
    END IF;
END $$;

-- Ensure privy_id and privy_user_id are always in sync
-- Create a trigger to keep them synchronized
-- Note: privy_id is created above if it doesn't exist, so it should always exist by the time this runs
CREATE OR REPLACE FUNCTION sync_privy_ids()
RETURNS TRIGGER AS $$
BEGIN
    -- If privy_id is set but privy_user_id is not, copy it
    IF NEW.privy_id IS NOT NULL AND NEW.privy_user_id IS NULL THEN
        NEW.privy_user_id := NEW.privy_id;
    END IF;
    
    -- If privy_user_id is set but privy_id is not, copy it
    IF NEW.privy_user_id IS NOT NULL AND NEW.privy_id IS NULL THEN
        NEW.privy_id := NEW.privy_user_id;
    END IF;
    
    -- Ensure they match if both are set
    IF NEW.privy_id IS NOT NULL AND NEW.privy_user_id IS NOT NULL 
       AND NEW.privy_id != NEW.privy_user_id THEN
        -- Prefer privy_user_id as source of truth (since it's what we use for upserts)
        NEW.privy_id := NEW.privy_user_id;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN undefined_column THEN
        -- If privy_id column doesn't exist, just set privy_user_id and return
        -- This shouldn't happen since we create it above, but handle it gracefully
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and recreate it
DROP TRIGGER IF EXISTS sync_privy_ids_trigger ON users;
CREATE TRIGGER sync_privy_ids_trigger
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION sync_privy_ids();

-- Update existing rows to ensure both columns are populated
-- privy_id is created above if it doesn't exist, so we can safely reference it here
UPDATE users 
SET privy_user_id = privy_id 
WHERE privy_user_id IS NULL AND privy_id IS NOT NULL;

UPDATE users 
SET privy_id = privy_user_id 
WHERE privy_id IS NULL AND privy_user_id IS NOT NULL;

-- Add helpful comments
-- privy_id and privy_user_id are created above, so they should exist
COMMENT ON COLUMN users.privy_id IS 'Privy user ID (DID format: did:privy:...) - Primary identifier';
COMMENT ON COLUMN users.privy_user_id IS 'Privy user ID (same as privy_id) - For server-side transaction signing compatibility';

-- Add comment for privy_wallet_address if it exists (from migration 006)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'privy_wallet_address'
    ) THEN
        EXECUTE 'COMMENT ON COLUMN users.privy_wallet_address IS ''Privy embedded wallet address for server-side transaction signing''';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors
        NULL;
END $$;

