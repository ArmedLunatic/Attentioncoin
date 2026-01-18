import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { generateVerificationCode } from '@/lib/utils';

/**
 * POST /api/verify-x - Generate verification code
 * Stores the code in the database with expiration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet } = body;

    // Validate required fields
    if (!wallet) {
      return NextResponse.json(
        { error: 'Missing wallet address' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get or create user
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('id, x_verified_at')
      .eq('wallet_address', wallet)
      .single();

    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create one
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({ wallet_address: wallet })
        .select('id, x_verified_at')
        .single();

      if (createError) {
        console.error('Error creating user:', createError);
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        );
      }
      user = newUser;
    } else if (userError) {
      console.error('Error fetching user:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user' },
        { status: 500 }
      );
    }

    // Check if already verified
    if (user?.x_verified_at) {
      return NextResponse.json(
        { error: 'X account already verified' },
        { status: 400 }
      );
    }

    // Generate verification code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store code in database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        verification_code: code,
        verification_expires: expiresAt.toISOString(),
      })
      .eq('id', user?.id);

    if (updateError) {
      console.error('Error storing verification code:', updateError);
      return NextResponse.json(
        { error: 'Failed to generate verification code' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        code,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Verify-x generate error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/verify-x - Confirm verification with username
 * Validates the code hasn't expired and marks user as verified
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet, username } = body;

    // Validate required fields
    if (!wallet || !username) {
      return NextResponse.json(
        { error: 'Missing required fields: wallet, username' },
        { status: 400 }
      );
    }

    // Validate username format
    const cleanUsername = username.replace('@', '').trim();
    if (!cleanUsername || cleanUsername.length < 1 || cleanUsername.length > 50) {
      return NextResponse.json(
        { error: 'Invalid username format' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get user with verification code
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, verification_code, verification_expires, x_verified_at')
      .eq('wallet_address', wallet)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found. Please generate a verification code first.' },
        { status: 404 }
      );
    }

    // Check if already verified
    if (user.x_verified_at) {
      return NextResponse.json(
        { error: 'X account already verified' },
        { status: 400 }
      );
    }

    // Check if verification code exists
    if (!user.verification_code) {
      return NextResponse.json(
        { error: 'No verification code found. Please generate a new code.' },
        { status: 400 }
      );
    }

    // Check if code has expired
    if (user.verification_expires && new Date(user.verification_expires) < new Date()) {
      return NextResponse.json(
        { error: 'Verification code has expired. Please generate a new code.' },
        { status: 400 }
      );
    }

    // Check if username is already taken by another user
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('x_username', cleanUsername)
      .neq('id', user.id)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'This X username is already linked to another wallet' },
        { status: 400 }
      );
    }

    // Mark user as verified
    const { error: updateError } = await supabase
      .from('users')
      .update({
        x_username: cleanUsername,
        x_verified_at: new Date().toISOString(),
        verification_code: null, // Clear the code after use
        verification_expires: null,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error verifying user:', updateError);
      return NextResponse.json(
        { error: 'Failed to verify account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        username: cleanUsername,
        verifiedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Verify-x confirm error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
