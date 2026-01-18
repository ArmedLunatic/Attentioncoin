-- ═══════════════════════════════════════════════════════════════════════════
-- SUBMISSION APPROVAL AUTOMATION
-- Triggers automated rewards pipeline when a submission is approved
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTION: Handle all downstream effects of approval
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION "public"."handle_submission_approval"()
RETURNS TRIGGER
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
  v_is_new_approval BOOLEAN;
BEGIN
  -- Check if this is a NEW approval (transition to 'approved' status)
  -- This ensures idempotency - won't fire if already approved
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
  -- Note: award_eligible_badges is idempotent, safe to call multiple times
  PERFORM award_eligible_badges(NEW.user_id);

  -- 4. Future: Update leaderboard aggregates (placeholder for now)
  -- This could involve updating a materialized view or cache table
  -- For now, leaderboard queries directly from users/submissions tables

  RETURN NEW;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGER: Fire on submission status update
-- ═══════════════════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trigger_submission_approval ON "public"."submissions";

CREATE TRIGGER trigger_submission_approval
  BEFORE UPDATE ON "public"."submissions"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."handle_submission_approval"();

-- ═══════════════════════════════════════════════════════════════════════════
-- GRANT PERMISSIONS
-- ═══════════════════════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION "public"."handle_submission_approval"() TO "service_role";

-- ═══════════════════════════════════════════════════════════════════════════
-- NOTES:
--
-- Idempotency guarantees:
-- - Only fires on NEW approvals (status transition check)
-- - Incrementing total_submissions only happens once per approval
-- - Streak update is safe to call multiple times (checks last_submission_date)
-- - Badge awarding has built-in duplicate prevention (UNIQUE constraint)
-- - approved_at only set if NULL
--
-- What happens on approval:
-- 1. total_submissions += 1
-- 2. Streak updated based on last_submission_date
-- 3. Badges checked and awarded if eligible
-- 4. approved_at timestamp set
-- ═══════════════════════════════════════════════════════════════════════════
