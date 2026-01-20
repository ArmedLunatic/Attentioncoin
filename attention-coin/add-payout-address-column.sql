-- ═══════════════════════════════════════════════════════════════════════════
-- ADD PAYOUT ADDRESS COLUMN TO USERS TABLE
-- Run this first to add the missing payout_address column
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. ADD PAYOUT_ADDRESS COLUMN
-- Add nullable payout_address column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS payout_address TEXT;

-- 2. ADD COMMENT
COMMENT ON COLUMN users.payout_address IS 'Solana address where user receives payout rewards (separate from wallet_address)';

-- 3. CREATE INDEX FOR PERFORMANCE
-- Create index for faster payout address lookups
CREATE INDEX IF NOT EXISTS idx_users_payout_address ON users(payout_address) WHERE payout_address IS NOT NULL;

-- 4. CREATE INDEX FOR X_USERNAME LOOKUPS
-- Create index for faster x_username queries (used by payout address API)
CREATE INDEX IF NOT EXISTS idx_users_x_username ON users(x_username) WHERE x_username IS NOT NULL;

-- 5. VERIFY COLUMN WAS ADDED
-- You should now see payout_address in the column list
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'payout_address';

-- ═══════════════════════════════════════════════════════════════════════════
-- TEST THE SETUP
-- ═══════════════════════════════════════════════════════════════════════════

-- Test query to verify everything works
SELECT 
    x_username,
    wallet_address,
    payout_address,
    x_verified_at,
    created_at
FROM users 
WHERE x_username IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- ═══════════════════════════════════════════════════════════════════════════
-- SAMPLE UPDATE (optional - for testing)
-- ═══════════════════════════════════════════════════════════════════════════

-- Uncomment to test with a sample Solana address
-- UPDATE users 
-- SET payout_address = '11111111111111111111111111111112' 
-- WHERE x_username = 'your_test_username'
-- LIMIT 1;