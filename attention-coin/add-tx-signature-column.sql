-- ═══════════════════════════════════════════════════════════════════════════
-- ADD TX_SIGNATURE COLUMN TO SUBMISSIONS TABLE
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ═══════════════════════════════════════════════════════════════════════════

-- Add tx_signature column to submissions table for tracking transaction signatures
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS tx_signature VARCHAR(88);

-- Add comment to explain the column
COMMENT ON COLUMN submissions.tx_signature IS 'Solana transaction signature for the payout transaction';

-- Create index for better query performance on tx_signature
CREATE INDEX IF NOT EXISTS idx_submissions_tx_signature ON submissions(tx_signature);

-- Verify the column was added successfully
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'submissions' AND column_name = 'tx_signature';
