-- ═══════════════════════════════════════════════════════════════════════════
-- APPROVAL PIPELINE TEST - End-to-End
-- Tests the complete automated rewards flow when approving a submission
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- SETUP: Create test user
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO users (wallet_address, x_username, x_display_name)
VALUES ('PipelineTestWallet123456789ABC', 'pipeline_test', 'Pipeline Test User')
RETURNING id, wallet_address, total_submissions, current_streak, longest_streak;

-- Copy the user ID from above for use in subsequent queries
-- Or use this query to get it:
SELECT id FROM users WHERE wallet_address = 'PipelineTestWallet123456789ABC';

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFY: Initial state (before any approvals)
-- ═══════════════════════════════════════════════════════════════════════════

SELECT
  u.x_username,
  u.total_submissions,
  u.current_streak,
  u.longest_streak,
  u.last_submission_date,
  COUNT(ub.id) as badges_earned
FROM users u
LEFT JOIN user_badges ub ON u.id = ub.user_id
WHERE u.wallet_address = 'PipelineTestWallet123456789ABC'
GROUP BY u.id, u.x_username, u.total_submissions, u.current_streak,
         u.longest_streak, u.last_submission_date;
-- Expected: total_submissions=0, current_streak=0, longest_streak=0, badges_earned=0

-- ═══════════════════════════════════════════════════════════════════════════
-- TEST 1: Approve first submission
-- ═══════════════════════════════════════════════════════════════════════════

-- Create a pending submission (replace USER_ID with actual UUID)
INSERT INTO submissions (
  user_id,
  tweet_id,
  tweet_url,
  tweet_text,
  has_ca,
  has_cashtag,
  status,
  likes,
  reposts,
  replies,
  base_score,
  final_score
)
VALUES (
  'YOUR-USER-ID-HERE'::uuid,
  '1234567890123456789',
  'https://x.com/pipeline_test/status/1234567890123456789',
  'Test tweet about #AttentionCoin $ATTN with contract address',
  true,
  true,
  'pending',
  10,
  5,
  2,
  25.00,
  25.00
)
RETURNING id, tweet_id, status, approved_at;

-- Copy the submission ID from above
SELECT id FROM submissions WHERE tweet_id = '1234567890123456789';

-- APPROVE the submission (replace SUBMISSION_ID with actual UUID)
UPDATE submissions
SET status = 'approved'
WHERE id = 'YOUR-SUBMISSION-ID-HERE'::uuid
RETURNING id, status, approved_at;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFY: Check all downstream effects
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Check user stats updated
SELECT
  x_username,
  total_submissions,  -- Should be 1
  current_streak,     -- Should be 1
  longest_streak,     -- Should be 1
  last_submission_date -- Should be today
FROM users
WHERE wallet_address = 'PipelineTestWallet123456789ABC';

-- 2. Check "First Post" badge was awarded
SELECT
  u.x_username,
  b.name as badge_name,
  b.description,
  ub.earned_at
FROM user_badges ub
JOIN users u ON ub.user_id = u.id
JOIN badges b ON ub.badge_id = b.id
WHERE u.wallet_address = 'PipelineTestWallet123456789ABC'
ORDER BY ub.earned_at;
-- Expected: 1 badge "First Post"

-- 3. Check submission approved_at was set
SELECT
  tweet_id,
  status,
  approved_at,
  approved_at IS NOT NULL as has_approval_timestamp
FROM submissions
WHERE tweet_id = '1234567890123456789';
-- Expected: status='approved', has_approval_timestamp=true

-- ═══════════════════════════════════════════════════════════════════════════
-- TEST 2: Approve more submissions to earn "Rising Star" badge
-- ═══════════════════════════════════════════════════════════════════════════

-- Create and approve 9 more submissions (to reach 10 total)
DO $$
DECLARE
  v_user_id uuid;
  i INTEGER;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE wallet_address = 'PipelineTestWallet123456789ABC';

  FOR i IN 2..10 LOOP
    INSERT INTO submissions (
      user_id,
      tweet_id,
      tweet_url,
      status,
      base_score,
      final_score
    ) VALUES (
      v_user_id,
      (1234567890123456789 + i)::text,
      'https://x.com/pipeline_test/status/' || (1234567890123456789 + i)::text,
      'approved',  -- Directly insert as approved to trigger automation
      20.00,
      20.00
    );
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFY: Multiple submissions approved
-- ═══════════════════════════════════════════════════════════════════════════

-- Check user now has 10 submissions
SELECT
  x_username,
  total_submissions,  -- Should be 10
  current_streak,     -- Should be 1 (still same day)
  longest_streak
FROM users
WHERE wallet_address = 'PipelineTestWallet123456789ABC';

-- Check badges - should now have "First Post" AND "Rising Star"
SELECT
  b.name,
  b.description,
  b.requirement_value,
  ub.earned_at
FROM user_badges ub
JOIN users u ON ub.user_id = u.id
JOIN badges b ON ub.badge_id = b.id
WHERE u.wallet_address = 'PipelineTestWallet123456789ABC'
ORDER BY ub.earned_at;
-- Expected: 2 badges

