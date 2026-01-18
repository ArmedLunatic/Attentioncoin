-- ═══════════════════════════════════════════════════════════════════════════
-- SEED BADGES TABLE
-- Populates the badges table with 8 default achievement badges
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO "public"."badges" ("name", "description", "icon", "requirement_type", "requirement_value", "color")
VALUES
  ('First Post', 'Submit your first tweet', 'Zap', 'submissions', 1, 'blue'),
  ('Consistent', '7 day submission streak', 'Flame', 'streak', 7, 'orange'),
  ('On Fire', '30 day submission streak', 'Flame', 'streak', 30, 'red'),
  ('Rising Star', '10 approved submissions', 'Star', 'submissions', 10, 'yellow'),
  ('Influencer', '50 approved submissions', 'Crown', 'submissions', 50, 'purple'),
  ('Whale', 'Earned 1 SOL total', 'Wallet', 'earnings', 1000000000, 'green'),
  ('Recruiter', 'Refer 5 users', 'Users', 'referrals', 5, 'cyan'),
  ('Ambassador', 'Refer 25 users', 'Award', 'referrals', 25, 'gold')
ON CONFLICT DO NOTHING;
