import { NextResponse } from "next/server";
import { PublicKey, Keypair } from "@solana/web3.js";
import { executeAdminPayout } from "@/lib/adminPayout";

/**
 * POST /api/admin
 * Body: { payee: string, lamports: number }
 */
export async function POST(req: Request) {
  try {
    const { payee, lamports } = await req.json();

    if (!payee || !lamports) {
      return NextResponse.json(
        { error: "Missing payee or lamports" },
        { status: 400 }
      );
    }

    const adminKeypair = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(process.env.ADMIN_PRIVATE_KEY!))
    );

    const txid = await executeAdminPayout(
      adminKeypair,
      new PublicKey(payee),
      lamports
    );

    return NextResponse.json({ txid });
  } catch (err: any) {
    console.error("Admin payout failed:", err);
    return NextResponse.json(
      { error: err?.message ?? "Admin payout failed" },
      { status: 500 }
    );
  }
}
