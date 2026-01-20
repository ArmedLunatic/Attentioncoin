import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

function verifyPassword(provided: string) {
  return provided.trim() === ADMIN_PASSWORD.trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password, action, submissionId, engagementData, rejectionReason } = body;

    if (!password || !verifyPassword(password)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabase = createServerClient();

    if (action === 'getStats') {
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
          totalUsers,
          submissions: submissions || [],
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

