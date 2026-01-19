import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { calculateEligibleEarnings, getPoolStats } from '@/lib/payout-service';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/earnings?wallet=<address>
 * Returns the user's eligible earnings and pool statistics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get user by wallet address
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', wallet)
      .single();

    if (userError || !user) {
      // Return pool stats even if user not found
      const poolStats = await getPoolStats();
      return NextResponse.json({
        success: true,
        data: {
          earnings: null,
          pool: poolStats,
          message: 'User not found. Connect wallet and verify X account to participate.',
        },
      });
    }

    // Calculate eligible earnings for this user
    const earnings = await calculateEligibleEarnings(user.id);
    const poolStats = await getPoolStats();

    return NextResponse.json({
      success: true,
      data: {
        earnings,
        pool: poolStats,
      },
    });
  } catch (error) {
    console.error('[Earnings API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch earnings',
      },
      { status: 500 }
    );
  }
}
