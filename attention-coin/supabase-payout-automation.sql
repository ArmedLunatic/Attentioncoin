-- Payout Automation Migration
-- Adds columns and indexes to support automatic payout processing

-- Add columns to payouts table for automation tracking
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS batch_id VARCHAR(36);
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS last_error TEXT;

-- Index for efficient batch queries
CREATE INDEX IF NOT EXISTS idx_payouts_batch ON payouts(batch_id);

-- Index for status-based queries (finding pending/failed payouts)
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);

-- Index for finding failed payouts that need retry
CREATE INDEX IF NOT EXISTS idx_payouts_retry ON payouts(status, retry_count) WHERE status = 'failed';

-- Function to atomically increment user earnings
-- This prevents race conditions when multiple payouts complete simultaneously
CREATE OR REPLACE FUNCTION increment_user_earnings(p_user_id UUID, p_amount BIGINT)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET
    total_earned_lamports = COALESCE(total_earned_lamports, 0) + p_amount,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users (adjust role as needed)
GRANT EXECUTE ON FUNCTION increment_user_earnings(UUID, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_user_earnings(UUID, BIGINT) TO service_role;
