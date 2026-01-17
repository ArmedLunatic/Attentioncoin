-- ═══════════════════════════════════════════════════════════════════════════
-- ATTENTION COIN - DATABASE SCHEMA
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════════════════
-- USERS TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Wallet (required)
    wallet_address      VARCHAR(44) UNIQUE NOT NULL,
    
    -- X (Twitter) info
    x_username          VARCHAR(50) UNIQUE,
    x_user_id           VARCHAR(32),
    x_display_name      VARCHAR(100),
    x_followers         INTEGER DEFAULT 0,
    x_following         INTEGER DEFAULT 0,
    x_profile_image     TEXT,
    x_verified_at       TIMESTAMPTZ,
    
    -- Verification
    verification_code   VARCHAR(16),
    verification_expires TIMESTAMPTZ,
    
    -- Trust & Status
    trust_score         DECIMAL(4,3) DEFAULT 0.500,
    status              VARCHAR(20) DEFAULT 'active',
    blacklist_reason    TEXT,
    
    -- Stats
    total_earned_lamports BIGINT DEFAULT 0,
    total_submissions   INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- SUBMISSIONS TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS submissions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Tweet identification
    tweet_id            VARCHAR(32) UNIQUE NOT NULL,
    tweet_url           TEXT NOT NULL,
    
    -- Content
    tweet_text          TEXT,
    has_ca              BOOLEAN DEFAULT FALSE,
    has_cashtag         BOOLEAN DEFAULT FALSE,
    has_media           BOOLEAN DEFAULT FALSE,
    posted_at           TIMESTAMPTZ,
    
    -- Engagement metrics
    likes               INTEGER DEFAULT 0,
    reposts             INTEGER DEFAULT 0,
    replies             INTEGER DEFAULT 0,
    quotes              INTEGER DEFAULT 0,
    views               INTEGER DEFAULT 0,
    
    -- Scoring
    base_score          DECIMAL(10,2) DEFAULT 0,
    trust_multiplier    DECIMAL(4,3) DEFAULT 1.000,
    quality_multiplier  DECIMAL(4,3) DEFAULT 1.000,
    final_score         DECIMAL(10,2) DEFAULT 0,
    
    -- Status
    status              VARCHAR(20) DEFAULT 'pending',
    rejection_reason    TEXT,
    verified_at         TIMESTAMPTZ,
    approved_at         TIMESTAMPTZ,
    
    -- Anti-gaming
    content_hash        VARCHAR(64),
    flagged             BOOLEAN DEFAULT FALSE,
    flag_reason         TEXT,
    
    -- Timestamps
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- REWARDS TABLE (for tracking payouts)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS rewards (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
    
    period_date         DATE NOT NULL,
    total_score         DECIMAL(10,2) DEFAULT 0,
    amount_lamports     BIGINT DEFAULT 0,
    
    status              VARCHAR(20) DEFAULT 'pending',
    tx_signature        VARCHAR(88),
    
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, period_date)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- CONFIG TABLE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS config (
    key                 VARCHAR(100) PRIMARY KEY,
    value               JSONB NOT NULL,
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default config
INSERT INTO config (key, value) VALUES
('scoring_weights', '{"like": 1, "repost": 3, "reply": 2, "quote": 4, "view": 0.001}'::jsonb),
('payout_settings', '{"daily_budget_sol": 10, "max_per_user_sol": 1}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_x_username ON users(x_username);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_rewards_user ON rewards(user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- Allow public read for users (limited fields would need a view in production)
CREATE POLICY "Users are viewable by everyone" ON users
    FOR SELECT USING (true);

-- Allow insert for new users
CREATE POLICY "Anyone can create a user" ON users
    FOR INSERT WITH CHECK (true);

-- Allow users to update their own record
CREATE POLICY "Users can update own record" ON users
    FOR UPDATE USING (true);

-- Allow public read for submissions
CREATE POLICY "Submissions are viewable by everyone" ON submissions
    FOR SELECT USING (true);

-- Allow insert for submissions
CREATE POLICY "Anyone can create submissions" ON submissions
    FOR INSERT WITH CHECK (true);

-- Allow update for submissions
CREATE POLICY "Submissions can be updated" ON submissions
    FOR UPDATE USING (true);

-- Config readable by all
CREATE POLICY "Config is viewable by everyone" ON config
    FOR SELECT USING (true);

-- Rewards viewable by all
CREATE POLICY "Rewards are viewable by everyone" ON rewards
    FOR SELECT USING (true);

CREATE POLICY "Rewards can be created" ON rewards
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Rewards can be updated" ON rewards
    FOR UPDATE USING (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTION: Update timestamp
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- DONE! Your database is ready.
-- ═══════════════════════════════════════════════════════════════════════════
