-- ═══════════════════════════════════════════════════════════════════════════
-- PRODUCTION FIX: Apply all triggers and functions for approval pipeline
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 1: Seed badges if not already present
-- ═══════════════════════════════════════════════════════════════════════════

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
-- STEP 2: Create update_user_streak function (if not exists)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION "public"."update_user_streak"("p_user_id" "uuid")
RETURNS "void"
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
  v_last_date DATE;
  v_current_streak INT;
  v_longest_streak INT;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Get current user streak data
  SELECT last_submission_date, current_streak, longest_streak
  INTO v_last_date, v_current_streak, v_longest_streak
  FROM users
  WHERE id = p_user_id;

  -- If no previous submission
  IF v_last_date IS NULL THEN
    UPDATE users
    SET
      current_streak = 1,
      longest_streak = GREATEST(1, COALESCE(v_longest_streak, 0)),
      last_submission_date = v_today,
      updated_at = NOW()
    WHERE id = p_user_id;
    RETURN;
  END IF;

  -- If already submitted today, no change
  IF v_last_date = v_today THEN
    RETURN;
  END IF;

  -- If submitted yesterday, increment streak
  IF v_last_date = v_today - 1 THEN
    UPDATE users
    SET
      current_streak = v_current_streak + 1,
      longest_streak = GREATEST(v_current_streak + 1, COALESCE(v_longest_streak, 0)),
      last_submission_date = v_today,
      updated_at = NOW()
    WHERE id = p_user_id;
  ELSE
    -- Streak broken, reset to 1
    UPDATE users
    SET
      current_streak = 1,
      last_submission_date = v_today,
      updated_at = NOW()
    WHERE id = p_user_id;
  END IF;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 3: Create award_eligible_badges function
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS "public"."award_eligible_badges"("uuid");

CREATE OR REPLACE FUNCTION "public"."award_eligible_badges"("p_user_id" "uuid")
RETURNS TABLE("out_badge_id" "uuid", "out_badge_name" "text", "out_awarded" boolean)
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
  v_badge RECORD;
  v_user RECORD;
  v_is_eligible BOOLEAN;
  v_already_earned BOOLEAN;
  v_newly_awarded BOOLEAN;
BEGIN
  -- Get user stats
  SELECT
    total_submissions,
    current_streak,
    total_earned_lamports,
    total_referrals
  INTO v_user
  FROM users
  WHERE id = p_user_id;

  -- If user doesn't exist, return empty
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Loop through all badges
  FOR v_badge IN
    SELECT b.id, b.name, b.requirement_type, b.requirement_value
    FROM badges b
    ORDER BY b.requirement_value
  LOOP
    -- Check if already earned
    SELECT EXISTS(
      SELECT 1 FROM user_badges ub
      WHERE ub.user_id = p_user_id AND ub.badge_id = v_badge.id
    ) INTO v_already_earned;

    -- Skip if already earned
    IF v_already_earned THEN
      out_badge_id := v_badge.id;
      out_badge_name := v_badge.name;
      out_awarded := FALSE;
      RETURN NEXT;
      CONTINUE;
    END IF;

    -- Check eligibility based on requirement type
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

    -- Award badge if eligible
    IF v_is_eligible THEN
      INSERT INTO user_badges (user_id, badge_id)
      VALUES (p_user_id, v_badge.id)
      ON CONFLICT (user_id, badge_id) DO NOTHING;

      v_newly_awarded := TRUE;
    ELSE
      v_newly_awarded := FALSE;
    END IF;

    -- Return result for this badge
    out_badge_id := v_badge.id;
    out_badge_name := v_badge.name;
    out_awarded := v_newly_awarded;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION "public"."award_eligible_badges"("uuid") TO "anon";
GRANT EXECUTE ON FUNCTION "public"."award_eligible_badges"("uuid") TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."award_eligible_badges"("uuid") TO "service_role";

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 4: Create the approval trigger function
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION "public"."handle_submission_approval"()
RETURNS TRIGGER
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
  v_is_new_approval BOOLEAN;
BEGIN
  -- Check if this is a NEW approval (transition to 'approved' status)
  v_is_new_approval := (
    OLD.status IS DISTINCT FROM 'approved' AND
    NEW.status = 'approved'
  );

  -- Only proceed if this is a new approval
  IF NOT v_is_new_approval THEN
    RETURN NEW;
  END IF;

  -- Set approved_at timestamp if not already set
  IF NEW.approved_at IS NULL THEN
    NEW.approved_at := NOW();
  END IF;

  -- 1. Increment user's total submission count
  UPDATE users
  SET
    total_submissions = total_submissions + 1,
    updated_at = NOW()
  WHERE id = NEW.user_id;

  -- 2. Update user's streak
  PERFORM update_user_streak(NEW.user_id);

  -- 3. Award any eligible badges
  PERFORM award_eligible_badges(NEW.user_id);

  RETURN NEW;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION "public"."handle_submission_approval"() TO "service_role";

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 5: Create the trigger
-- ═══════════════════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trigger_submission_approval ON "public"."submissions";

CREATE TRIGGER trigger_submission_approval
  BEFORE UPDATE ON "public"."submissions"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."handle_submission_approval"();

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 6: Enable realtime for tables (for live frontend updates)
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable realtime on users table
ALTER PUBLICATION supabase_realtime ADD TABLE users;

-- Enable realtime on submissions table
ALTER PUBLICATION supabase_realtime ADD TABLE submissions;

-- Enable realtime on user_badges table
ALTER PUBLICATION supabase_realtime ADD TABLE user_badges;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION: Run these queries to confirm everything is set up
-- ═══════════════════════════════════════════════════════════════════════════

-- Check trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_submission_approval';

-- Check functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('handle_submission_approval', 'award_eligible_badges', 'update_user_streak');

-- Check badges are seeded
SELECT name, requirement_type, requirement_value FROM badges ORDER BY requirement_value;

-- ═══════════════════════════════════════════════════════════════════════════
-- DONE! Now when you approve a submission:
-- 1. User's total_submissions will increment
-- 2. User's streak will update
-- 3. Eligible badges will be awarded
-- 4. Frontend will receive real-time updates
-- ═══════════════════════════════════════════════════════════════════════════
