import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

const ADMIN_WALLET = process.env.ADMIN_WALLET;

if (!ADMIN_WALLET) {
  console.error('ADMIN_WALLET environment variable is not set');
}

interface AdminAction {
  action: 'approve' | 'reject' | 'markPaid' | 'getStats';
  submissionId?: string;
  engagementData?: {
    likes: number;
    reposts: number;
    replies: number;
  };
  rejectionReason?: string;
}

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

function isAdmin(wallet: string): boolean {
  return wallet === ADMIN_WALLET;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet, signature, timestamp, ...actionData } = body as {
      wallet: string;
      signature: string;
      timestamp: number;
      action: AdminAction['action'];
      submissionId?: string;
      engagementData?: AdminAction['engagementData'];
      rejectionReason?: string;
    };

    // Validate required fields
    if (!wallet || !signature || !timestamp) {
      return NextResponse.json(
        { error: 'Missing authentication fields' },
        { status: 400 }
      );
    }

    // Check timestamp is within 5 minutes (prevent replay attacks)
    const now = Date.now();
    if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
      return NextResponse.json(
        { error: 'Request expired' },
        { status: 401 }
      );
    }

    // Verify the wallet is admin
    if (!isAdmin(wallet)) {
      return NextResponse.json(
        { error: 'Unauthorized: Not an admin wallet' },
        { status: 403 }
      );
    }

    // Verify the signature
    const message = `admin:${actionData.action}:${timestamp}`;
    if (!verifySignature(message, signature, wallet)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Use server client with service role for admin operations
    const supabase = createServerClient();

    switch (actionData.action) {
      case 'approve': {
        if (!actionData.submissionId) {
          return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 });
        }

        // Calculate final_score with DIMINISHING RETURNS formula
        // This prevents high-engagement tweets from dominating the pool
        // and makes the payout budget sustainable as users scale
        const likes = actionData.engagementData?.likes || 0;
        const reposts = actionData.engagementData?.reposts || 0;
        const replies = actionData.engagementData?.replies || 0;

        // Raw engagement (reposts still weighted 2x for reach)
        const rawEngagement = likes + (reposts * 2) + replies;

        // Logarithmic scaling: prevents runaway scores
        // 10 engagement → 10 score
        // 100 engagement → 20 score
        // 1000 engagement → 30 score
        // 10000 engagement → 40 score
        const finalScore = rawEngagement > 0
          ? Math.round(Math.log10(rawEngagement + 1) * 10 * 100) / 100
          : 0;

        const { error } = await supabase
          .from('submissions')
          .update({
            status: 'approved',
            approved_at: new Date().toISOString(),
            likes,
            reposts,
            replies,
            final_score: finalScore,
          })
          .eq('id', actionData.submissionId);

        if (error) {
          console.error('Error approving submission:', error);
          return NextResponse.json({ error: 'Failed to approve submission' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Submission approved' });
      }

      case 'reject': {
        if (!actionData.submissionId) {
          return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 });
        }

        const { error } = await supabase
          .from('submissions')
          .update({
            status: 'rejected',
            rejection_reason: actionData.rejectionReason || null,
          })
          .eq('id', actionData.submissionId);

        if (error) {
          console.error('Error rejecting submission:', error);
          return NextResponse.json({ error: 'Failed to reject submission' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Submission rejected' });
      }

      case 'markPaid': {
        if (!actionData.submissionId) {
          return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 });
        }

        const { error } = await supabase
          .from('submissions')
          .update({ status: 'paid' })
          .eq('id', actionData.submissionId);

        if (error) {
          console.error('Error marking as paid:', error);
          return NextResponse.json({ error: 'Failed to mark as paid' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Marked as paid' });
      }

      case 'getStats': {
        // Get submissions with user data
        const { data: submissionsData } = await supabase
          .from('submissions')
          .select('*, users(wallet_address, x_username, total_earned_lamports)')
          .order('created_at', { ascending: false });

        // Get users count
        const { count: totalUsers } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });

        const submissions = submissionsData || [];
        const totalSubmissions = submissions.length;
        const totalApproved = submissions.filter(s => s.status === 'approved' || s.status === 'paid').length;
        const pendingApproval = submissions.filter(s => s.status === 'pending').length;
        const pendingPayment = submissions.filter(s => s.status === 'approved').length;

        return NextResponse.json({
          success: true,
          data: {
            stats: {
              totalUsers: totalUsers || 0,
              totalSubmissions,
              totalApproved,
              pendingApproval,
              pendingPayment,
            },
            submissions,
          },
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
