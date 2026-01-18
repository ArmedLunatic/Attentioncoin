-- Verify badges are seeded
SELECT COUNT(*) as badge_count FROM badges;
SELECT name, requirement_type, requirement_value FROM badges ORDER BY requirement_value LIMIT 3;

-- Verify trigger exists
SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'trigger_submission_approval';

-- Verify function exists
SELECT routine_name FROM information_schema.routines WHERE routine_name = 'handle_submission_approval';
SELECT routine_name FROM information_schema.routines WHERE routine_name = 'award_eligible_badges';
