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

const ADMIN_WALLET_ALLOWLIST = process.env.ADMIN_WALLET_ALLOWLIST?.split(',') || [];

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
    const { action, submissionId, engagementData, rejectionReason, payoutAmount, signature, publicKey } = body;

    if (!action || !signature || !publicKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check for empty or undefined ADMIN_WALLET_ALLOWLIST
    if (ADMIN_WALLET_ALLOWLIST.length === 0) {
      return NextResponse.json({ error: 'Admin wallet allowlist is empty. Access denied.' }, { status: 403 });
    }

    // Verify admin wallet
    const isAdminWallet = ADMIN_WALLET_ALLOWLIST.includes(publicKey);
    if (!isAdminWallet) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify signature
    const message = `admin-action-${action}-${submissionId || ''}`;
    const isValidSignature = verifySignature(message, signature, publicKey);
    if (!isValidSignature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const supabase = createServerClient();

    switch (action) {
      case 'getStats': {
        // ... existing code ...
      }
      case 'approve': {
        // ... existing code ...
      }
      case 'reject': {
        // ... existing code ...
      }
      case 'markPaid': {
        // ... existing code ...
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
        const requiredBalance = payoutLamports;
        await validateFundingBalance(requiredBalance);

        // Send SOL transfer
        try {
          const txSignature = await sendSolTransfer(payoutAddress, payoutLamports);
          return NextResponse.json({
            success: true,
            data: {
              recipient: payoutAddress,
              amount: payoutLamports / LAMPORTS_PER_SOL,
              amountLamports: payoutLamports,
              username: user.x_username,
              submissionId,
              txSignature
            }
          });
        } catch (sendError) {
          console.error('Failed to send SOL transfer:', sendError);
          return NextResponse.json({ error: 'Failed to send SOL transfer' }, { status: 500 });
        }
      }
      case 'getAggregatedPayouts': {
        // ... existing code ...
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

        // Validate funding balance
        const requiredBalance = totalLamports;
        await validateFundingBalance(requiredBalance);

        // Send SOL transfer
        try {
          const txSignature = await sendSolTransfer(payoutAddress, totalLamports);
          return NextResponse.json({
            success: true,
            data: {
              recipient: payoutAddress,
              amount: totalLamports / LAMPORTS_PER_SOL,
              amountLamports: totalLamports,
              username: users.x_username,
              userId,
              submissionIds,
              submissionCount: submissions.length,
              txSignature
            }
          });
        } catch (sendError) {
          console.error('Failed to send SOL transfer:', sendError);
          return NextResponse.json({ error: 'Failed to send SOL transfer' }, { status: 500 });
        }
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
