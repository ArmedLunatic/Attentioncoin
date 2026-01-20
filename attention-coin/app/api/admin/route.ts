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
 * Timing-safe password comparison
 */
function verifyPassword(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  return provided.trim() === expected.trim();
}

  try {
    const a = Buffer.from(provided.trim());
    const b = Buffer.from(expected.trim());

    if (a.length !== b.length) {
      timingSafeEqual(b, b);
      return false;
    }

    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, ...actionData } = body;

    if (!password) {
      return NextResponse.json({ error: 'Missing password' }, { status: 400 });
    }

    if (!ADMIN_PASSWORD || !verifyPassword(password, ADMIN_PASSWORD)) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid password' },
        { status: 403 }
      );
    }

    const supabase = createServerClient();

    switch (actionData.action) {
      case 'approve': {
        if (!actionData.submissionId) {
          return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 });
        }

        const likes = actionData.engagementData?.likes || 0;
        const reposts = actionData.engagementData?.reposts || 0;
        const replies = actionData.engagementData?.replies || 0;

        const raw = likes + reposts * 2 + replies;
        const finalScore =
          raw > 0 ? Math.round(Math.log10(raw + 1) * 100) / 10 : 0;

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
          return NextResponse.json({ error: 'Approve failed' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
      }

      case 'reject': {
        if (!actionData.submissionId) {
          return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 });
        }

        await supabase
          .from('submissions')
          .update({
            status: 'rejected',
            rejection_reason: actionData.rejectionReason || null,
          })
          .eq('id', actionData.submissionId);

        return NextResponse.json({ success: true });
      }

      case 'markPaid': {
        if (!actionData.submissionId) {
          return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 });
        }

        await supabase
          .from('submissions')
          .update({ status: 'paid' })
          .eq('id', actionData.submissionId);

        return NextResponse.json({ success: true });
      }

      case 'getStats': {
        const { data: submissions } = await supabase
          .from('submissions')
          .select('*, users(x_username, payout_address)')
          .order('created_at', { ascending: false });

        return NextResponse.json({
          success: true,
          submissions: submissions || [],
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
