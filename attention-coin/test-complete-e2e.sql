-- ═══════════════════════════════════════════════════════════════════════════
-- COMPLETE END-TO-END TEST
-- Tests the entire approval automation pipeline
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 1: Verify badges are seeded
-- ═══════════════════════════════════════════════════════════════════════════
SELECT '=== STEP 1: Verify Badges Seeded ===' as test_step;

SELECT name, requirement_type, requirement_value, color
FROM badges
ORDER BY requirement_value;
-- Expected: 8 badges

SELECT
  CASE
    WHEN COUNT(*) = 8 THEN '✅ PASS: 8 badges seeded'
    ELSE '❌ FAIL: Expected 8 badges, found ' || COUNT(*)
  END as result
FROM badges;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 2: Create test user
-- ═══════════════════════════════════════════════════════════════════════════
SELECT '=== STEP 2: Create Test User ===' as test_step;

INSERT INTO users (wallet_address, x_username, x_display_name)
VALUES ('E2ETestWallet123ABC', 'e2e_test', 'E2E Test User')
ON CONFLICT (wallet_address) DO UPDATE SET x_username = EXCLUDED.x_username
RETURNING id, wallet_address, x_username, total_submissions, current_streak;

-- Store user ID for later
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE wallet_address = 'E2ETestWallet123ABC';
  RAISE NOTICE 'User ID: %', v_user_id;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 3: Verify initial state (no badges, no submissions)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT '=== STEP 3: Verify Initial State ===' as test_step;

SELECT
  u.wallet_address,
  u.total_submissions,
  u.current_streak,
  u.longest_streak,
  COUNT(ub.id) as badges_earned
FROM users u
LEFT JOIN user_badges ub ON u.id = ub.user_id
WHERE u.wallet_address = 'E2ETestWallet123ABC'
GROUP BY u.id, u.wallet_address, u.total_submissions, u.current_streak, u.longest_streak;

SELECT
  CASE
    WHEN total_submissions = 0 AND current_streak = 0 THEN '✅ PASS: Initial state correct'
    ELSE '❌ FAIL: Initial state incorrect'
  END as result
FROM users
WHERE wallet_address = 'E2ETestWallet123ABC';

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 4: Create pending submission
-- ═══════════════════════════════════════════════════════════════════════════
SELECT '=== STEP 4: Create Pending Submission ===' as test_step;

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
SELECT
  id,
  'e2e_test_tweet_001',
  'https://x.com/e2e_test/status/e2e_test_tweet_001',
  'Testing #AttentionCoin automation with $ATTN',
  true,
  true,
  'pending',
  15,
  5,
  3,
  30.00,
  30.00
FROM users
WHERE wallet_address = 'E2ETestWallet123ABC'
RETURNING id, tweet_id, status, approved_at;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 5: APPROVE THE SUBMISSION (triggers automation)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT '=== STEP 5: APPROVE SUBMISSION ===' as test_step;

UPDATE submissions
SET status = 'approved'
WHERE tweet_id = 'e2e_test_tweet_001'
RETURNING id, status, approved_at, approved_at IS NOT NULL as has_timestamp;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 6: Verify trigger fired - Check user stats updated
-- ═══════════════════════════════════════════════════════════════════════════
SELECT '=== STEP 6: Verify Stats Updated ===' as test_step;

SELECT
  wallet_address,
  total_submissions,
  current_streak,
  longest_streak,
  last_submission_date
FROM users
WHERE wallet_address = 'E2ETestWallet123ABC';

SELECT
  CASE
    WHEN total_submissions = 1 AND current_streak = 1 AND longest_streak = 1
    THEN '✅ PASS: Stats updated correctly'
    ELSE '❌ FAIL: Stats not updated (total_submissions=' || total_submissions || ', current_streak=' || current_streak || ')'
  END as result
FROM users
WHERE wallet_address = 'E2ETestWallet123ABC';

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 7: Verify "First Post" badge was awarded
-- ═══════════════════════════════════════════════════════════════════════════
SELECT '=== STEP 7: Verify Badge Awarded ===' as test_step;

SELECT
  u.wallet_address,
  b.name,
  b.description,
  ub.earned_at
FROM user_badges ub
JOIN users u ON ub.user_id = u.id
JOIN badges b ON ub.badge_id = b.id
WHERE u.wallet_address = 'E2ETestWallet123ABC'
ORDER BY ub.earned_at;

SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM user_badges ub
      JOIN users u ON ub.user_id = u.id
      JOIN badges b ON ub.badge_id = b.id
      WHERE u.wallet_address = 'E2ETestWallet123ABC'
      AND b.name = 'First Post'
    ) THEN '✅ PASS: "First Post" badge awarded'
    ELSE '❌ FAIL: "First Post" badge NOT awarded'
  END as result;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 8: Test idempotency - Re-approve should NOT duplicate
-- ═══════════════════════════════════════════════════════════════════════════
SELECT '=== STEP 8: Test Idempotency ===' as test_step;

-- Re-approve the same submission
UPDATE submissions
SET status = 'approved'
WHERE tweet_id = 'e2e_test_tweet_001';

-- Verify stats did NOT change
SELECT
  wallet_address,
  total_submissions,  -- Should STILL be 1
  current_streak
FROM users
WHERE wallet_address = 'E2ETestWallet123ABC';

SELECT
  CASE
    WHEN total_submissions = 1 THEN '✅ PASS: Idempotency works (no duplicate increment)'
    ELSE '❌ FAIL: Stats incremented again (total_submissions=' || total_submissions || ')'
  END as result
FROM users
WHERE wallet_address = 'E2ETestWallet123ABC';

-- Verify badges did NOT duplicate
SELECT
  CASE
    WHEN COUNT(*) = 1 THEN '✅ PASS: No duplicate badges'
    ELSE '❌ FAIL: Badges duplicated (count=' || COUNT(*) || ')'
  END as result
FROM user_badges ub
JOIN users u ON ub.user_id = u.id
WHERE u.wallet_address = 'E2ETestWallet123ABC';

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 9: Approve 9 more submissions to reach 10 total
-- ═══════════════════════════════════════════════════════════════════════════
SELECT '=== STEP 9: Approve 9 More Submissions ===' as test_step;

DO $$
DECLARE
  v_user_id uuid;
  i INTEGER;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE wallet_address = 'E2ETestWallet123ABC';

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
      'e2e_test_tweet_00' || i,
      'https://x.com/e2e_test/status/e2e_test_tweet_00' || i,
      'approved',  -- Insert as approved to trigger automation
      25.00,
      25.00
    );
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 10: Verify "Rising Star" badge awarded (10 submissions)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT '=== STEP 10: Verify Rising Star Badge ===' as test_step;

SELECT
  wallet_address,
  total_submissions,  -- Should be 10
  COUNT(ub.id) FILTER (WHERE b.name = 'Rising Star') as has_rising_star
FROM users u
LEFT JOIN user_badges ub ON u.id = ub.user_id
LEFT JOIN badges b ON ub.badge_id = b.id
WHERE u.wallet_address = 'E2ETestWallet123ABC'
GROUP BY u.id, u.wallet_address, u.total_submissions;

SELECT
  CASE
    WHEN total_submissions = 10 THEN '✅ PASS: 10 submissions recorded'
    ELSE '❌ FAIL: Expected 10 submissions, got ' || total_submissions
  END as result
FROM users
WHERE wallet_address = 'E2ETestWallet123ABC';

SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM user_badges ub
      JOIN users u ON ub.user_id = u.id
      JOIN badges b ON ub.badge_id = b.id
      WHERE u.wallet_address = 'E2ETestWallet123ABC'
      AND b.name = 'Rising Star'
    ) THEN '✅ PASS: "Rising Star" badge awarded'
    ELSE '❌ FAIL: "Rising Star" badge NOT awarded'
  END as result;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 11: Final summary - Show all badges earned
-- ═══════════════════════════════════════════════════════════════════════════
SELECT '=== STEP 11: Final Summary ===' as test_step;

SELECT
  b.name,
  b.description,
  b.requirement_value,
  ub.earned_at
FROM user_badges ub
JOIN badges b ON ub.badge_id = b.id
JOIN users u ON ub.user_id = u.id
WHERE u.wallet_address = 'E2ETestWallet123ABC'
ORDER BY ub.earned_at;

SELECT
  '✅ E2E TEST COMPLETE' as status,
  u.total_submissions || ' submissions' as submissions,
  u.current_streak || ' day streak' as streak,
  COUNT(ub.id) || ' badges earned' as badges
FROM users u
LEFT JOIN user_badges ub ON u.id = ub.user_id
WHERE u.wallet_address = 'E2ETestWallet123ABC'
GROUP BY u.id, u.total_submissions, u.current_streak;

-- ═══════════════════════════════════════════════════════════════════════════
-- CLEANUP
-- ═══════════════════════════════════════════════════════════════════════════
SELECT '=== CLEANUP ===' as test_step;

DELETE FROM users WHERE wallet_address = 'E2ETestWallet123ABC';

SELECT '✅ Test data cleaned up' as result;
