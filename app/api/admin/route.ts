import { NextRequest } from 'next/server';
import { Keypair } from '@solana/web3.js';
import * as adminPayout from '../../../lib/adminPayout';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { lamports, payeePublicKey } = body;
  
  // Load admin keypair from env
  const adminKeypair = Keypair.fromSecretKey(Buffer.from(process.env.ADMIN_SECRET_KEY as string, 'hex'));

  try {
    await adminPayout.executeAdminPayout(adminKeypair, payeePublicKey, lamports);
    return new Response(JSON.stringify({ message: "Payout successful" }), { status: 200 });
  } catch (error) {
    console.error('Failed to send payout: ', error);
    return new Response(JSON<｜begin▁of▁sentence｜>.stringify({ message: "Failed to send payout", error }), { status: 500 });
  }
}
