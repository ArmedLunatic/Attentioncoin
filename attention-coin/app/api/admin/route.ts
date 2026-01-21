import { NextResponse } from "next/server";
import { PublicKey, Keypair } from "@solana/web3.js";
import { executeAdminPayout } from "@/lib/adminPayout";
import { createServerClient } from "@/lib/supabase";

/**
 * POST /api/admin
 * For direct payout: { payee: string, lamports: number }
 * For action-based: { action: string, ...otherData }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = createServerClient();

    // Handle direct payout request (manual admin payout)
    if (body.payee && (body.lamports !== undefined || body.amount !== undefined)) {
      const { payee, lamports, amount } = body;

      // Validate payee exists
      if (!payee || typeof payee !== 'string') {
        console.error('[PAYOUT SKIPPED] Missing or invalid payee:', payee);
        return NextResponse.json(
          { error: "Missing or invalid payee" },
          { status: 400 }
        );
      }

      // Validate payee is a valid PublicKey
      let toPubkey: PublicKey;
      try {
        toPubkey = new PublicKey(payee);
      } catch (err) {
        console.error('[PAYOUT SKIPPED] Invalid PublicKey format:', payee, err);
        return NextResponse.json(
          { error: "Invalid payee PublicKey format" },
          { status: 400 }
        );
      }

      // Convert SOL to lamports if amount provided, otherwise use lamports
      let finalLamports: number;
      if (amount !== undefined && amount !== null) {
        const LAMPORTS_PER_SOL = 1000000000;
        finalLamports = Math.floor(Number(amount) * LAMPORTS_PER_SOL);
      } else if (lamports !== undefined && lamports !== null) {
        finalLamports = Number(lamports);
      } else {
        console.error('[PAYOUT SKIPPED] Missing lamports or amount');
        return NextResponse.json(
          { error: "Missing lamports or amount" },
          { status: 400 }
        );
      }

      // Validate lamports is positive
      if (isNaN(finalLamports) || finalLamports <= 0) {
        console.error('[PAYOUT SKIPPED] Invalid lamports amount:', finalLamports);
        return NextResponse.json(
          { error: "Lamports must be a positive number" },
          { status: 400 }
        );
      }

      const adminKeypair = Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(process.env.ADMIN_PRIVATE_KEY!))
      );

      const txid = await executeAdminPayout(
        adminKeypair,
        toPubkey,
        finalLamports
      );

      return NextResponse.json({ success: true, txid });
    }

    // Handle action-based requests
    const { action, ...data } = body;

    switch (action) {
      case 'getStats':
        // Verify admin access first using environment variable
        const adminWallet = process.env.NEXT_PUBLIC_ADMIN_WALLET;
        if (!adminWallet || body.publicKey?.toLowerCase() !== adminWallet.toLowerCase()) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Return stats and submissions
        const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
        const { count: totalSubmissions } = await supabase.from('submissions').select('*', { count: 'exact', head: true });
        const { count: totalApproved } = await supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'approved');
        const { count: totalPaid } = await supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('paid', true);
        const { count: pendingApproval } = await supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: pendingPayment } = await supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'approved').eq('paid', false);

        const { data: submissions, error: subsError } = await supabase
          .from('submissions')
          .select(`
            *,
            users (x_username)
          `)
          .in('status', ['pending', 'approved'])
          .order('created_at', { ascending: false })
          .limit(50);

        return NextResponse.json({
          success: true,
          data: {
            stats: {
              totalUsers: totalUsers || 0,
              totalSubmissions: totalSubmissions || 0,
              totalApproved: totalApproved || 0,
              totalPaid: totalPaid || 0,
              pendingApproval: pendingApproval || 0,
              pendingPayment: pendingPayment || 0,
              fundingBalance: 0, // This would come from admin wallet balance in a real implementation
            },
            submissions: submissions || []
          }
        });

      case 'approve':
        // Verify admin access
        const approveAdminWallet = process.env.NEXT_PUBLIC_ADMIN_WALLET;
        if (!approveAdminWallet || body.publicKey?.toLowerCase() !== approveAdminWallet.toLowerCase()) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { submissionId, engagementData } = data;
        if (!submissionId) {
          return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 });
        }

        // Calculate score based on engagement data
        const likes = engagementData?.likes || 0;
        const reposts = engagementData?.reposts || 0;
        const replies = engagementData?.replies || 0;

        // Scoring: like=1, repost=3, reply=2 (configurable weights)
        const baseScore = (likes * 1) + (reposts * 3) + (replies * 2);
        const finalScore = baseScore; // Can apply multipliers here

        // Update submission status to approved
        const { error: approveError } = await supabase
          .from('submissions')
          .update({
            status: 'approved',
            approved_at: new Date().toISOString(),
            likes,
            reposts,
            replies,
            base_score: baseScore,
            final_score: finalScore
          })
          .eq('id', submissionId);

        if (approveError) {
          console.error('Error approving submission:', approveError);
          return NextResponse.json({ error: 'Failed to approve submission' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

      case 'reject':
        // Verify admin access
        const rejectAdminWallet = process.env.NEXT_PUBLIC_ADMIN_WALLET;
        if (!rejectAdminWallet || body.publicKey?.toLowerCase() !== rejectAdminWallet.toLowerCase()) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { submissionId: rejectId } = data;
        if (!rejectId) {
          return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 });
        }

        // Update submission status to rejected
        const { error: rejectError } = await supabase
          .from('submissions')
          .update({
            status: 'rejected',
            rejection_reason: 'Rejected by admin'
          })
          .eq('id', rejectId);

        if (rejectError) {
          console.error('Error rejecting submission:', rejectError);
          return NextResponse.json({ error: 'Failed to reject submission' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

      case 'markPaid':
        // Verify admin access
        const markPaidAdminWallet = process.env.NEXT_PUBLIC_ADMIN_WALLET;
        if (!markPaidAdminWallet || body.publicKey?.toLowerCase() !== markPaidAdminWallet.toLowerCase()) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { submissionId: paidId } = data;
        if (!paidId) {
          return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 });
        }

        // Mark submission as paid
        const { error: markPaidError } = await supabase
          .from('submissions')
          .update({
            paid_at: new Date().toISOString()
          })
          .eq('id', paidId);

        if (markPaidError) {
          console.error('Error marking as paid:', markPaidError);
          return NextResponse.json({ error: 'Failed to mark as paid' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

      case 'getAggregatedPayouts':
        // Verify admin access first using environment variable
        const payoutAdminWallet = process.env.NEXT_PUBLIC_ADMIN_WALLET;
        if (!payoutAdminWallet || body.publicKey?.toLowerCase() !== payoutAdminWallet.toLowerCase()) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Get all approved submissions that haven't been paid yet
        // Note: We check for NULL paid_at since paid column may not exist yet
        const { data: unpaidSubmissions, error: unpaidError } = await supabase
          .from('submissions')
          .select(`
            id,
            user_id,
            final_score,
            paid_at,
            users (
              x_username,
              payout_address,
              wallet_address
            )
          `)
          .eq('status', 'approved')
          .is('paid_at', null);

        if (unpaidError) {
          console.error('Error fetching unpaid submissions:', unpaidError);
          return NextResponse.json({ error: 'Failed to fetch unpaid submissions' }, { status: 500 });
        }

        // Aggregate by user
        const userPayouts = new Map();

        for (const submission of (unpaidSubmissions || [])) {
          const userId = submission.user_id;
          const score = submission.final_score || 0;
          const userInfo = submission.users as any;
          const username = userInfo?.x_username || 'Unknown';
          const payoutAddress = userInfo?.payout_address || userInfo?.wallet_address;

          if (!userPayouts.has(userId)) {
            userPayouts.set(userId, {
              userId,
              username,
              payoutAddress,
              totalScore: 0,
              submissionCount: 0,
              submissionIds: []
            });
          }

          const userPayout = userPayouts.get(userId);
          userPayout.totalScore += score;
          userPayout.submissionCount += 1;
          userPayout.submissionIds.push(submission.id);
        }

        // Convert map to array and calculate lamports (1 point = 1 lamport for simplicity)
        const aggregatedPayouts = Array.from(userPayouts.values()).map(payout => ({
          userId: payout.userId,
          username: payout.username,
          payoutAddress: payout.payoutAddress,
          totalScore: payout.totalScore,
          totalAmountLamports: Math.floor(payout.totalScore * 1000000), // Convert score to lamports
          submissionCount: payout.submissionCount,
          submissionIds: payout.submissionIds
        }));

        return NextResponse.json({
          success: true,
          data: aggregatedPayouts
        });

      case 'executeAggregatePayout':
        // Verify admin access first using environment variable
        const execAdminWallet = process.env.NEXT_PUBLIC_ADMIN_WALLET;
        if (!execAdminWallet || body.publicKey?.toLowerCase() !== execAdminWallet.toLowerCase()) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Prepare payout details for the client to execute
        const { userId } = data;
        if (!userId) {
          return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        // Get user info
        const { data: user, error: userFetchError } = await supabase
          .from('users')
          .select('x_username, payout_address, wallet_address')
          .eq('id', userId)
          .single();

        if (userFetchError || !user) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get all unpaid approved submissions for this user
        const { data: userSubmissions, error: submissionsError } = await supabase
          .from('submissions')
          .select('id, final_score, paid_at')
          .eq('user_id', userId)
          .eq('status', 'approved')
          .is('paid_at', null);

        if (submissionsError) {
          console.error('Error fetching user submissions:', submissionsError);
          return NextResponse.json({ error: 'Failed to fetch user submissions' }, { status: 500 });
        }

        if (!userSubmissions || userSubmissions.length === 0) {
          return NextResponse.json({ error: 'No pending payouts for user' }, { status: 400 });
        }

        // Calculate total amount
        const totalScore = userSubmissions.reduce((sum, sub) => sum + (sub.final_score || 0), 0);
        const amountLamports = Math.floor(totalScore * 1000000); // Convert score to lamports
        const userSubmissionIds = userSubmissions.map(sub => sub.id);

        const recipientAddress = user.payout_address || user.wallet_address;

        // Validate recipient wallet exists
        if (!recipientAddress || typeof recipientAddress !== 'string') {
          console.error('[PAYOUT SKIPPED] User has no valid wallet address:', { userId, username: user.x_username });
          return NextResponse.json(
            { error: 'User has no valid wallet address' },
            { status: 400 }
          );
        }

        // Validate recipient is a valid PublicKey
        try {
          new PublicKey(recipientAddress);
        } catch (err) {
          console.error('[PAYOUT SKIPPED] Invalid wallet address format:', { userId, recipient: recipientAddress, username: user.x_username }, err);
          return NextResponse.json(
            { error: 'Invalid wallet address format' },
            { status: 400 }
          );
        }

        // Validate amount is positive
        if (isNaN(amountLamports) || amountLamports <= 0) {
          console.error('[PAYOUT SKIPPED] Invalid payout amount:', { userId, amountLamports, username: user.x_username });
          return NextResponse.json(
            { error: 'Invalid payout amount (must be positive)' },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          data: {
            recipient: recipientAddress,
            amountLamports,
            amount: amountLamports / 1000000000,
            username: user.x_username,
            submissionIds: userSubmissionIds,
            submissionCount: userSubmissions.length
          }
        });

      case 'getPaymentHistory':
        // Verify admin access
        const historyAdminWallet = process.env.NEXT_PUBLIC_ADMIN_WALLET;
        if (!historyAdminWallet || body.publicKey?.toLowerCase() !== historyAdminWallet.toLowerCase()) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Get all paid submissions with user info, grouped by transaction
        const { data: paidSubmissions, error: historyError } = await supabase
          .from('submissions')
          .select(`
            id,
            user_id,
            final_score,
            paid_at,
            tx_signature,
            users (
              x_username
            )
          `)
          .eq('status', 'approved')
          .not('paid_at', 'is', null)
          .order('paid_at', { ascending: false });

        if (historyError) {
          console.error('Error fetching payment history:', historyError);
          return NextResponse.json({ error: 'Failed to fetch payment history' }, { status: 500 });
        }

        // Group by transaction signature
        const paymentMap = new Map();

        for (const submission of (paidSubmissions || [])) {
          const txSig = submission.tx_signature;
          if (!txSig) continue;

          if (!paymentMap.has(txSig)) {
            paymentMap.set(txSig, {
              id: txSig,
              tx_signature: txSig,
              paid_at: submission.paid_at,
              username: (submission.users as any)?.x_username || 'Unknown',
              amount_lamports: 0,
              submission_count: 0,
              user_id: submission.user_id
            });
          }

          const payment = paymentMap.get(txSig);
          payment.amount_lamports += (submission.final_score || 0) * 1000000;
          payment.submission_count += 1;
        }

        const paymentHistory = Array.from(paymentMap.values());

        return NextResponse.json({
          success: true,
          data: paymentHistory
        });

      case 'recordAggregatePayout':
        // Verify admin access first using environment variable
        const recordAdminWallet = process.env.NEXT_PUBLIC_ADMIN_WALLET;
        if (!recordAdminWallet || body.publicKey?.toLowerCase() !== recordAdminWallet.toLowerCase()) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Record the completed payout transaction
        const { signature, amount, recipient, username, userId: payoutUserId, submissionIds } = data;
        if (!signature || !amount || !recipient || !payoutUserId) {
          return NextResponse.json({ error: 'Missing required fields for recording payout' }, { status: 400 });
        }

        // Update submissions as paid (using paid_at timestamp as indicator)
        if (Array.isArray(submissionIds) && submissionIds.length > 0) {
          const paidAtTimestamp = new Date().toISOString();

          // First update paid_at (required field that always exists)
          const { error: updateError } = await supabase
            .from('submissions')
            .update({
              paid_at: paidAtTimestamp
            })
            .in('id', submissionIds);

          if (updateError) {
            console.error('Error updating submissions as paid:', updateError);
            return NextResponse.json({ error: 'Failed to update submission payment status' }, { status: 500 });
          }

          // Try to update tx_signature (optional field, may not exist yet)
          // This will fail silently if the column doesn't exist
          try {
            await supabase
              .from('submissions')
              .update({ tx_signature: signature })
              .in('id', submissionIds);
          } catch (err) {
            console.warn('tx_signature column may not exist yet. Run add-tx-signature-column.sql migration.');
          }
        }

        // Add record to payouts table
        const { error: payoutInsertError } = await supabase
          .from('payouts')
          .insert([{
            user_id: payoutUserId,
            amount_lamports: Math.round(amount * 1000000000), // Convert SOL to lamports
            payout_type: 'submission',
            status: 'completed',
            tx_signature: signature,
            period_start: null,
            period_end: null
          }]);

        if (payoutInsertError) {
          console.error('Error recording payout:', payoutInsertError);
          return NextResponse.json({ error: 'Failed to record payout' }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          data: {
            explorerUrl: `https://solscan.io/tx/${signature}`
          }
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err: any) {
    console.error("Admin API failed:", err);
    return NextResponse.json(
      { error: err?.message ?? "Admin API failed" },
      { status: 500 }
    );
  }
}
