import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

/**
 * GET /api/stats
 * Returns real-time platform statistics for the homepage
 */
export async function GET() {
  try {
    const supabase = createServerClient();

    // Fetch payout config
    const { data: configData } = await supabase
      .from('config')
      .select('value')
      .eq('key', 'payout_settings')
      .single();

    const config = configData?.value || {
      daily_budget_sol: 10,
      max_per_user_sol: 1,
      min_payout_sol: 0.1,
      payout_interval_hours: 24,
    };

    // Get total SOL paid out (completed payouts)
    const { data: payoutsData } = await supabase
      .from('payouts')
      .select('amount_lamports')
      .eq('status', 'completed');

    const totalPaidLamports = (payoutsData || []).reduce(
      (sum, p) => sum + (p.amount_lamports || 0),
      0
    );
    const totalPaidSol = totalPaidLamports / 1e9;

    // Get active creators (users with at least 1 approved submission)
    const { count: activeCreators } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gt('total_submissions', 0);

    // Get total users
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get average streak (for users with streaks > 0)
    const { data: streakData } = await supabase
      .from('users')
      .select('current_streak')
      .gt('current_streak', 0);

    const avgStreak = streakData && streakData.length > 0
      ? streakData.reduce((sum, u) => sum + u.current_streak, 0) / streakData.length
      : 0;

    // Get current pool stats (approved submissions waiting for payout)
    const { data: poolSubmissions } = await supabase
      .from('submissions')
      .select('user_id, final_score')
      .eq('status', 'approved')
      .gt('final_score', 0);

    const poolTotalScore = (poolSubmissions || []).reduce(
      (sum, s) => sum + (s.final_score || 0),
      0
    );
    const poolParticipants = new Set((poolSubmissions || []).map(s => s.user_id)).size;

    // Get recent payouts for activity feed (last 10 completed)
    const { data: recentPayouts } = await supabase
      .from('payouts')
      .select(`
        amount_lamports,
        completed_at,
        user:users!inner(x_username)
      `)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(10);

    const recentActivity = (recentPayouts || []).map(p => ({
      username: (p.user as any)?.x_username || 'anonymous',
      amount: (p.amount_lamports || 0) / 1e9,
      time: p.completed_at,
    }));

    // Calculate next payout time based on interval
    const intervalHours = config.payout_interval_hours || 24;
    const now = new Date();
    const nextPayout = new Date(now);

    // Calculate next payout at the interval boundary
    if (intervalHours >= 24) {
      // Daily: next midnight UTC
      nextPayout.setUTCDate(nextPayout.getUTCDate() + 1);
      nextPayout.setUTCHours(0, 0, 0, 0);
    } else {
      // Hourly intervals: next interval boundary
      const currentHour = now.getUTCHours();
      const nextIntervalHour = Math.ceil((currentHour + 1) / intervalHours) * intervalHours;
      if (nextIntervalHour >= 24) {
        nextPayout.setUTCDate(nextPayout.getUTCDate() + 1);
        nextPayout.setUTCHours(nextIntervalHour - 24, 0, 0, 0);
      } else {
        nextPayout.setUTCHours(nextIntervalHour, 0, 0, 0);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        // Platform stats
        totalPaidSol: Math.round(totalPaidSol * 100) / 100,
        activeCreators: activeCreators || 0,
        totalUsers: totalUsers || 0,
        avgStreak: Math.round(avgStreak * 10) / 10,

        // Pool stats
        pool: {
          budgetSol: config.daily_budget_sol,
          maxPerUserSol: config.max_per_user_sol,
          minPayoutSol: config.min_payout_sol,
          totalScore: Math.round(poolTotalScore * 100) / 100,
          participants: poolParticipants,
          intervalHours: intervalHours,
          nextPayoutTime: nextPayout.toISOString(),
        },

        // Recent activity
        recentActivity,
      },
    });
  } catch (error) {
    console.error('[Stats API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
