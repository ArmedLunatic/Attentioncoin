import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import {
  sendSolTransfer,
  validateFundingBalance,
  getExplorerUrl,
  getFundingBalance
} from '@/lib/solana';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

// Admin wallet allowlist from environment variable
const ADMIN_WALLET_ALLOWLIST = (process.env.ADMIN_WALLET_ALLOWLIST?.split(',') || [])
  .map(addr => addr.trim())
  .filter(addr => addr.length > 0);

/**
 * Verify Ed25519 signature using TweetNaCl
 */
function verifySignature(message: string, signature: string, publicKey: string): boolean {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = bs58.decode(publicKey);
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, submissionId, engagementData, rejectionReason, payoutAmount, signature, publicKey, userId } = body;

    // Require action, signature, and publicKey for all requests
    if (!action || !signature || !publicKey) {
      return NextResponse.json({ error: 'Missing required fields: action, signature, publicKey' }, { status: 400 });
    }

    // Check if ADMIN_WALLET_ALLOWLIST is configured
    if (ADMIN_WALLET_ALLOWLIST.length === 0) {
      console.error('ADMIN_WALLET_ALLOWLIST is not configured');
      return NextResponse.json({ error: 'Admin wallet allowlist is not configured. Access denied.' }, { status: 403 });
    }

    // Verify wallet is in admin allowlist
    const isAdminWallet = ADMIN_WALLET_ALLOWLIST.includes(publicKey);
    if (!isAdminWallet) {
      console.warn(`Unauthorized admin access attempt from wallet: ${publicKey}`);
      return NextResponse.json({ error: 'Unauthorized. Wallet not in admin allowlist.' }, { status: 403 });
    }

    // Verify signature matches expected message format
    const message = `admin-action-${action}-${submissionId || ''}`;
    const isValidSignature = verifySignature(message, signature, publicKey);
    if (!isValidSignature) {
      console.warn(`Invalid signature for admin action: ${action}`);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const supabase = createServerClient();

    switch (action) {
      case 'getStats': {
        // Get total counts
        const [usersResult, submissionsResult] = await Promise.all([
          supabase.from('users').select('id', { count: 'exact', head: true }),
          supabase.from('submissions').select('id, status', { count: 'exact' })
        ]);

        const submissions = submissionsResult.data || [];
        const totalUsers = usersResult.count || 0;
        const totalSubmissions = submissions.length;
        const totalApproved = submissions.filter(s => s.status === 'approved').length;
        const totalPaid = submissions.filter(s => s.status === 'paid').length;
        const pendingApproval = submissions.filter(s => s.status === 'pending').length;
        const pendingPayment = totalApproved; // Approved but not yet paid

        // Get funding wallet balance
        let fundingBalance = 0;
        try {
          fundingBalance = await getFundingBalance();
        } catch (err) {
          console.error('Failed to get funding balance:', err);
        }

        // Get all submissions with user info for the admin list
        const { data: submissionsList, error: listError } = await supabase
          .from('submissions')
          .select(`
            id,
            tweet_url,
            status,
            final_score,
            created_at,
            paid_at,
            users(
              id,
              x_username,
              payout_address,
              wallet_address
            )
          `)
          .order('created_at', { ascending: false })
          .limit(100);

        if (listError) {
          console.error('Failed to fetch submissions list:', listError);
        }

        return NextResponse.json({
          success: true,
          data: {
            stats: {
              totalUsers,
              totalSubmissions,
              totalApproved,
              totalPaid,
              pendingApproval,
              pendingPayment,
              fundingBalance,
            },
            submissions: submissionsList || [],
          },
        });
      }

      case 'approve': {
        if (!submissionId) {
          return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 });
        }

        // Get submission
        const { data: submission, error: getError } = await supabase
          .from('submissions')
          .select('*')
          .eq('id', submissionId)
          .single();

        if (getError || !submission) {
          return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        if (submission.status !== 'pending') {
          return NextResponse.json({ error: 'Submission is not pending' }, { status: 400 });
        }

        // Calculate final score based on engagement data
        const { likes = 0, reposts = 0, replies = 0 } = engagementData || {};
        const finalScore = (likes * 1) + (reposts * 2) + (replies * 1.5);

        // Update submission to approved with engagement data and score
        const { error: updateError } = await supabase
          .from('submissions')
          .update({
            status: 'approved',
            likes_count: likes,
            reposts_count: reposts,
            replies_count: replies,
            final_score: finalScore,
            approved_at: new Date().toISOString(),
          })
          .eq('id', submissionId);

        if (updateError) {
          console.error('Failed to approve submission:', updateError);
          return NextResponse.json({ error: 'Failed to approve submission' }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          data: {
            submissionId,
            status: 'approved',
            finalScore,
          },
        });
      }

      case 'reject': {
        if (!submissionId) {
          return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 });
        }

        // Get submission
        const { data: submission, error: getError } = await supabase
          .from('submissions')
          .select('*')
          .eq('id', submissionId)
          .single();

        if (getError || !submission) {
          return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        if (submission.status !== 'pending') {
          return NextResponse.json({ error: 'Submission is not pending' }, { status: 400 });
        }

        // Update submission to rejected
        const { error: updateError } = await supabase
          .from('submissions')
          .update({
            status: 'rejected',
            rejection_reason: rejectionReason || 'Rejected by admin',
            rejected_at: new Date().toISOString(),
          })
          .eq('id', submissionId);

        if (updateError) {
          console.error('Failed to reject submission:', updateError);
          return NextResponse.json({ error: 'Failed to reject submission' }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          data: {
            submissionId,
            status: 'rejected',
          },
        });
      }

      case 'markPaid': {
        if (!submissionId) {
          return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 });
        }

        // Get submission
        const { data: submission, error: getError } = await supabase
          .from('submissions')
          .select('*')
          .eq('id', submissionId)
          .single();

        if (getError || !submission) {
          return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        if (submission.status !== 'approved') {
          return NextResponse.json({ error: 'Submission must be approved before marking as paid' }, { status: 400 });
        }

        // Update submission to paid
        const { error: updateError } = await supabase
          .from('submissions')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
          })
          .eq('id', submissionId);

        if (updateError) {
          console.error('Failed to mark submission as paid:', updateError);
          return NextResponse.json({ error: 'Failed to mark as paid' }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          data: {
            submissionId,
            status: 'paid',
          },
        });
      }

      case 'executePayout': {
        if (!submissionId) {
          return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 });
        }

        // Get submission and user details
        const { data: submission, error: submissionError } = await supabase
          .from('submissions')
          .select(`
            *,
            users(
              id,
              x_username,
              payout_address,
              wallet_address
            )
          `)
          .eq('id', submissionId)
          .single();

        if (submissionError || !submission) {
          return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        if (submission.status !== 'approved') {
          return NextResponse.json({ error: 'Submission must be approved before payout' }, { status: 400 });
        }

        const user = submission.users as any;
        const payoutAddress = user?.payout_address || user?.wallet_address;

        if (!payoutAddress) {
          return NextResponse.json({ error: 'User has no payout address configured' }, { status: 400 });
        }

        // Calculate payout amount or use provided amount
        let payoutLamports: number;
        if (payoutAmount) {
          payoutLamports = Math.round(payoutAmount * LAMPORTS_PER_SOL);
        } else {
          // Use default calculation based on final_score
          payoutLamports = Math.round((submission.final_score || 0) * 1000000);
        }

        if (payoutLamports <= 0) {
          return NextResponse.json({ error: 'Payout amount must be positive' }, { status: 400 });
        }

        // Return payout details for client-side signing
        return NextResponse.json({
          success: true,
          data: {
            recipient: payoutAddress,
            amount: payoutLamports / LAMPORTS_PER_SOL,
            amountLamports: payoutLamports,
            username: user?.x_username,
            submissionId,
          },
        });
      }

      case 'getAggregatedPayouts': {
        // Get all approved submissions grouped by user
        const { data: submissions, error: queryError } = await supabase
          .from('submissions')
          .select(`
            id,
            user_id,
            final_score,
            users!inner(
              id,
              x_username,
              payout_address,
              wallet_address
            )
          `)
          .eq('status', 'approved')
          .gt('final_score', 0);

        if (queryError) {
          console.error('Failed to fetch submissions for aggregation:', queryError);
          return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
        }

        if (!submissions || submissions.length === 0) {
          return NextResponse.json({
            success: true,
            data: [],
          });
        }

        // Aggregate by user
        const userPayouts: Record<string, {
          userId: string;
          username: string;
          payoutAddress: string;
          totalScore: number;
          totalAmountLamports: number;
          submissionCount: number;
          submissionIds: string[];
        }> = {};

        for (const sub of submissions) {
          const user = sub.users as any;
          const userId = sub.user_id;
          const payoutAddress = user?.payout_address || user?.wallet_address;

          if (!payoutAddress) continue;

          if (!userPayouts[userId]) {
            userPayouts[userId] = {
              userId,
              username: user?.x_username || 'Unknown',
              payoutAddress,
              totalScore: 0,
              totalAmountLamports: 0,
              submissionCount: 0,
              submissionIds: [],
            };
          }

          userPayouts[userId].totalScore += sub.final_score || 0;
          userPayouts[userId].totalAmountLamports += Math.round((sub.final_score || 0) * 1000000);
          userPayouts[userId].submissionCount += 1;
          userPayouts[userId].submissionIds.push(sub.id);
        }

        return NextResponse.json({
          success: true,
          data: Object.values(userPayouts),
        });
      }

      case 'executeAggregatePayout': {
        const targetUserId = userId || body.userId;

        if (!targetUserId) {
          return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        // Get all approved submissions for this user
        const { data: submissions, error: submissionsError } = await supabase
          .from('submissions')
          .select(`
            id,
            final_score,
            users!inner(
              id,
              x_username,
              payout_address,
              wallet_address
            )
          `)
          .eq('user_id', targetUserId)
          .eq('status', 'approved')
          .gt('final_score', 0);

        if (submissionsError || !submissions || submissions.length === 0) {
          return NextResponse.json({ error: 'No approved submissions found for user' }, { status: 404 });
        }

        const users = submissions[0].users as any;
        const payoutAddress = users?.payout_address || users?.wallet_address;

        if (!payoutAddress) {
          return NextResponse.json({ error: 'User has no payout address configured' }, { status: 400 });
        }

        // Calculate total amount
        let totalLamports = 0;
        const submissionIds: string[] = [];

        for (const sub of submissions) {
          const amount = Math.round((sub.final_score || 0) * 1000000);
          totalLamports += amount;
          submissionIds.push(sub.id);
        }

        if (totalLamports <= 0) {
          return NextResponse.json({ error: 'Total payout amount must be positive' }, { status: 400 });
        }

        // Return payout details for client-side signing
        return NextResponse.json({
          success: true,
          data: {
            recipient: payoutAddress,
            amount: totalLamports / LAMPORTS_PER_SOL,
            amountLamports: totalLamports,
            username: users?.x_username,
            userId: targetUserId,
            submissionIds,
            submissionCount: submissions.length,
          },
        });
      }

      case 'recordAggregatePayout': {
        const { signature: txSignature, amount, recipient, username, userId: targetUserId, submissionIds } = body;

        if (!txSignature || !amount || !recipient || !targetUserId || !submissionIds) {
          return NextResponse.json({ error: 'Missing aggregate payout data' }, { status: 400 });
        }

        // Mark all submissions as paid
        const { error: updateError } = await supabase
          .from('submissions')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString()
          })
          .eq('user_id', targetUserId)
          .in('id', submissionIds);

        if (updateError) {
          console.error('Failed to update submissions status:', updateError);
          return NextResponse.json({ error: 'Failed to update submissions' }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          data: {
            signature: txSignature,
            amount,
            recipient,
            userId: targetUserId,
            submissionCount: submissionIds.length,
            explorerUrl: getExplorerUrl(txSignature)
          }
        });
      }

      case 'recordPayout': {
        const { signature: txSignature, amount, recipient, username, submissionId: subId } = body;

        if (!txSignature || !subId) {
          return NextResponse.json({ error: 'Missing payout data' }, { status: 400 });
        }

        // Mark submission as paid
        const { error: updateError } = await supabase
          .from('submissions')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString()
          })
          .eq('id', subId);

        if (updateError) {
          console.error('Failed to update submission status:', updateError);
          return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          data: {
            signature: txSignature,
            amount,
            recipient,
            submissionId: subId,
            explorerUrl: getExplorerUrl(txSignature)
          }
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err) {
    console.error('Admin API error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
