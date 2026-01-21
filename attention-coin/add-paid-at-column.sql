-- ═══════════════════════════════════════════════════════════════════════════
-- AGGREGATE PAYOUT FIX - ADD paid_at COLUMN
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ═══════════════════════════════════════════════════════════════════════════

-- Add paid_at column to submissions table for tracking when payments were completed
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Add comment to explain the column
COMMENT ON COLUMN submissions.paid_at IS 'Timestamp when the submission was paid out (different from approved_at)';

-- Create index for better query performance on paid_at
CREATE INDEX IF NOT EXISTS idx_submissions_paid_at ON submissions(paid_at);

-- Update existing paid submissions to have paid_at = approved_at for consistency
UPDATE submissions 
SET paid_at = approved_at 
WHERE status = 'paid' AND paid_at IS NULL AND approved_at IS NOT NULL;

-- Verify the column was added successfully
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'submissions' AND column_name = 'paid_at';