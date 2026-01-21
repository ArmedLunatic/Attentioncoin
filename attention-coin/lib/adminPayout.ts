import {
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

import { getConnection } from "@/lib/solana";

export async function executeAdminPayout(
  adminKeypair: Keypair,
  payeePublicKey: PublicKey,
  lamports: number
) {
const connection = getConnection();

  const transaction = new Transaction();

  transaction.feePayer = adminKeypair.publicKey;

  const instruction = SystemProgram.transfer({
    fromPubkey: adminKeypair.publicKey,
    toPubkey: payeePublicKey,
    lamports,
  });

  transaction.add(instruction);

  const txid = await sendAndConfirmTransaction(
    connection,
    transaction,
    [adminKeypair]
  );

  return txid;
}
