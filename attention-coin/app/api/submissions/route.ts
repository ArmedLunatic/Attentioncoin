import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

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

// GET - fetch submissions (public, no auth needed)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    const supabase = createServerClient();

    let query = supabase
      .from('submissions')
      .select('*, users(wallet_address, x_username, x_display_name, x_profile_image)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching submissions:', error);
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Submissions GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - create new submission (requires wallet signature)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet, signature, timestamp, tweetUrl, tweetId, tweetText } = body;

    // Validate required fields
    if (!wallet || !signature || !timestamp || !tweetUrl || !tweetId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check timestamp (5 minute window)
    const now = Date.now();
    if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Request expired' }, { status: 401 });
    }

    // Verify signature
    const message = `submit:${tweetId}:${timestamp}`;
    if (!verifySignature(message, signature, wallet)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Get or create user
    let { data: user } = await supabase
      .from('users')
      .select('id, status')
      .eq('wallet_address', wallet)
      .single();

    if (!user) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({ wallet_address: wallet })
        .select('id, status')
        .single();

      if (createError) {
        console.error('Error creating user:', createError);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }
      user = newUser;
    }

    // Check if user is blacklisted/suspended
    if (user.status === 'blacklisted' || user.status === 'suspended') {
      return NextResponse.json({ error: 'Account is suspended' }, { status: 403 });
    }

    // Check for duplicate tweet
    const { data: existing } = await supabase
      .from('submissions')
      .select('id')
      .eq('tweet_id', tweetId)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Tweet already submitted' }, { status: 409 });
    }

    // Create submission
    const { data: submission, error } = await supabase
      .from('submissions')
      .insert({
        user_id: user.id,
        tweet_id: tweetId,
        tweet_url: tweetUrl,
        tweet_text: tweetText || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating submission:', error);
      return NextResponse.json({ error: 'Failed to create submission' }, { status: 500 });
    }

    // Update user submission count
    await supabase.rpc('increment_user_submissions', { user_wallet: wallet });

    return NextResponse.json({ success: true, data: submission });
  } catch (error) {
    console.error('Submissions POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
