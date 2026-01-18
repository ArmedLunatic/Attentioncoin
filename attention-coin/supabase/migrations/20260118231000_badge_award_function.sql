-- ═══════════════════════════════════════════════════════════════════════════
-- BADGE AWARD FUNCTION
-- Idempotent function to check and award badges for a user
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION "public"."award_eligible_badges"("p_user_id" "uuid")
RETURNS TABLE("badge_id" "uuid", "badge_name" "text", "awarded" boolean)
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
      SELECT 1 FROM user_badges
      WHERE user_id = p_user_id AND badge_id = v_badge.id
    ) INTO v_already_earned;

    -- Skip if already earned
    IF v_already_earned THEN
      badge_id := v_badge.id;
      badge_name := v_badge.name;
      awarded := FALSE;
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
    badge_id := v_badge.id;
    badge_name := v_badge.name;
    awarded := v_newly_awarded;
    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION "public"."award_eligible_badges"("uuid") TO "anon";
GRANT EXECUTE ON FUNCTION "public"."award_eligible_badges"("uuid") TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."award_eligible_badges"("uuid") TO "service_role";
