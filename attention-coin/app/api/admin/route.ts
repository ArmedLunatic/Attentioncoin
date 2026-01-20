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

        // Validate funding balance
        const balanceValidation = await validateFundingBalance(payoutLamports);
        if (!balanceValidation.sufficient) {
          return NextResponse.json({
            error: 'Insufficient funding balance',
            details: {
              balance: balanceValidation.balance,
              required: balanceValidation.required,
              shortBy: balanceValidation.required - balanceValidation.balance
            }
          }, { status: 400 });
        }

        try {
          // Execute SOL transfer
          const signature = await sendSolTransfer(payoutAddress, payoutLamports);

          // Create reward record
          const { error: rewardError } = await supabase
            .from('rewards')
            .insert({
              user_id: user.id,
              period_date: new Date().toISOString().split('T')[0], // Today's date
              total_score: submission.final_score || 0,
              amount_lamports: payoutLamports,
              status: 'completed',
              tx_signature: signature,
            });

          if (rewardError) {
            console.error('Failed to create reward record:', rewardError);
            // Continue anyway - the transfer was successful
          }

          // Update submission status to paid
          const { error: updateError } = await supabase
            .from('submissions')
            .update({ 
              status: 'paid',
              approved_at: submission.approved_at || new Date().toISOString()
            })
            .eq('id', submissionId);

          if (updateError) {
            console.error('Failed to update submission status:', updateError);
          }

          return NextResponse.json({
            success: true,
            data: {
              signature,
              amount: payoutLamports / LAMPORTS_PER_SOL,
              recipient: payoutAddress,
              explorerUrl: getExplorerUrl(signature),
              username: user.x_username
            }
          });

        } catch (transferError: any) {
          console.error('Transfer failed:', transferError);
          return NextResponse.json({
            error: 'Transfer failed',
            details: transferError.message
          }, { status: 500 });
        }
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
