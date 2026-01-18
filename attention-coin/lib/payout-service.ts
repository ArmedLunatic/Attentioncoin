import { createServerClient } from './supabase';
import {
  sendBatchTransfers,
  validateFundingBalance,
  getExplorerUrl,
  TransferRequest,
  TransferResult,
} from './solana';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { randomUUID } from 'crypto';
import type { PayoutBatch, PayoutResult, PayoutSummary } from '@/types';

// Default config values (used if not found in database)
const DEFAULT_CONFIG = {
  daily_budget_sol: 10,
  max_per_user_sol: 1,
  min_payout_sol: 0.001,
};

interface ApprovedSubmission {
  id: string;
  user_id: string;
  final_score: number;
  user: {
    id: string;
    wallet_address: string;
    x_username: string | null;
  };
}

interface UserPayout {
  userId: string;
  walletAddress: string;
  username: string | null;
  totalScore: number;
  submissionIds: string[];
  amountLamports: number;
}

/**
 * Get payout configuration from database or use defaults
 */
async function getPayoutConfig(): Promise<{
  dailyBudgetSol: number;
  maxPerUserSol: number;
  minPayoutSol: number;
}> {
  const supabase = createServerClient();

  const { data } = await supabase
    .from('config')
    .select('value')
    .eq('key', 'payout_settings')
    .single();

  const settings = data?.value || DEFAULT_CONFIG;

  return {
    dailyBudgetSol: settings.daily_budget_sol || DEFAULT_CONFIG.daily_budget_sol,
    maxPerUserSol: settings.max_per_user_sol || DEFAULT_CONFIG.max_per_user_sol,
    minPayoutSol: settings.min_payout_sol || DEFAULT_CONFIG.min_payout_sol,
  };
}

/**
 * Get approved submissions that haven't been paid yet
 */
export async function getApprovedSubmissionsForPayout(): Promise<ApprovedSubmission[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('submissions')
    .select(`
      id,
      user_id,
      final_score,
      user:users!inner(
        id,
        wallet_address,
        x_username
      )
    `)
    .eq('status', 'approved')
    .gt('final_score', 0)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching approved submissions:', error);
    throw new Error(`Failed to fetch submissions: ${error.message}`);
  }

  return (data || []) as unknown as ApprovedSubmission[];
}

/**
 * Calculate payout amounts per user based on their scores
 * Respects max_per_user_sol and min_payout_sol limits
 */
export async function calculatePayoutAmounts(
  submissions: ApprovedSubmission[]
): Promise<UserPayout[]> {
  if (submissions.length === 0) {
    return [];
  }

  const config = await getPayoutConfig();

  // Group submissions by user
  const userSubmissions: Record<string, {
    userId: string;
    walletAddress: string;
    username: string | null;
    totalScore: number;
    submissionIds: string[];
  }> = {};

  for (const sub of submissions) {
    const userId = sub.user_id;
    if (!userSubmissions[userId]) {
      userSubmissions[userId] = {
        userId,
        walletAddress: sub.user.wallet_address,
        username: sub.user.x_username,
        totalScore: 0,
        submissionIds: [],
      };
    }
    userSubmissions[userId].totalScore += sub.final_score || 0;
    userSubmissions[userId].submissionIds.push(sub.id);
  }

  // Calculate total score across all users
  const totalScore = Object.values(userSubmissions).reduce(
    (sum, user) => sum + user.totalScore,
    0
  );

  if (totalScore === 0) {
    return [];
  }

  // Calculate budget in lamports
  const budgetLamports = config.dailyBudgetSol * LAMPORTS_PER_SOL;
  const maxPerUserLamports = config.maxPerUserSol * LAMPORTS_PER_SOL;
  const minPayoutLamports = config.minPayoutSol * LAMPORTS_PER_SOL;

  // Calculate payouts proportionally based on score
  const userPayouts: UserPayout[] = [];

  for (const user of Object.values(userSubmissions)) {
    // Calculate proportional share
    const proportion = user.totalScore / totalScore;
    let amountLamports = Math.floor(proportion * budgetLamports);

    // Apply max per user cap
    if (amountLamports > maxPerUserLamports) {
      amountLamports = maxPerUserLamports;
    }

    // Skip if below minimum
    if (amountLamports < minPayoutLamports) {
      continue;
    }

    userPayouts.push({
      ...user,
      amountLamports,
    });
  }

  return userPayouts;
}

/**
 * Create payout records in database
 */
