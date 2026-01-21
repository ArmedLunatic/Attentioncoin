import { NextRequest, NextResponse } from 'next/server';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'default';

export async function GET() {
  return NextResponse.json({
    message: 'Test endpoint',
    adminPasswordSet: !!ADMIN_PASSWORD,
    adminPasswordLength: ADMIN_PASSWORD.length,
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    console.log('🔗 Received password:', password);
    console.log('🔗 Expected password:', ADMIN_PASSWORD);
    console.log('🔗 Password matches:', password === ADMIN_PASSWORD);

    const isValid = password === ADMIN_PASSWORD;

    return NextResponse.json({
      success: isValid,
      passwordLength: password.length,
      matches: isValid
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}