-- ═══════════════════════════════════════════════════════════════════════════
-- MANUAL PAYOUT SYSTEM - SUPABASE MIGRATION
-- Run this in Supabase SQL Editor after deploying the manual payout system
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. ADD PAYOUT_ADDRESS COLUMN (if not exists)
-- This column stores user's dedicated payout wallet address
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS payout_address TEXT;

-- 2. ADD COMMENTS FOR DOCUMENTATION
COMMENT ON COLUMN users.payout_address IS 'Dedicated Solana wallet address for receiving payouts (separate from connected wallet)';

-- 3. CREATE INDEXES FOR PERFORMANCE
-- Index for fast payout address lookups
CREATE INDEX IF NOT EXISTS idx_users_payout_address ON users(payout_address) WHERE payout_address IS NOT NULL;

-- Index for x_username lookups (used by payout API)
CREATE INDEX IF NOT EXISTS idx_users_x_username ON users(x_username) WHERE x_username IS NOT NULL;

-- Index for submission status queries (admin dashboard)
CREATE INDEX IF NOT EXISTS idx_submissions_status_approved ON submissions(status) WHERE status = 'approved';

-- Index for payout queries
CREATE INDEX IF NOT EXISTS idx_submissions_user_status ON submissions(user_id, status);

-- 4. ENSURE REWARDS TABLE HAS ALL REQUIRED COLUMNS
ALTER TABLE rewards 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';

ALTER TABLE rewards 
ADD COLUMN IF NOT EXISTS tx_signature TEXT;

-- 5. UPDATE REWARDS TABLE COMMENTS
COMMENT ON COLUMN rewards.status IS 'Payout status: pending, processing, completed, failed';
COMMENT ON COLUMN rewards.tx_signature IS 'Solana transaction signature for completed payouts';

-- 6. CREATE PAYOUT AUDIT FUNCTION (optional but recommended)
CREATE OR REPLACE FUNCTION log_payout_execution()
RETURNS TRIGGER AS $$
BEGIN
    -- Log significant payout events for audit trail
    INSERT INTO payout_audit (user_id, old_status, new_status, amount_lamports, tx_signature, executed_at)
    VALUES (
        NEW.user_id,
        OLD.status,
        NEW.status,
        NEW.amount_lamports,
        NEW.tx_signature,
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. CREATE PAYOUT AUDIT TABLE (for comprehensive tracking)
CREATE TABLE IF NOT EXISTS payout_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    amount_lamports BIGINT,
    tx_signature TEXT,
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    executed_by VARCHAR(100) DEFAULT 'system', -- Can track admin who executed
    notes TEXT
);

-- 8. CREATE INDEXES FOR AUDIT TABLE
CREATE INDEX IF NOT EXISTS idx_payout_audit_user ON payout_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_audit_executed_at ON payout_audit(executed_at);

-- 9. ADD TRIGGER FOR AUTOMATIC AUDITING
DROP TRIGGER IF EXISTS trigger_payout_audit ON rewards;
CREATE TRIGGER trigger_payout_audit
    AFTER UPDATE ON rewards
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.tx_signature IS DISTINCT FROM NEW.tx_signature)
    EXECUTE FUNCTION log_payout_execution();

-- 10. UPDATE CONFIG TABLE WITH PAYOUT SETTINGS
INSERT INTO config (key, value) VALUES
('payout_settings', '{
  "daily_budget_sol": 10,
  "max_per_user_sol": 0.5,
  "min_payout_sol": 0.001,
  "fee_buffer_sol": 0.001,
  "mainnet_enabled": true
}'::jsonb)
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- 11. ADD USEFUL ADMIN CONFIGURATION
INSERT INTO config (key, value) VALUES
('payout_limits', '{
  "max_custom_amount": 10,
  "min_custom_amount": 0.001,
  "require_approval": true
}'::jsonb)
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- 12. CREATE HELPER VIEW FOR ADMIN DASHBOARD
-- This view simplifies admin queries for payouts
CREATE OR REPLACE VIEW admin_payout_overview AS
SELECT 
    s.id as submission_id,
    s.status as submission_status,
    s.final_score,
    s.created_at as submission_date,
    s.approved_at,
    u.id as user_id,
    u.x_username,
    u.wallet_address,
    u.payout_address,
    r.id as reward_id,
    r.status as reward_status,
    r.amount_lamports,
    r.tx_signature,
    r.period_date
FROM submissions s
LEFT JOIN users u ON s.user_id = u.id
LEFT JOIN rewards r ON s.user_id = r.user_id 
    AND DATE(r.period_date) = CURRENT_DATE
WHERE s.status IN ('approved', 'paid')
ORDER BY s.approved_at DESC NULLS LAST;

-- 13. VERIFICATION QUERIES
-- Run these to verify everything is set up correctly

-- Check payout_address column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'payout_address';

-- Check indexes were created
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('users', 'submissions', 'rewards', 'payout_audit')
  AND indexname LIKE 'idx_%';

-- Verify admin view works
SELECT COUNT(*) as total_pending_payouts 
FROM admin_payout_overview 
WHERE submission_status = 'approved';

-- Sample query to show users with payout addresses
SELECT 
    x_username,
    wallet_address,
    payout_address,
    CASE 
        WHEN payout_address IS NOT NULL THEN 'Has Payout Address'
        ELSE 'Uses Wallet Address'
    END as payout_method
FROM users 
WHERE x_username IS NOT NULL
LIMIT 10;

-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION COMPLETE
-- 
-- WHAT'S NOW AVAILABLE:
-- ✅ Payout address management for users
-- ✅ Comprehensive audit trail for all payouts
-- ✅ Performance-optimized indexes
-- ✅ Admin dashboard view for easy management
-- ✅ Configuration settings for payout limits
-- ✅ Full support for manual 1-click payouts
-- ═══════════════════════════════════════════════════════════════════════════