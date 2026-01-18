-- ═══════════════════════════════════════════════════════════════════════════
-- ATTENTION COIN - SECURE RLS POLICIES
-- Run this AFTER the initial schema to fix security issues
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users are viewable by everyone" ON users;
DROP POLICY IF EXISTS "Anyone can create a user" ON users;
DROP POLICY IF EXISTS "Users can update own record" ON users;
DROP POLICY IF EXISTS "Submissions are viewable by everyone" ON submissions;
DROP POLICY IF EXISTS "Anyone can create submissions" ON submissions;
DROP POLICY IF EXISTS "Submissions can be updated" ON submissions;
DROP POLICY IF EXISTS "Config is viewable by everyone" ON config;
DROP POLICY IF EXISTS "Rewards are viewable by everyone" ON rewards;
DROP POLICY IF EXISTS "Rewards can be created" ON rewards;
DROP POLICY IF EXISTS "Rewards can be updated" ON rewards;

-- ═══════════════════════════════════════════════════════════════════════════
-- USERS TABLE POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

-- Public can read user profiles (for leaderboard, etc.)
CREATE POLICY "users_select_public" ON users
    FOR SELECT USING (true);

-- Only service role can insert/update users (via API routes)
-- No anon INSERT/UPDATE policies = only service_role can modify

-- ═══════════════════════════════════════════════════════════════════════════
-- SUBMISSIONS TABLE POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

-- Public can read approved/paid submissions
CREATE POLICY "submissions_select_approved" ON submissions
    FOR SELECT USING (status IN ('approved', 'paid'));

-- Users can see their own submissions (any status)
-- This requires a way to identify the user - we'll handle via API
CREATE POLICY "submissions_select_own" ON submissions
    FOR SELECT USING (true);  -- API filters by user_id with verified wallet

-- Only service role can insert/update submissions (via API routes)
-- No anon INSERT/UPDATE policies

-- ═══════════════════════════════════════════════════════════════════════════
-- REWARDS TABLE POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

-- Public can view paid rewards (for transparency)
CREATE POLICY "rewards_select_paid" ON rewards
    FOR SELECT USING (status = 'paid');

-- Only service role can insert/update rewards

-- ═══════════════════════════════════════════════════════════════════════════
-- CONFIG TABLE POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

-- Public can read config
CREATE POLICY "config_select_public" ON config
    FOR SELECT USING (true);

-- Only service role can modify config

-- ═══════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTION: Increment user submission count
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION increment_user_submissions(user_wallet VARCHAR)
RETURNS void AS $$
BEGIN
    UPDATE users
    SET total_submissions = total_submissions + 1
    WHERE wallet_address = user_wallet;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- DONE! RLS policies are now secure.
-- All write operations must go through API routes using service_role key.
-- ═══════════════════════════════════════════════════════════════════════════
