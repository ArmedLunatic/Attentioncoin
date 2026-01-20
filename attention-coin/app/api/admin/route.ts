import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { timingSafeEqual } from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.error('ADMIN_PASSWORD environment variable is not set');
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

/**
 * Timing-safe password comparison to prevent timing attacks
 */
function verifyPassword(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;

  try {
    const providedBuffer = Buffer.from(provided.trim());
    const expectedBuffer = Buffer.from(expected.trim());

    if (providedBuffer.length !== expectedBuffer.length) {
      timingSafeEqual(expectedBuffer, expectedBuffer);
      return false;
    }

    return timingSafeEqual(providedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

    return timingSafeEqual(providedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, ...actionData } = body as {
      password: string;
      action: AdminAction['action'];
      submissionId?: string;
      engagementData?: AdminAction['engagementData'];
      rejectionReason?: string;
    };

    // Validate required fields
    if (!password) {
      return NextResponse.json(
        { error: 'Missing password' },
        { status: 400 }
      );
    }

    // Verify the password
    if (!ADMIN_PASSWORD || !verifyPassword(password, ADMIN_PASSWORD)) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid password' },
        { status: 403 }
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
        const likes = actionData.engagementData?.likes || 0;
        const reposts = actionData.engagementData?.reposts || 0;
        const replies = actionData.engagementData?.replies || 0;

        // Raw engagement (reposts still weighted 2x for reach)
        const rawEngagement = likes + (reposts * 2) + replies;

        // Logarithmic scaling: prevents runaway scores
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
          .select('*, users(wallet_address, x_username, total_earned_lamports, payout_address)')
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
