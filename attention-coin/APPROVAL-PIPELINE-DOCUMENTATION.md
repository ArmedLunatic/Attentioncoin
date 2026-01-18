# Automated Approval Pipeline - Complete Documentation

## Overview

When an admin approves a submission via the admin panel, the following happens **automatically and instantly**:

1. ✅ User's `total_submissions` counter increments
2. ✅ User's streak is updated (current_streak, longest_streak, last_submission_date)
3. ✅ Eligible badges are checked and awarded
4. ✅ `approved_at` timestamp is set on the submission
5. ✅ All operations are **idempotent** (safe to run multiple times)

## Architecture

### Database Trigger Flow

```
Admin Panel (Frontend)
    ↓
Admin API Endpoint (app/api/admin/route.ts)
    ↓
UPDATE submissions SET status = 'approved' WHERE id = ?
    ↓
[TRIGGER FIRES] → handle_submission_approval()
    ↓
    ├─→ Increment total_submissions
    ├─→ Update streak via update_user_streak()
    ├─→ Award badges via award_eligible_badges()
    └─→ Set approved_at timestamp
    ↓
[COMPLETE] User instantly has points, badges, updated streak
```

## Migrations Created

### Step 1: Badge Seeding
**File**: `supabase/migrations/20260118230000_seed_badges.sql`

**Purpose**: Populates the `badges` table with 8 default achievement badges

**Badges**:
- First Post (1 submission)
- Consistent (7 day streak)
- On Fire (30 day streak)
- Rising Star (10 submissions)
- Influencer (50 submissions)
- Whale (1 SOL earned = 1B lamports)
- Recruiter (5 referrals)
- Ambassador (25 referrals)

### Step 2: Badge Award Function
**File**: `supabase/migrations/20260118231000_badge_award_function.sql`

**Purpose**: Creates `award_eligible_badges(user_id)` function

**Features**:
- Checks all 8 badges against user stats
- Awards eligible badges that haven't been earned
- Returns table showing which badges were newly awarded
- Idempotent (safe to call multiple times)

**Returns**:
```sql
badge_id | badge_name    | awarded
---------|---------------|--------
uuid     | First Post    | true
uuid     | Consistent    | false
...
```

### Step 3: Approval Automation
**File**: `supabase/migrations/20260118232000_approval_automation.sql`

**Purpose**: Automates entire rewards pipeline on approval

**Function**: `handle_submission_approval()`
- Trigger function that fires on UPDATE to `submissions` table
- Only executes when status transitions to 'approved'
- Orchestrates all downstream effects

**Trigger**: `trigger_submission_approval`
- Fires BEFORE UPDATE on submissions
- Calls `handle_submission_approval()` for each row

## Idempotency Guarantees

### Why It's Safe

1. **Status Transition Check**
   ```sql
   v_is_new_approval := (
     OLD.status IS DISTINCT FROM 'approved' AND
     NEW.status = 'approved'
   );
   ```
   - Only fires when status changes TO 'approved'
   - If already approved, trigger short-circuits

2. **Total Submissions**
   - Only incremented during the one-time approval transition
   - Re-approving won't increment again

3. **Streak Update**
   - `update_user_streak()` checks `last_submission_date`
   - Won't update if already submitted today
   - Safe to call multiple times

4. **Badge Awarding**
   - `user_badges` table has UNIQUE constraint on (user_id, badge_id)
   - `ON CONFLICT DO NOTHING` prevents duplicates
   - Built-in duplicate prevention

5. **Approved Timestamp**
   ```sql
   IF NEW.approved_at IS NULL THEN
     NEW.approved_at := NOW();
   END IF;
   ```
   - Only sets if not already set

## How to Test Locally

### Option 1: Quick Test (30 seconds)

1. Open Supabase Studio: http://127.0.0.1:54323
2. Go to **SQL Editor** → **New Query**
3. Copy-paste contents of `test-approval-quick.sql`
4. Click **Run**

**Expected Results**:
- First query: Shows user with 10 submissions, streak of 1, 2 badges earned
- Second query: Shows "First Post" and "Rising Star" badges
- Third query: Cleanup successful

### Option 2: Comprehensive Test (5 minutes)

Follow step-by-step instructions in `test-approval-pipeline.sql`:

1. **Setup**: Creates test user
2. **Test 1**: Approve first submission → "First Post" badge awarded
3. **Test 2**: Approve 9 more → "Rising Star" badge awarded
4. **Test 3**: Re-approve submission → No duplicate awards
5. **Test 4**: Reject submission → No stats change
6. **Test 5**: Multi-day streak → Streak increments correctly
7. **Summary**: View complete user state
8. **Cleanup**: Remove test data

### Option 3: Manual Test via Admin Panel

1. Start your local dev server:
   ```bash
   npm run dev
   ```

2. Open http://localhost:3000/admin

3. Connect wallet (must be admin wallet)

