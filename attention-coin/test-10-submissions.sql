-- Test 10 submissions to earn "Rising Star" badge
INSERT INTO users (wallet_address, x_username)
VALUES ('Test10Submissions', 'test_10')
ON CONFLICT (wallet_address) DO NOTHING;

SELECT 'INITIAL STATE' as stage, wallet_address, total_submissions, current_streak
FROM users WHERE wallet_address = 'Test10Submissions';

-- Insert pending submissions
DO $$
DECLARE
  v_user_id uuid;
  i INTEGER;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE wallet_address = 'Test10Submissions';
  FOR i IN 1..10 LOOP
    INSERT INTO submissions (user_id, tweet_id, tweet_url, status)
    VALUES (v_user_id, 'tweet_' || i, 'https://x.com/test/' || i, 'pending');
  END LOOP;
END $$;

-- Now approve them all (triggers automation)
UPDATE submissions
SET status = 'approved'
WHERE user_id = (SELECT id FROM users WHERE wallet_address = 'Test10Submissions');

SELECT 'AFTER 10 APPROVALS' as stage, wallet_address, total_submissions, current_streak
FROM users WHERE wallet_address = 'Test10Submissions';

SELECT 'BADGES EARNED' as info, b.name, b.requirement_value
FROM user_badges ub
JOIN badges b ON ub.badge_id = b.id
JOIN users u ON ub.user_id = u.id
WHERE u.wallet_address = 'Test10Submissions'
ORDER BY b.requirement_value;

DELETE FROM users WHERE wallet_address = 'Test10Submissions';
