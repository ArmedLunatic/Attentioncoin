-- ═══════════════════════════════════════════════════════════════════════════
-- COMPLETE FIX: Triggers + Retroactive Points/Badges for Existing Users
-- Run this ONCE in Supabase Dashboard → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 1: SEED BADGES (if not already present)
-- ═══════════════════════════════════════════════════════════════════════════

-- First, add unique constraint on name if it doesn't exist
DO $body$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'badges_name_key'
  ) THEN
    ALTER TABLE badges ADD CONSTRAINT badges_name_key UNIQUE (name);
  END IF;
END $body$;

INSERT INTO badges (name, description, icon, color, requirement_type, requirement_value)
VALUES
  ('First Post', 'Submit your first tweet', 'Trophy', 'yellow', 'submissions', 1),
  ('Consistent', '7 day posting streak', 'Flame', 'orange', 'streak', 7),
  ('On Fire', '30 day posting streak', 'Zap', 'red', 'streak', 30),
  ('Rising Star', '10 approved submissions', 'Star', 'blue', 'submissions', 10),
  ('Influencer', '50 approved submissions', 'Crown', 'purple', 'submissions', 50),
  ('Whale', 'Earn 1 SOL in rewards', 'Coins', 'emerald', 'earnings', 1000000000),
  ('Recruiter', 'Refer 5 users', 'Users', 'cyan', 'referrals', 5),
  ('Ambassador', 'Refer 25 users', 'Medal', 'gold', 'referrals', 25)
ON CONFLICT (name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 2: CREATE/UPDATE FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Function: Update user streak
CREATE OR REPLACE FUNCTION "public"."update_user_streak"("p_user_id" "uuid")
RETURNS "void"
LANGUAGE "plpgsql" SECURITY DEFINER
AS $func$
DECLARE
  v_last_date DATE;
  v_current_streak INT;
  v_longest_streak INT;
  v_today DATE := CURRENT_DATE;
BEGIN
  SELECT last_submission_date, current_streak, longest_streak
  INTO v_last_date, v_current_streak, v_longest_streak
  FROM users
  WHERE id = p_user_id;

  IF v_last_date IS NULL THEN
    UPDATE users
    SET current_streak = 1,
        longest_streak = GREATEST(1, COALESCE(v_longest_streak, 0)),
        last_submission_date = v_today,
        updated_at = NOW()
    WHERE id = p_user_id;
    RETURN;
  END IF;

  IF v_last_date = v_today THEN
    RETURN;
  END IF;

  IF v_last_date = v_today - 1 THEN
    UPDATE users
    SET current_streak = COALESCE(v_current_streak, 0) + 1,
        longest_streak = GREATEST(COALESCE(v_current_streak, 0) + 1, COALESCE(v_longest_streak, 0)),
        last_submission_date = v_today,
        updated_at = NOW()
    WHERE id = p_user_id;
  ELSE
    UPDATE users
    SET current_streak = 1,
        last_submission_date = v_today,
        updated_at = NOW()
    WHERE id = p_user_id;
  END IF;
END;
$func$;

-- Function: Award eligible badges
DROP FUNCTION IF EXISTS "public"."award_eligible_badges"("uuid");

CREATE OR REPLACE FUNCTION "public"."award_eligible_badges"("p_user_id" "uuid")
RETURNS TABLE("out_badge_id" "uuid", "out_badge_name" "text", "out_awarded" boolean)
LANGUAGE "plpgsql" SECURITY DEFINER
AS $func$
DECLARE
  v_badge RECORD;
  v_user RECORD;
  v_is_eligible BOOLEAN;
  v_already_earned BOOLEAN;
  v_newly_awarded BOOLEAN;
BEGIN
  SELECT
    COALESCE(total_submissions, 0) as total_submissions,
    COALESCE(current_streak, 0) as current_streak,
    COALESCE(total_earned_lamports, 0) as total_earned_lamports,
    COALESCE(total_referrals, 0) as total_referrals
  INTO v_user
  FROM users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  FOR v_badge IN
    SELECT b.id, b.name, b.requirement_type, b.requirement_value
    FROM badges b
    ORDER BY b.requirement_value
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM user_badges ub
      WHERE ub.user_id = p_user_id AND ub.badge_id = v_badge.id
    ) INTO v_already_earned;

    IF v_already_earned THEN
      out_badge_id := v_badge.id;
      out_badge_name := v_badge.name;
      out_awarded := FALSE;
      RETURN NEXT;
      CONTINUE;
    END IF;

    v_is_eligible := FALSE;

    CASE v_badge.requirement_type
      WHEN 'submissions' THEN
        v_is_eligible := v_user.total_submissions >= v_badge.requirement_value;
      WHEN 'streak' THEN
        v_is_eligible := v_user.current_streak >= v_badge.requirement_value;
      WHEN 'earnings' THEN
        v_is_eligible := v_user.total_earned_lamports >= v_badge.requirement_value;
      WHEN 'referrals' THEN
        v_is_eligible := v_user.total_referrals >= v_badge.requirement_value;
      ELSE
        v_is_eligible := FALSE;
    END CASE;

    IF v_is_eligible THEN
      INSERT INTO user_badges (user_id, badge_id)
      VALUES (p_user_id, v_badge.id)
      ON CONFLICT (user_id, badge_id) DO NOTHING;
      v_newly_awarded := TRUE;
    ELSE
      v_newly_awarded := FALSE;
    END IF;

    out_badge_id := v_badge.id;
    out_badge_name := v_badge.name;
    out_awarded := v_newly_awarded;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$func$;