4. Create a test submission:
   ```sql
   -- In Supabase Studio SQL Editor
   INSERT INTO submissions (user_id, tweet_id, tweet_url, status)
   SELECT
     id,
     'test123456789',
     'https://x.com/test/status/123456789',
     'pending'
   FROM users
   WHERE wallet_address = 'YOUR_WALLET_ADDRESS'
   LIMIT 1;
   ```

5. In admin panel, approve the submission

6. Check results in Supabase Studio:
   ```sql
   -- Check user stats
   SELECT total_submissions, current_streak
   FROM users
   WHERE wallet_address = 'YOUR_WALLET_ADDRESS';

   -- Check badges
   SELECT b.name
   FROM user_badges ub
   JOIN badges b ON ub.badge_id = b.id
   WHERE ub.user_id = (
     SELECT id FROM users WHERE wallet_address = 'YOUR_WALLET_ADDRESS'
   );
   ```

## Verification Checklist

After approving a submission, verify:

- [ ] `submissions.status` = 'approved'
- [ ] `submissions.approved_at` is set
- [ ] `users.total_submissions` incremented by 1
- [ ] `users.current_streak` updated (1 if first submission)
- [ ] `users.last_submission_date` = today
- [ ] "First Post" badge appears in `user_badges` (if first approval)
- [ ] Additional badges awarded if thresholds met
- [ ] Re-approving does NOT duplicate any effects

## What Happens on Each Approval

### Approval #1
- total_submissions: 0 → 1
- current_streak: 0 → 1
- longest_streak: 0 → 1
- Badges awarded: **"First Post"**

### Approval #10
- total_submissions: 9 → 10
- current_streak: 1 (same day) or higher (multi-day)
- Badges awarded: **"Rising Star"** (if not already earned)

### Approval #50
- total_submissions: 49 → 50
- Badges awarded: **"Influencer"**

### When User Earns 1 SOL
- total_earned_lamports: 999,999,999 → 1,000,000,000+
- Badges awarded: **"Whale"** (via payout automation, future step)

### When User Reaches 7-Day Streak
- current_streak: 6 → 7
- Badges awarded: **"Consistent"**

### When User Reaches 30-Day Streak
- current_streak: 29 → 30
- Badges awarded: **"On Fire"**

## Error Handling

### What Happens If...

**Trigger fails mid-execution?**
- Transaction rolls back (BEFORE UPDATE trigger)
- Submission status remains unchanged
- User stats NOT updated
- No partial state corruption

**User doesn't exist?**
- Query updates nothing
- Trigger completes without error
- Safe (though shouldn't happen with foreign key constraint)

**Database connection lost?**
- Entire transaction rolls back
- Frontend will show error
- Admin can retry approval

**Badge table is empty?**
- `award_eligible_badges()` returns empty result
- No badges awarded (but no error)
- Other operations still complete

## Performance Considerations

### Trigger Overhead
- Negligible for single approvals (< 10ms typical)
- Batch approvals: O(n) where n = number of approvals
- All operations use indexed columns

### Optimization Opportunities
- Badge checking queries use indexed `user_id` lookups
- Streak update is single UPDATE query
- No N+1 queries

## Future Enhancements

### Not Yet Implemented
- ❌ Leaderboard materialized view refresh
- ❌ Real-time websocket notifications
- ❌ Payout integration (earnings → Whale badge)
- ❌ Referral tracking (referrals → Recruiter/Ambassador badges)

### When to Add
1. **Leaderboard cache**: When leaderboard queries become slow (> 100ms)
2. **Websocket notifications**: When real-time badge popups are desired
3. **Payout integration**: Step 4 (connect payout service to badge awarding)
4. **Referral tracking**: Step 5 (implement referral signup flow)

## Debugging

### Check if Trigger is Active

```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_submission_approval';
```

Expected: 1 row returned

### Check if Function Exists

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'handle_submission_approval';
```

Expected: 1 row, routine_type = 'FUNCTION'

### View Trigger Definition

```sql
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'handle_submission_approval';
```

### Manual Trigger Execution

```sql
-- Create test submission
INSERT INTO submissions (user_id, tweet_id, tweet_url, status)
VALUES (
  (SELECT id FROM users LIMIT 1),
  'debug123',
  'https://x.com/debug/123',
  'pending'
);

-- Manually trigger by updating status
UPDATE submissions
SET status = 'approved'
WHERE tweet_id = 'debug123';

-- Check if trigger fired
SELECT total_submissions
FROM users
WHERE id = (SELECT user_id FROM submissions WHERE tweet_id = 'debug123');
```

## Summary

### What Changed
- ✅ No frontend changes
- ✅ No API endpoint changes
- ✅ No cron jobs added
- ✅ Pure SQL automation via triggers

### What Works
- ✅ Instant point awarding on approval
- ✅ Automatic badge checking and awarding
- ✅ Streak tracking across days
- ✅ Fully idempotent (safe to retry)
- ✅ Zero latency (happens in same transaction)

### Migration Summary
1. `20260118230000_seed_badges.sql` - Seeds 8 badges
2. `20260118231000_badge_award_function.sql` - Badge awarding logic
3. `20260118232000_approval_automation.sql` - Approval trigger

All migrations applied successfully to local database.
