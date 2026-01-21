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

      case 'getAggregatedPayouts':
        // Verify admin access first using environment variable
        const payoutAdminWallet = process.env.NEXT_PUBLIC_ADMIN_WALLET;
        if (!payoutAdminWallet || body.publicKey?.toLowerCase() !== payoutAdminWallet.toLowerCase()) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Get aggregated payouts for all users
        const { data: payoutData, error: payoutError } = await supabase.rpc('get_aggregated_payouts');

        return NextResponse.json({
          success: true,
          data: payoutData || []
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

        // Get user info and aggregated payout data
        const { data: user, error: userFetchError } = await supabase
          .from('users')
          .select('x_username, payout_address, wallet_address')
          .eq('id', userId)
          .single();

        if (userFetchError || !user) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get aggregated payout amount for this user
        const { data: aggregatedData, error: aggError } = await supabase.rpc('get_user_aggregated_payout', {
          user_id_param: userId
        });

        if (aggError || !aggregatedData || aggregatedData.length === 0) {
          return NextResponse.json({ error: 'No pending payouts for user' }, { status: 400 });
        }

        const payoutInfo = aggregatedData[0];
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
        const amountLamports = Number(payoutInfo.total_amount_lamports);
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
            submissionIds: payoutInfo.submission_ids
          }
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

        // Update submissions as paid
        if (Array.isArray(submissionIds) && submissionIds.length > 0) {
          const { error: updateError } = await supabase
            .from('submissions')
            .update({
              paid: true,
              paid_at: new Date().toISOString(),
              tx_signature: signature
            })
            .in('id', submissionIds);

          if (updateError) {
            console.error('Error updating submissions as paid:', updateError);
            return NextResponse.json({ error: 'Failed to update submission payment status' }, { status: 500 });
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
