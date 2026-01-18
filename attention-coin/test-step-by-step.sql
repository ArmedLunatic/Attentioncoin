-- STEP 1: Create test user
INSERT INTO users (wallet_address, x_username)
VALUES ('TestApprovalFlow123', 'test_user')
ON CONFLICT (wallet_address) DO NOTHING;

-- STEP 2: Check initial state
SELECT 'BEFORE APPROVAL' as stage, wallet_address, total_submissions, current_streak
FROM users WHERE wallet_address = 'TestApprovalFlow123';

-- STEP 3: Create pending submission
INSERT INTO submissions (user_id, tweet_id, tweet_url, status)
SELECT id, 'test_tweet_123', 'https://x.com/test/123', 'pending'
FROM users WHERE wallet_address = 'TestApprovalFlow123';

-- STEP 4: Approve the submission (THIS TRIGGERS AUTOMATION)
UPDATE submissions SET status = 'approved' WHERE tweet_id = 'test_tweet_123';

-- STEP 5: Check state after approval
SELECT 'AFTER APPROVAL' as stage, wallet_address, total_submissions, current_streak
FROM users WHERE wallet_address = 'TestApprovalFlow123';

-- STEP 6: Check badges awarded
SELECT 'BADGES' as info, b.name, b.description
FROM user_badges ub
JOIN badges b ON ub.badge_id = b.id
JOIN users u ON ub.user_id = u.id
WHERE u.wallet_address = 'TestApprovalFlow123';

-- STEP 7: Cleanup
DELETE FROM users WHERE wallet_address = 'TestApprovalFlow123';
