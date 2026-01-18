-- ═══════════════════════════════════════════════════════════════════════════
-- QUICK TEST: Copy-paste this entire block into Supabase Studio SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- Create test user and store UUID
WITH new_user AS (
  INSERT INTO users (wallet_address, x_username, total_submissions, current_streak, total_earned_lamports, total_referrals)
  VALUES ('QuickTest123', 'quick_test', 15, 10, 2000000000, 8)
  RETURNING id
)
-- Award badges and show results
SELECT * FROM award_eligible_badges((SELECT id FROM new_user));

-- View awarded badges
SELECT u.x_username, b.name, b.description, b.requirement_type, b.requirement_value
FROM user_badges ub
JOIN users u ON ub.user_id = u.id
JOIN badges b ON ub.badge_id = b.id
WHERE u.wallet_address = 'QuickTest123'
ORDER BY b.requirement_value;

-- Cleanup
DELETE FROM users WHERE wallet_address = 'QuickTest123';