-- ═══════════════════════════════════════════════════════════════════════════
-- TEST 3: Test idempotency - re-approving should NOT double-award
-- ═══════════════════════════════════════════════════════════════════════════

-- Get a submission that's already approved
SELECT id, status FROM submissions
WHERE tweet_id = '1234567890123456789'
LIMIT 1;

-- Try to "re-approve" it by setting status again
UPDATE submissions
SET status = 'approved'
WHERE tweet_id = '1234567890123456789';

-- Verify stats did NOT change
SELECT
  x_username,
  total_submissions,  -- Should STILL be 10 (not 11!)
  current_streak
FROM users
WHERE wallet_address = 'PipelineTestWallet123456789ABC';

-- Verify badges did NOT duplicate
SELECT COUNT(*) as badge_count
FROM user_badges ub
JOIN users u ON ub.user_id = u.id
WHERE u.wallet_address = 'PipelineTestWallet123456789ABC';
-- Expected: Still 2 badges (no duplicates)

-- ═══════════════════════════════════════════════════════════════════════════
-- TEST 4: Test rejection does NOT trigger automation
-- ═══════════════════════════════════════════════════════════════════════════

-- Create a new submission
INSERT INTO submissions (
  user_id,
  tweet_id,
  tweet_url,
  status
)
SELECT
  id,
  '9999999999999999999',
  'https://x.com/pipeline_test/status/9999999999999999999',
  'pending'
FROM users
WHERE wallet_address = 'PipelineTestWallet123456789ABC';

-- REJECT it instead of approving
UPDATE submissions
SET status = 'rejected', rejection_reason = 'Test rejection'
WHERE tweet_id = '9999999999999999999';

-- Verify stats did NOT change
SELECT
  x_username,
  total_submissions,  -- Should STILL be 10
  current_streak
FROM users
WHERE wallet_address = 'PipelineTestWallet123456789ABC';
-- Expected: No change (rejection doesn't count)

-- ═══════════════════════════════════════════════════════════════════════════
-- TEST 5: Test streak continuation (multi-day)
-- ═══════════════════════════════════════════════════════════════════════════

-- Simulate yesterday's submission by manually updating last_submission_date
UPDATE users
SET last_submission_date = CURRENT_DATE - 1
WHERE wallet_address = 'PipelineTestWallet123456789ABC';

-- Create and approve a new submission today
INSERT INTO submissions (
  user_id,
  tweet_id,
  tweet_url,
  status
)
SELECT
  id,
  '8888888888888888888',
  'https://x.com/pipeline_test/status/8888888888888888888',
  'approved'
FROM users
WHERE wallet_address = 'PipelineTestWallet123456789ABC';

-- Verify streak incremented
SELECT
  x_username,
  total_submissions,  -- Should be 11
  current_streak,     -- Should be 2 (continued from yesterday)
  longest_streak,     -- Should be 2
  last_submission_date -- Should be today
FROM users
WHERE wallet_address = 'PipelineTestWallet123456789ABC';

-- ═══════════════════════════════════════════════════════════════════════════
-- FINAL SUMMARY
-- ═══════════════════════════════════════════════════════════════════════════

SELECT
  'USER STATS' as section,
  u.x_username,
  u.total_submissions,
  u.current_streak,
  u.longest_streak,
  u.last_submission_date,
  COUNT(DISTINCT ub.badge_id) as total_badges
FROM users u
LEFT JOIN user_badges ub ON u.id = ub.user_id
WHERE u.wallet_address = 'PipelineTestWallet123456789ABC'
GROUP BY u.id, u.x_username, u.total_submissions, u.current_streak,
         u.longest_streak, u.last_submission_date

UNION ALL

SELECT
  'SUBMISSIONS' as section,
  NULL,
  COUNT(*)::int,
  COUNT(*) FILTER (WHERE status = 'approved')::int,
  COUNT(*) FILTER (WHERE status = 'rejected')::int,
  NULL,
  NULL
FROM submissions
WHERE user_id = (SELECT id FROM users WHERE wallet_address = 'PipelineTestWallet123456789ABC');

-- List all earned badges
SELECT
  'BADGES EARNED' as info,
  b.name,
  b.description,
  b.requirement_type,
  b.requirement_value,
  ub.earned_at
FROM user_badges ub
JOIN badges b ON ub.badge_id = b.id
WHERE ub.user_id = (SELECT id FROM users WHERE wallet_address = 'PipelineTestWallet123456789ABC')
ORDER BY ub.earned_at;

-- ═══════════════════════════════════════════════════════════════════════════
-- CLEANUP
-- ═══════════════════════════════════════════════════════════════════════════

DELETE FROM users WHERE wallet_address = 'PipelineTestWallet123456789ABC';
-- Note: Submissions and user_badges will cascade delete

-- Verify cleanup
SELECT COUNT(*) as remaining_test_data
FROM users
WHERE wallet_address = 'PipelineTestWallet123456789ABC';
-- Expected: 0