-- Function: Handle submission approval (trigger function)
CREATE OR REPLACE FUNCTION "public"."handle_submission_approval"()
RETURNS TRIGGER
LANGUAGE "plpgsql" SECURITY DEFINER
AS $func$
DECLARE
  v_is_new_approval BOOLEAN;
BEGIN
  v_is_new_approval := (
    (OLD.status IS NULL OR OLD.status IS DISTINCT FROM 'approved') AND
    NEW.status = 'approved'
  );

  IF NOT v_is_new_approval THEN
    RETURN NEW;
  END IF;

  IF NEW.approved_at IS NULL THEN
    NEW.approved_at := NOW();
  END IF;

  -- Increment total_submissions and add earned points
  -- Points are based on final_score (1 score = 1,000,000 lamports = 0.001 SOL)
  UPDATE users
  SET total_submissions = COALESCE(total_submissions, 0) + 1,
      total_earned_lamports = COALESCE(total_earned_lamports, 0) + COALESCE(NEW.final_score, 0) * 1000000,
      updated_at = NOW()
  WHERE id = NEW.user_id;

  -- Update streak
  PERFORM update_user_streak(NEW.user_id);

  -- Award badges
  PERFORM award_eligible_badges(NEW.user_id);

  RETURN NEW;
END;
$func$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 3: CREATE TRIGGER
-- ═══════════════════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trigger_submission_approval ON "public"."submissions";

CREATE TRIGGER trigger_submission_approval
  BEFORE UPDATE ON "public"."submissions"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."handle_submission_approval"();

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 4: FIX EXISTING USERS - Recalculate points from approved submissions
-- ═══════════════════════════════════════════════════════════════════════════

-- First: Calculate final_score for submissions that don't have it
-- Formula: likes + (reposts * 2) + replies
UPDATE submissions
SET final_score = COALESCE(likes, 0) + (COALESCE(reposts, 0) * 2) + COALESCE(replies, 0)
WHERE status IN ('approved', 'paid')
AND (final_score IS NULL OR final_score = 0);

-- Reset all users' total_submissions to actual count of approved submissions
UPDATE users u
SET total_submissions = (
  SELECT COUNT(*)
  FROM submissions s
  WHERE s.user_id = u.id
  AND s.status IN ('approved', 'paid')
),
updated_at = NOW();

-- Fix: Calculate total_earned_lamports from approved submissions' final_scores
-- 1 score = 1,000,000 lamports = 0.001 SOL
UPDATE users u
SET total_earned_lamports = COALESCE((
  SELECT SUM(COALESCE(s.final_score, 0) * 1000000)
  FROM submissions s
  WHERE s.user_id = u.id
  AND s.status IN ('approved', 'paid')
), 0)
WHERE EXISTS (
  SELECT 1 FROM submissions s
  WHERE s.user_id = u.id
  AND s.status IN ('approved', 'paid')
);

-- Set current_streak to 1 for users with approved submissions (simplified)
UPDATE users
SET current_streak = 1,
    longest_streak = GREATEST(COALESCE(longest_streak, 0), 1),
    last_submission_date = CURRENT_DATE
WHERE total_submissions > 0
AND (current_streak IS NULL OR current_streak = 0);

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 5: AWARD BADGES TO ALL EXISTING USERS
-- ═══════════════════════════════════════════════════════════════════════════

DO $body$
DECLARE
  v_user RECORD;
BEGIN
  FOR v_user IN SELECT id FROM users WHERE total_submissions > 0
  LOOP
    PERFORM award_eligible_badges(v_user.id);
  END LOOP;
END;
$body$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 6: ENABLE REALTIME (for live frontend updates)
-- ═══════════════════════════════════════════════════════════════════════════

DO $body$
BEGIN
  -- Try to add tables to realtime publication
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE users;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Already added
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE submissions;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_badges;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END;
$body$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 7: VERIFICATION QUERIES (Check results after running)
-- ═══════════════════════════════════════════════════════════════════════════

-- Show users with their updated stats including points
SELECT
  wallet_address,
  x_username,
  total_submissions,
  current_streak,
  longest_streak,
  total_earned_lamports,
  (total_earned_lamports / 1000000000.0) as total_earned_sol
FROM users
WHERE total_submissions > 0
ORDER BY total_earned_lamports DESC;

-- Show all badges awarded
SELECT
  u.x_username,
  u.wallet_address,
  b.name as badge_name,
  ub.earned_at
FROM user_badges ub
JOIN users u ON ub.user_id = u.id
JOIN badges b ON ub.badge_id = b.id
ORDER BY ub.earned_at DESC;

-- Check trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_submission_approval';

-- ═══════════════════════════════════════════════════════════════════════════
-- DONE! After running this:
-- 1. All existing users now have correct total_submissions count
-- 2. All existing users now have correct total_earned_lamports (points)
-- 3. All eligible badges have been awarded
-- 4. Future approvals will automatically update stats, points, and award badges
-- 5. Frontend will receive real-time updates
--
-- Points calculation: 1 final_score = 1,000,000 lamports = 0.001 SOL
-- ═══════════════════════════════════════════════════════════════════════════
