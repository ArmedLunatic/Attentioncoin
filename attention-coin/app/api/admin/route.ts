import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

function verifyPassword(provided: string) {
  return provided?.trim() === ADMIN_PASSWORD.trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password, action, submissionId, engagementData, rejectionReason } = body;

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

        return NextResponse.json({
          success: true,
          data: {
            stats: {
              totalUsers: totalUsers || 0,
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

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
