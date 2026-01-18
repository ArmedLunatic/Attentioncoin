-- ═══════════════════════════════════════════════════════════════════════════
-- BADGE AWARD FUNCTION - SQL TEST GUIDE
-- Run these commands in Supabase Studio SQL Editor to test badge awarding
-- ═══════════════════════════════════════════════════════════════════════════

-- SETUP: Create a test user
-- Copy the UUID returned - you'll need it for subsequent commands
INSERT INTO users (wallet_address, x_username)
VALUES ('TestWallet123ABC456DEF789GHI012JKL', 'test_user_badges')
RETURNING id, wallet_address, x_username;

-- ═══════════════════════════════════════════════════════════════════════════
-- TEST 1: Award "First Post" badge (1 submission required)
-- ═══════════════════════════════════════════════════════════════════════════

-- Set user to have 1 submission
UPDATE users
SET total_submissions = 1
WHERE wallet_address = 'TestWallet123ABC456DEF789GHI012JKL';

-- Call the award function (replace UUID with your test user's ID)
SELECT * FROM award_eligible_badges('YOUR-USER-UUID-HERE'::uuid);
-- Expected: "First Post" badge should show awarded = true

-- Verify badge was awarded
SELECT u.x_username, b.name, b.description, ub.earned_at
FROM user_badges ub
JOIN users u ON ub.user_id = u.id
JOIN badges b ON ub.badge_id = b.id
WHERE u.wallet_address = 'TestWallet123ABC456DEF789GHI012JKL';
-- Expected: 1 row showing "First Post" badge

-- ═══════════════════════════════════════════════════════════════════════════
-- TEST 2: Test idempotency - running again should NOT duplicate
-- ═══════════════════════════════════════════════════════════════════════════

SELECT * FROM award_eligible_badges('YOUR-USER-UUID-HERE'::uuid);
-- Expected: "First Post" shows awarded = false (already earned)

-- Verify still only 1 badge
SELECT COUNT(*) as badge_count
FROM user_badges ub
JOIN users u ON ub.user_id = u.id
WHERE u.wallet_address = 'TestWallet123ABC456DEF789GHI012JKL';
-- Expected: badge_count = 1

-- ═══════════════════════════════════════════════════════════════════════════
-- TEST 3: Award multiple badges at once
-- ═══════════════════════════════════════════════════════════════════════════

-- Update user to meet multiple requirements
UPDATE users
SET
  total_submissions = 15,          -- Qualifies for "Rising Star" (10 required)
  current_streak = 10,             -- Qualifies for "Consistent" (7 required)
  total_earned_lamports = 500000000, -- Does NOT qualify for "Whale" (1B required)
  total_referrals = 6              -- Qualifies for "Recruiter" (5 required)
WHERE wallet_address = 'TestWallet123ABC456DEF789GHI012JKL';

-- Award badges
SELECT * FROM award_eligible_badges('YOUR-USER-UUID-HERE'::uuid);
-- Expected:
--   - First Post: awarded = false (already earned)
--   - Consistent: awarded = true (newly awarded)
--   - Rising Star: awarded = true (newly awarded)
--   - Recruiter: awarded = true (newly awarded)
--   - Whale: awarded = false (not eligible)

-- Verify all earned badges
SELECT b.name, b.requirement_type, b.requirement_value, ub.earned_at
FROM user_badges ub
JOIN badges b ON ub.badge_id = b.id
JOIN users u ON ub.user_id = u.id
WHERE u.wallet_address = 'TestWallet123ABC456DEF789GHI012JKL'
ORDER BY ub.earned_at;
-- Expected: 4 badges (First Post, Consistent, Rising Star, Recruiter)

-- ═══════════════════════════════════════════════════════════════════════════
-- TEST 4: Award high-tier badges
-- ═══════════════════════════════════════════════════════════════════════════

-- Update to qualify for everything
UPDATE users
SET
  total_submissions = 60,
  current_streak = 35,
  total_earned_lamports = 2000000000,
  total_referrals = 30
WHERE wallet_address = 'TestWallet123ABC456DEF789GHI012JKL';

-- Award all remaining badges
SELECT badge_name, awarded FROM award_eligible_badges('YOUR-USER-UUID-HERE'::uuid)
ORDER BY awarded DESC, badge_name;
-- Expected: "On Fire", "Influencer", "Whale", "Ambassador" show awarded = true

-- Final verification - should have all 8 badges
SELECT
  u.x_username,
  u.total_submissions,
  u.current_streak,
  u.total_earned_lamports,
  u.total_referrals,
  COUNT(ub.id) as total_badges_earned
FROM users u
LEFT JOIN user_badges ub ON u.id = ub.user_id
WHERE u.wallet_address = 'TestWallet123ABC456DEF789GHI012JKL'
GROUP BY u.id, u.x_username, u.total_submissions, u.current_streak,
         u.total_earned_lamports, u.total_referrals;
-- Expected: total_badges_earned = 8

-- ═══════════════════════════════════════════════════════════════════════════
-- TEST 5: Edge case - user with 0 stats
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO users (wallet_address, x_username)
VALUES ('ZeroStatsUser456DEF789GHI012JKL345', 'zero_stats_user')
RETURNING id;

-- Try awarding (replace with new user UUID)
SELECT * FROM award_eligible_badges('ZERO-STATS-USER-UUID-HERE'::uuid);
-- Expected: All badges show awarded = false

-- Verify no badges awarded
SELECT COUNT(*) as badge_count
FROM user_badges ub
JOIN users u ON ub.user_id = u.id
WHERE u.wallet_address = 'ZeroStatsUser456DEF789GHI012JKL345';
-- Expected: badge_count = 0

-- ═══════════════════════════════════════════════════════════════════════════
-- CLEANUP: Remove test data
-- ═══════════════════════════════════════════════════════════════════════════

DELETE FROM users WHERE wallet_address IN (
  'TestWallet123ABC456DEF789GHI012JKL',
  'ZeroStatsUser456DEF789GHI012JKL345'
);
-- Note: user_badges will auto-delete due to ON DELETE CASCADE

-- Verify cleanup
SELECT COUNT(*) FROM users WHERE wallet_address LIKE '%TestWallet%' OR wallet_address LIKE '%ZeroStats%';
-- Expected: 0
