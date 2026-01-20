import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { generateVerificationCode } from '@/lib/utils';

/**
 * POST /api/verify-x - Generate verification code
 * For new users who want to verify their X account
 * Body: { username: string }
 */
export async function POST(request: NextRequest) {
  console.log('[verify-x] POST request received');

  try {
    const body = await request.json();
    const { username } = body;
    console.log('[verify-x] Username:', username);

    // Validate required fields
    if (!username) {
      return NextResponse.json(
        { error: 'Missing username' },
        { status: 400 }
      );
    }

    // Clean the username
    const cleanUsername = username.replace('@', '').trim();
    if (!cleanUsername || cleanUsername.length < 1 || cleanUsername.length > 50) {
      return NextResponse.json(
        { error: 'Invalid username format' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check if username is already taken
    let { data: existingUser, error: existingError } = await supabase
      .from('users')
      .select('id, x_verified_at')
      .eq('x_username', cleanUsername)
      .single();

    console.log('[verify-x] Existing user lookup:', { existingUser, error: existingError?.message });

    if (existingUser) {
      // User with this X username already exists
      if (existingUser.x_verified_at) {
        return NextResponse.json(
          { error: 'This X username is already verified. Please login instead.' },
          { status: 400 }
        );
      }
      // User exists but not verified - generate new code
    }

    // Generate verification code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    console.log('[verify-x] Generated code:', code);

    if (existingUser) {
      // Update existing user with new verification code
      const { error: updateError } = await supabase
        .from('users')
        .update({
          verification_code: code,
          verification_expires: expiresAt.toISOString(),
        })
        .eq('id', existingUser.id);

      if (updateError) {
        console.error('[verify-x] Error updating verification code:', updateError);
        return NextResponse.json(
          { error: `Failed to generate verification code: ${updateError.message}` },
          { status: 500 }
        );
      }
    } else {
      // Create new user with the X username and verification code
      // Use a placeholder wallet_address since we no longer require it
      const placeholderWallet = `x_${cleanUsername}_${Date.now()}`;

      const { error: createError } = await supabase
        .from('users')
        .insert({
          wallet_address: placeholderWallet, // Placeholder - will be replaced by payout_address
          x_username: cleanUsername,
          verification_code: code,
          verification_expires: expiresAt.toISOString(),
        });

      if (createError) {
        console.error('[verify-x] Error creating user:', createError);
        return NextResponse.json(
          { error: `Failed to create user: ${createError.message}` },
          { status: 500 }
        );
      }
    }

    console.log('[verify-x] Code stored successfully');
    return NextResponse.json({
      success: true,
      data: {
        code,
        expiresAt: expiresAt.toISOString(),
        username: cleanUsername,
      },
    });
  } catch (error) {
    console.error('[verify-x] Generate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/verify-x - Confirm verification
 * Marks the user as verified after they've posted the verification tweet
 * Body: { username: string }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = body;

    // Validate required fields
    if (!username) {
      return NextResponse.json(
        { error: 'Missing username' },
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
      .eq('x_username', cleanUsername)
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

    // Rate limiting: Require minimum time between code generation and verification
    // This slows down automated abuse attempts
    // NOTE: Production should add X API tweet search validation for full security
    const codeGeneratedAt = new Date(user.verification_expires).getTime() - (24 * 60 * 60 * 1000); // expires is 24h after generation
    const now = Date.now();
    const minWaitTime = 30 * 1000; // 30 seconds minimum

    if (now - codeGeneratedAt < minWaitTime) {
      return NextResponse.json(
        { error: 'Please wait at least 30 seconds after generating code before verifying' },
        { status: 400 }
      );
    }

    // Mark user as verified
    const { error: updateError } = await supabase
      .from('users')
      .update({
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
