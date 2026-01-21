-- ═══════════════════════════════════════════════════════════════════════════
-- ADD PAID COLUMN TO SUBMISSIONS TABLE
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ═══════════════════════════════════════════════════════════════════════════

-- Add paid boolean column to track if submission has been paid
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS paid BOOLEAN DEFAULT FALSE;

-- Add index for better query performance on paid status
CREATE INDEX IF NOT EXISTS idx_submissions_paid ON submissions(paid);

-- Add composite index for common queries (status + paid)
CREATE INDEX IF NOT EXISTS idx_submissions_status_paid ON submissions(status, paid);

-- Add comment to explain the column
COMMENT ON COLUMN submissions.paid IS 'Whether the submission has been paid out (separate from paid_at timestamp)';

-- Verify the column was added successfully
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'submissions' AND column_name = 'paid';
