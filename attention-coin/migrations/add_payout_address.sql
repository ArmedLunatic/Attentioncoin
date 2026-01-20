-- Migration: Add payout_address column to users table
-- This allows users to specify a separate Solana address for receiving payouts
-- independent of any wallet they may have connected

ALTER TABLE users ADD COLUMN IF NOT EXISTS payout_address TEXT;

-- Create an index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_users_payout_address ON users(payout_address) WHERE payout_address IS NOT NULL;

-- Comment explaining the column
COMMENT ON COLUMN users.payout_address IS 'User-specified Solana address for receiving payouts. Separate from wallet_address.';
