import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { PublicKey } from '@solana/web3.js';

/**
 * Validate a Solana address
 */
function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * GET /api/user/payout-address?username=<x_username>
 * Get the user's current payout address
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: user, error } = await supabase
      .from('users')
      .select('payout_address')
      .eq('x_username', username)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        payout_address: user.payout_address,
      },
    });
  } catch (error) {
    console.error('[Payout Address API] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/payout-address
 * Save or update the user's payout address
 * Body: { user_id: string, payout_address: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, payout_address } = body;

    // Validate required fields
    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!payout_address) {
      return NextResponse.json(
        { error: 'Payout address is required' },
        { status: 400 }
      );
    }

    // Validate Solana address format
    if (!isValidSolanaAddress(payout_address)) {
      return NextResponse.json(
        { error: 'Invalid Solana address format' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get user by ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 }
      );
    }

    // Update the payout address
    const { error: updateError } = await supabase
      .from('users')
      .update({ payout_address })
      .eq('id', user_id);

    if (updateError) {
      console.error('[Payout Address API] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update payout address' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        payout_address,
        message: 'Payout address saved successfully',
      },
    });
  } catch (error) {
    console.error('[Payout Address API] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
