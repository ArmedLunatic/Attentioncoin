import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction
} from '@solana/web3.js';

// Network configuration
const SOLANA_NETWORK = process.env.SOLANA_NETWORK || 'devnet';

function getHeliusRpcUrl(): string {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) {
    throw new Error('HELIUS_API_KEY is not set');
  }

  const network = SOLANA_NETWORK === 'mainnet-beta' ? 'mainnet' : 'devnet';
  return `https://${network}.helius-rpc.com/?api-key=${apiKey}`;
}

/**
 * Get Helius RPC connection
 */
export function getConnection(): Connection {
  return new Connection(getHeliusRpcUrl(), 'confirmed');
}

/**
 * Get Solana Explorer URL for a transaction
 */
export function getExplorerUrl(signature: string): string {
  const cluster = SOLANA_NETWORK === 'mainnet-beta' ? '' : `?cluster=${SOLANA_NETWORK}`;
  return `https://explorer.solana.com/tx/${signature}${cluster}`;
}

/**
 * Create and sign a SOL transfer transaction using Phantom wallet
 * @param recipient - Recipient wallet address (base58)
 * @param lamports - Amount in lamports
 * @returns Transaction signature
 */
export async function createAndSendSimpleTransfer(
  recipient: string,
  lamports: number
): Promise<string> {
  if (typeof window === 'undefined' || !(window as any).solana) {
    throw new Error('Phantom wallet not available');
  }

  const phantom = (window as any).solana;
  const connection = getConnection();

  // Validate recipient address
  let recipientPubkey: PublicKey;
  try {
    recipientPubkey = new PublicKey(recipient);
  } catch {
    throw new Error(`Invalid recipient address: ${recipient}`);
  }

  // Validate amount
  if (lamports <= 0) {
    throw new Error('Transfer amount must be positive');
  }

  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

  // Create transaction
  const transaction = new Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer: phantom.publicKey,
  }).add(
    SystemProgram.transfer({
      fromPubkey: phantom.publicKey,
      toPubkey: recipientPubkey,
      lamports,
    })
  );

  // Sign transaction with Phantom wallet
  const signedTransaction = await phantom.signTransaction(transaction);

  // Send and confirm transaction
  const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });

  // Wait for confirmation
  const confirmation = await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight,
  }, 'confirmed');

  if (confirmation.value.err) {
    throw new Error(`Transaction failed: ${confirmation.value.err}`);
  }

  return signature;
}

/**
 * Get wallet balance in lamports
 */
export async function getSimpleWalletBalance(): Promise<number> {
  if (typeof window === 'undefined' || !(window as any).solana) {
    throw new Error('Phantom wallet not available');
  }

  const phantom = (window as any).solana;
  const connection = getConnection();
  return connection.getBalance(phantom.publicKey);
}

/**
 * Validate that admin wallet has sufficient balance
 * @param requiredLamports - Total lamports needed for transfers
 * @returns Object with validation result and current balance
 */
export async function validateSimpleWalletBalance(
  requiredLamports: number
): Promise<{ sufficient: boolean; balance: number; required: number }> {
  const balance = await getSimpleWalletBalance();
  // Add buffer for transaction fees (0.001 SOL per tx estimate)
  const feeBuffer = 0.001 * LAMPORTS_PER_SOL;
  return {
    sufficient: balance >= requiredLamports + feeBuffer,
    balance,
    required: requiredLamports,
  };
}