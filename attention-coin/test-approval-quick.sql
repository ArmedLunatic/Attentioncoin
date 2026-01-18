-- ═══════════════════════════════════════════════════════════════════════════
-- QUICK APPROVAL PIPELINE TEST
-- Copy-paste this entire block into Supabase Studio SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- Create test user and 10 approved submissions in one transaction
WITH new_user AS (
  INSERT INTO users (wallet_address, x_username)
  VALUES ('QuickApprovalTest', 'quick_approval')
  RETURNING id, wallet_address
),
submissions_created AS (
  INSERT INTO submissions (user_id, tweet_id, tweet_url, status, base_score, final_score)
  SELECT
    (SELECT id FROM new_user),
    (1000000000000000000 + generate_series)::text,
    'https://x.com/test/status/' || (1000000000000000000 + generate_series)::text,
    'approved',  -- Triggers automation
    20.00,
    20.00
  FROM generate_series(1, 10)
  RETURNING id, status
)
-- Show user stats after all approvals
SELECT
  u.wallet_address,
  u.total_submissions,  -- Should be 10
  u.current_streak,     -- Should be 1
  u.longest_streak,     -- Should be 1
  COUNT(ub.id) as badges_earned  -- Should be 2 (First Post + Rising Star)
FROM users u
LEFT JOIN user_badges ub ON u.id = ub.user_id
WHERE u.wallet_address = 'QuickApprovalTest'
GROUP BY u.id, u.wallet_address, u.total_submissions, u.current_streak, u.longest_streak;

-- Show which badges were earned
SELECT u.x_username, b.name, b.description
FROM user_badges ub
JOIN users u ON ub.user_id = u.id
JOIN badges b ON ub.badge_id = b.id
WHERE u.wallet_address = 'QuickApprovalTest'
ORDER BY ub.earned_at;

-- Cleanup
DELETE FROM users WHERE wallet_address = 'QuickApprovalTest';
