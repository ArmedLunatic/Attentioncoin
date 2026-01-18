-- ═══════════════════════════════════════════════════════════════════════════
-- ATTENTION COIN - NEW FEATURES SCHEMA
-- Run this in Supabase SQL Editor to add streaks, badges, referrals, payouts
-- ═══════════════════════════════════════════════════════════════════════════

-- Add streak and referral columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_submission_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(12) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_earnings_lamports BIGINT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0;

-- ═══════════════════════════════════════════════════════════════════════════
-- BADGES TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,
    description TEXT,
    icon VARCHAR(50) NOT NULL,
    requirement_type VARCHAR(50) NOT NULL, -- 'streak', 'submissions', 'earnings', 'referrals'
    requirement_value INTEGER NOT NULL,
    color VARCHAR(20) DEFAULT 'primary',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default badges
INSERT INTO badges (name, description, icon, requirement_type, requirement_value, color) VALUES
('First Post', 'Submit your first tweet', 'Zap', 'submissions', 1, 'blue'),
('Consistent', '7 day submission streak', 'Flame', 'streak', 7, 'orange'),
('On Fire', '30 day submission streak', 'Flame', 'streak', 30, 'red'),
('Rising Star', '10 approved submissions', 'Star', 'submissions', 10, 'yellow'),
('Influencer', '50 approved submissions', 'Crown', 'submissions', 50, 'purple'),
('Whale', 'Earned 1 SOL total', 'Wallet', 'earnings', 1000000000, 'green'),
('Recruiter', 'Refer 5 users', 'Users', 'referrals', 5, 'cyan'),
('Ambassador', 'Refer 25 users', 'Award', 'referrals', 25, 'gold')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- USER BADGES (many-to-many)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- PAYOUT HISTORY TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount_lamports BIGINT NOT NULL,
    payout_type VARCHAR(20) DEFAULT 'submission', -- 'submission', 'referral', 'bonus'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    tx_signature VARCHAR(88),
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    submission_ids UUID[], -- array of submission IDs included
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ═══════════════════════════════════════════════════════════════════════════
-- PAYOUT SCHEDULE CONFIG
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO config (key, value) VALUES
('payout_schedule', '{"interval_hours": 6, "next_payout": null}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ═══════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_user ON payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS POLICIES FOR NEW TABLES
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- Badges are public
CREATE POLICY "badges_select_public" ON badges FOR SELECT USING (true);

-- User badges are public (for profiles)
CREATE POLICY "user_badges_select_public" ON user_badges FOR SELECT USING (true);

-- Payouts visible to all (transparency)
CREATE POLICY "payouts_select_public" ON payouts FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS VARCHAR(12) AS $$
DECLARE
    chars VARCHAR := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    code VARCHAR(12) := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate referral code for new users
CREATE OR REPLACE FUNCTION set_referral_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := generate_referral_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_referral_code ON users;
CREATE TRIGGER trigger_set_referral_code
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_referral_code();

-- Update streak on submission
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS void AS $$
DECLARE
    last_date DATE;
    today DATE := CURRENT_DATE;
BEGIN
    SELECT last_submission_date INTO last_date FROM users WHERE id = p_user_id;

    IF last_date IS NULL OR last_date < today - 1 THEN
        -- Reset streak
        UPDATE users SET
            current_streak = 1,
            last_submission_date = today
        WHERE id = p_user_id;
    ELSIF last_date = today - 1 THEN
        -- Continue streak
        UPDATE users SET
            current_streak = current_streak + 1,
            longest_streak = GREATEST(longest_streak, current_streak + 1),
            last_submission_date = today
        WHERE id = p_user_id;
    END IF;
    -- If last_date = today, don't update (already submitted today)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- DONE! Run this SQL in Supabase to enable new features.
-- ═══════════════════════════════════════════════════════════════════════════
