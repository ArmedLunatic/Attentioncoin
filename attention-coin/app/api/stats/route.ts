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
      daily_budget_sol: 1,
      max_per_user_sol: 0.5,
      min_payout_sol: 0.001,
      payout_interval_hours: 24,
    };

    // Get total SOL paid out (from paid submissions)
    const { data: paidSubmissions } = await supabase
      .from('submissions')
      .select('final_score')
      .eq('status', 'approved')
      .not('paid_at', 'is', null);

    const totalPaidLamports = (paidSubmissions || []).reduce(
      (sum, s) => sum + ((s.final_score || 0) * 1000000),
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
      .is('paid_at', null)
      .gt('final_score', 0);

    const poolTotalScore = (poolSubmissions || []).reduce(
      (sum, s) => sum + (s.final_score || 0),
      0
    );
    const poolParticipants = new Set((poolSubmissions || []).map(s => s.user_id)).size;

    // Get recent payouts for activity feed (last 10 paid submissions grouped by tx)
    const { data: recentPaid } = await supabase
      .from('submissions')
      .select(`
        final_score,
        paid_at,
        tx_signature,
        users!inner(x_username)
      `)
      .eq('status', 'approved')
      .not('paid_at', 'is', null)
      .not('tx_signature', 'is', null)
      .order('paid_at', { ascending: false })
      .limit(20);

    // Group by transaction signature to show one entry per payout
    const txMap = new Map();
    for (const item of (recentPaid || [])) {
      const txSig = item.tx_signature;
      if (!txSig) continue;

      if (!txMap.has(txSig)) {
        txMap.set(txSig, {
          username: (item.users as any)?.x_username || 'anonymous',
          amount: 0,
          time: item.paid_at,
          txSignature: txSig
        });
      }

      const tx = txMap.get(txSig);
      tx.amount += ((item.final_score || 0) * 1000000) / 1e9;
    }

    const recentActivity = Array.from(txMap.values()).slice(0, 10);

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
