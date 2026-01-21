import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Test route is working',
    timestamp: new Date().toISOString(),
    env: typeof window !== 'undefined' ? 'client' : 'server'
  });
}