async function createPayoutRecords(
  userPayouts: UserPayout[],
  batchId: string
): Promise<string[]> {
  const supabase = createServerClient();
  const payoutIds: string[] = [];

  for (const payout of userPayouts) {
    const { data, error } = await supabase
      .from('payouts')
      .insert({
        user_id: payout.userId,
        amount_lamports: payout.amountLamports,
        payout_type: 'submission',
        status: 'processing',
        batch_id: batchId,
        period_start: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        period_end: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error(`Error creating payout record for user ${payout.userId}:`, error);
      continue;
    }

    if (data) {
      payoutIds.push(data.id);
    }
  }

  return payoutIds;
}

/**
 * Update payout record with transaction result
 */
async function updatePayoutRecord(
  payoutId: string,
  result: TransferResult
): Promise<void> {
  const supabase = createServerClient();

  const updateData: Record<string, unknown> = {
    status: result.success ? 'completed' : 'failed',
    ...(result.success && {
      tx_signature: result.signature,
      completed_at: new Date().toISOString(),
    }),
    ...(!result.success && {
      last_error: result.error,
      retry_count: 1, // Will be incremented on retries
    }),
  };

  const { error } = await supabase
    .from('payouts')
    .update(updateData)
    .eq('id', payoutId);

  if (error) {
    console.error(`Error updating payout record ${payoutId}:`, error);
  }
}

/**
 * Update submission status to 'paid'
 */
async function markSubmissionsPaid(submissionIds: string[]): Promise<void> {
  const supabase = createServerClient();

  const { error } = await supabase
    .from('submissions')
    .update({ status: 'paid' })
    .in('id', submissionIds);

  if (error) {
    console.error('Error marking submissions as paid:', error);
  }
}

/**
 * Update user total earnings
 */
async function updateUserEarnings(
  userId: string,
  amountLamports: number
): Promise<void> {
  const supabase = createServerClient();

  // Use RPC to atomically increment earnings
  const { error } = await supabase.rpc('increment_user_earnings', {
    p_user_id: userId,
    p_amount: amountLamports,
  });

  // Fallback to direct update if RPC doesn't exist
  if (error) {
    const { data: user } = await supabase
      .from('users')
      .select('total_earned_lamports')
      .eq('id', userId)
      .single();

    if (user) {
      await supabase
        .from('users')
        .update({
          total_earned_lamports: (user.total_earned_lamports || 0) + amountLamports,
        })
        .eq('id', userId);
    }
  }
}

/**
 * Process the full payout cycle
 */
export async function processPayouts(): Promise<PayoutSummary> {
  const batchId = randomUUID();
  const startTime = Date.now();

  console.log(`[Payout] Starting batch ${batchId}`);

  // 1. Get approved submissions
  const submissions = await getApprovedSubmissionsForPayout();
  console.log(`[Payout] Found ${submissions.length} approved submissions`);

  if (submissions.length === 0) {
    return {
      batchId,
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      totalAmountLamports: 0,
      results: [],
      duration: Date.now() - startTime,
    };
  }

  // 2. Calculate payout amounts
  const userPayouts = await calculatePayoutAmounts(submissions);
  console.log(`[Payout] Calculated payouts for ${userPayouts.length} users`);

  if (userPayouts.length === 0) {
    return {
      batchId,
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      totalAmountLamports: 0,
      results: [],
      duration: Date.now() - startTime,
    };
  }

  // 3. Validate funding balance
  const totalRequired = userPayouts.reduce((sum, p) => sum + p.amountLamports, 0);
  const balanceCheck = await validateFundingBalance(totalRequired);

  if (!balanceCheck.sufficient) {
    console.error(
      `[Payout] Insufficient funds: have ${balanceCheck.balance / LAMPORTS_PER_SOL} SOL, ` +
      `need ${balanceCheck.required / LAMPORTS_PER_SOL} SOL`
    );
    return {
      batchId,
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      totalAmountLamports: 0,
      results: [],
      error: `Insufficient funding balance. Have ${(balanceCheck.balance / LAMPORTS_PER_SOL).toFixed(4)} SOL, need ${(balanceCheck.required / LAMPORTS_PER_SOL).toFixed(4)} SOL`,
      duration: Date.now() - startTime,
    };
  }

  // 4. Create payout records
  const payoutIds = await createPayoutRecords(userPayouts, batchId);
  console.log(`[Payout] Created ${payoutIds.length} payout records`);

  // 5. Prepare transfer requests
  const transfers: TransferRequest[] = userPayouts.map((payout, index) => ({
    recipient: payout.walletAddress,
    lamports: payout.amountLamports,
    metadata: {
      payoutId: payoutIds[index],
      userId: payout.userId,
      submissionIds: payout.submissionIds,
    },
  }));

  // 6. Execute batch transfers
  console.log(`[Payout] Sending ${transfers.length} transfers...`);
  const transferResults = await sendBatchTransfers(transfers);

  // 7. Process results
  const results: PayoutResult[] = [];
  let successful = 0;
  let failed = 0;
  let totalSent = 0;

  for (let i = 0; i < transferResults.length; i++) {
    const result = transferResults[i];
    const payout = userPayouts[i];
    const payoutId = payoutIds[i];

    // Update payout record
    if (payoutId) {
      await updatePayoutRecord(payoutId, result);
    }

    if (result.success) {
      successful++;
      totalSent += result.lamports;

      // Mark submissions as paid
      await markSubmissionsPaid(payout.submissionIds);

      // Update user earnings
      await updateUserEarnings(payout.userId, result.lamports);

      results.push({
        userId: payout.userId,
        walletAddress: payout.walletAddress,
        amountLamports: result.lamports,
        amountSol: result.lamports / LAMPORTS_PER_SOL,
        success: true,
        txSignature: result.signature,
        explorerUrl: result.signature ? getExplorerUrl(result.signature) : undefined,
      });
    } else {
      failed++;
      results.push({
        userId: payout.userId,
        walletAddress: payout.walletAddress,
        amountLamports: result.lamports,
        amountSol: result.lamports / LAMPORTS_PER_SOL,
        success: false,
        error: result.error,
      });
    }
  }

  const duration = Date.now() - startTime;
  console.log(
    `[Payout] Batch ${batchId} complete: ${successful}/${transferResults.length} successful, ` +
    `${(totalSent / LAMPORTS_PER_SOL).toFixed(4)} SOL sent in ${duration}ms`
  );

  return {
    batchId,
    totalProcessed: transferResults.length,
    successful,
    failed,
    totalAmountLamports: totalSent,
    results,
    duration,
  };
}

/**
 * Get pending payouts that need retry
 */
export async function getPendingRetries(): Promise<number> {
  const supabase = createServerClient();

  const { count, error } = await supabase
    .from('payouts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'failed')
    .lt('retry_count', 3);

  if (error) {
    console.error('Error fetching pending retries:', error);
    return 0;
  }

  return count || 0;
}
