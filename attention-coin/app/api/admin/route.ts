import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { 
  sendSolTransfer, 
  validateFundingBalance, 
  getExplorerUrl,
  getFundingBalance
} from '@/lib/solana';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

function verifyPassword(provided: string) {
  return provided?.trim() === ADMIN_PASSWORD.trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password, action, submissionId, engagementData, rejectionReason, payoutAmount } = body;

    if (!password || !verifyPassword(password)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabase = createServerClient();

    switch (action) {
      case 'getStats': {
        const { data: submissions } = await supabase
          .from('submissions')
          .select('*, users(*)')
          .order('created_at', { ascending: false });

        const { count: totalUsers } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });

        // Get funding wallet balance
        let fundingBalance = 0;
        try {
          fundingBalance = await getFundingBalance();
        } catch (balanceError) {
          console.error('Failed to get funding balance:', balanceError);
        }

        return NextResponse.json({
          success: true,
          data: {
            stats: {
              totalUsers: totalUsers || 0,
              fundingBalance: fundingBalance,
            },
            submissions: submissions || [],
          },
        });
      }

      case 'approve': {
        if (!submissionId || !engagementData) {
          return NextResponse.json({ error: 'Missing data' }, { status: 400 });
        }

        const { likes = 0, reposts = 0, replies = 0 } = engagementData;
        const raw = likes + reposts * 2 + replies;
        const final_score =
          raw > 0 ? Math.round(Math.log10(raw + 1) * 10 * 100) / 100 : 0;

        const { error } = await supabase
          .from('submissions')
          .update({
            status: 'approved',
            likes,
            reposts,
            replies,
            final_score,
            approved_at: new Date().toISOString(),
          })
          .eq('id', submissionId);

        if (error) {
          return NextResponse.json({ error: 'Approve failed' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
      }

      case 'reject': {
        if (!submissionId) {
          return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 });
        }

        await supabase
          .from('submissions')
          .update({
            status: 'rejected',
            rejection_reason: rejectionReason || null,
          })
          .eq('id', submissionId);

        return NextResponse.json({ success: true });
      }

      case 'markPaid': {
        if (!submissionId) {
          return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 });
        }

        await supabase
          .from('submissions')
          .update({ status: 'paid' })
          .eq('id', submissionId);

        return NextResponse.json({ success: true });
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

        const user = submission.users;
        const payoutAddress = user.payout_address || user.wallet_address;

        if (!payoutAddress) {
          return NextResponse.json({ error: 'User has no payout address configured' }, { status: 400 });
        }

        // Calculate payout amount or use provided amount
        let payoutLamports: number;
        if (payoutAmount) {
          payoutLamports = Math.round(payoutAmount * LAMPORTS_PER_SOL);
        } else {
          // Use default calculation based on final_score
          payoutLamports = Math.round((submission.final_score || 0) * 1000000); // 1 SOL = 1,000,000 score units
        }

        if (payoutLamports <= 0) {
          return NextResponse.json({ error: 'Payout amount must be positive' }, { status: 400 });
        }

        // Return payout details for client-side execution
        return NextResponse.json({
          success: true,
          clientSideRequired: true,
          data: {
            recipient: payoutAddress,
            amount: payoutLamports / LAMPORTS_PER_SOL,
            amountLamports: payoutLamports,
            username: user.x_username,
            submissionId
          }
        });
      }

      case 'getAggregatedPayouts': {
        // Get all approved submissions grouped by user
        const { data: submissions } = await supabase
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
          .gt('final_score', 0)
          .order('created_at', { ascending: false });

        if (!submissions) {
          return NextResponse.json({
            success: true,
            data: []
          });
        }

        // Aggregate by user
        const userAggregates: Record<string, {
          userId: string;
          username: string;
          payoutAddress: string;
          totalScore: number;
          submissionIds: string[];
          totalAmountLamports: number;
          submissionCount: number;
        }> = {};

        for (const sub of submissions) {
          const userId = sub.user_id;
          const users = sub.users as any; // Cast to any to access nested properties
          const payoutAddress = users.payout_address || users.wallet_address;
          
          // Skip users without payout address
          if (!payoutAddress) {
            continue;
          }

          if (!userAggregates[userId]) {
            userAggregates[userId] = {
              userId,
              username: users.x_username || 'Unknown',
              payoutAddress,
              totalScore: 0,
              submissionIds: [],
              totalAmountLamports: 0,
              submissionCount: 0
            };
          }

          const submissionAmount = Math.round((sub.final_score || 0) * 1000000);
          userAggregates[userId].totalScore += sub.final_score || 0;
          userAggregates[userId].submissionIds.push(sub.id);
          userAggregates[userId].totalAmountLamports += submissionAmount;
          userAggregates[userId].submissionCount++;
        }

        const aggregatedPayouts = Object.values(userAggregates);

        return NextResponse.json({
          success: true,
          data: aggregatedPayouts
        });
      }

      case 'executeAggregatePayout': {
        const { userId } = body;
        
        if (!userId) {
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
          .eq('user_id', userId)
          .eq('status', 'approved')
          .gt('final_score', 0);

        if (submissionsError || !submissions || submissions.length === 0) {
          return NextResponse.json({ error: 'No approved submissions found for user' }, { status: 404 });
        }

        const users = submissions[0].users as any; // Cast to any to access nested properties
        const payoutAddress = users.payout_address || users.wallet_address;

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

        return NextResponse.json({
          success: true,
          clientSideRequired: true,
          data: {
            recipient: payoutAddress,
            amount: totalLamports / LAMPORTS_PER_SOL,
            amountLamports: totalLamports,
            username: users.x_username,
            userId,
            submissionIds,
            submissionCount: submissions.length
          }
        });
      }

      case 'recordAggregatePayout': {
        const { signature, amount, recipient, username, userId, submissionIds } = body;
        
        if (!signature || !amount || !recipient || !userId || !submissionIds) {
          return NextResponse.json({ error: 'Missing aggregate payout data' }, { status: 400 });
        }

        // Mark all submissions as paid
        const { error: updateError } = await supabase
          .from('submissions')
          .update({ 
            status: 'paid',
            paid_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .in('id', submissionIds);

        if (updateError) {
          console.error('Failed to update submissions status:', updateError);
          return NextResponse.json({ error: 'Failed to update submissions' }, { status: 500 });
        }

        return NextResponse.json({ 
          success: true,
          data: {
            signature,
            amount,
            recipient,
            userId,
            submissionCount: submissionIds.length,
            explorerUrl: getExplorerUrl(signature)
          }
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
