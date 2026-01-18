import { NextRequest, NextResponse } from 'next/server';
import { processPayouts, getPendingRetries } from '@/lib/payout-service';

/**
 * Vercel Cron handler for automatic payout processing
 * Runs every 6 hours via vercel.json cron configuration
 *
 * Protected by CRON_SECRET header - Vercel automatically adds this
 * for cron jobs, or it can be passed manually for testing
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('[Cron] CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Vercel cron uses "Bearer <secret>" format
    const expectedAuth = `Bearer ${cronSecret}`;
    if (authHeader !== expectedAuth) {
      console.warn('[Cron] Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Cron] Starting payout processing...');

    // Check required environment variables
    if (!process.env.HELIUS_API_KEY) {
      return NextResponse.json(
        { error: 'HELIUS_API_KEY not configured' },
        { status: 500 }
      );
    }

    if (!process.env.FUNDING_WALLET_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'FUNDING_WALLET_PRIVATE_KEY not configured' },
        { status: 500 }
      );
    }

    // Process payouts
    const summary = await processPayouts();

    // Get pending retries count for monitoring
    const pendingRetries = await getPendingRetries();

    // Log summary
    console.log('[Cron] Payout processing complete:', {
      batchId: summary.batchId,
      processed: summary.totalProcessed,
      successful: summary.successful,
      failed: summary.failed,
      totalSol: summary.totalAmountLamports / 1e9,
      durationMs: summary.duration,
      pendingRetries,
    });

    // Return summary
    return NextResponse.json({
      success: true,
      data: {
        batchId: summary.batchId,
        totalProcessed: summary.totalProcessed,
        successful: summary.successful,
        failed: summary.failed,
        totalAmountSol: summary.totalAmountLamports / 1e9,
        durationMs: summary.duration,
        pendingRetries,
        ...(summary.error && { error: summary.error }),
      },
    });
  } catch (error) {
    console.error('[Cron] Fatal error during payout processing:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

// Disable body parsing for cron endpoints
export const dynamic = 'force-dynamic';
