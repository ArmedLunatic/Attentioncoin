-- ═══════════════════════════════════════════════════════════════════════════
-- UPDATE POOL BUDGET TO 1 SOL
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ═══════════════════════════════════════════════════════════════════════════

-- Update payout settings to 1 SOL daily budget
INSERT INTO config (key, value) VALUES
('payout_settings', '{
  "daily_budget_sol": 1,
  "max_per_user_sol": 0.5,
  "min_payout_sol": 0.001,
  "payout_interval_hours": 24
}'::jsonb)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- Verify the update
SELECT key, value
FROM config
WHERE key = 'payout_settings';
