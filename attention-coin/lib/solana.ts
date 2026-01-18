import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import bs58 from 'bs58';

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

// Lazy connection instance
let _connection: Connection | null = null;

/**
 * Get Helius RPC connection
 */
export function getConnection(): Connection {
  if (!_connection) {
    _connection = new Connection(getHeliusRpcUrl(), 'confirmed');
  }
  return _connection;
}

/**
 * Get funding wallet keypair from environment
 */
export function getFundingKeypair(): Keypair {
  const privateKey = process.env.FUNDING_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('FUNDING_WALLET_PRIVATE_KEY is not set');
  }

  try {
    const decoded = bs58.decode(privateKey);
    return Keypair.fromSecretKey(decoded);
  } catch (error) {
    throw new Error('Invalid FUNDING_WALLET_PRIVATE_KEY format - must be base58 encoded');
  }
}

/**
 * Get funding wallet balance in lamports
 */
export async function getFundingBalance(): Promise<number> {
  const connection = getConnection();
  const keypair = getFundingKeypair();
  return connection.getBalance(keypair.publicKey);
}

/**
 * Send SOL transfer to a recipient
 * @param recipient - Recipient wallet address (base58)
 * @param lamports - Amount in lamports
 * @returns Transaction signature
 */
export async function sendSolTransfer(
  recipient: string,
  lamports: number
): Promise<string> {
  const connection = getConnection();
  const fundingKeypair = getFundingKeypair();

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

  // Create transaction
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fundingKeypair.publicKey,
      toPubkey: recipientPubkey,
      lamports,
    })
  );

  // Send and confirm
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [fundingKeypair],
    {
      commitment: 'confirmed',
      maxRetries: 3,
    }
  );

  return signature;
}

export interface TransferRequest {
  recipient: string;
  lamports: number;
  metadata?: Record<string, unknown>;
}

export interface TransferResult {
  recipient: string;
  lamports: number;
  success: boolean;
  signature?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Send batch SOL transfers with error handling
 * Each transfer is processed independently - failures don't affect others
 * @param transfers - Array of transfer requests
 * @returns Array of transfer results
 */
export async function sendBatchTransfers(
  transfers: TransferRequest[]
): Promise<TransferResult[]> {
  const results: TransferResult[] = [];

  for (const transfer of transfers) {
    try {
      const signature = await sendSolTransferWithRetry(
        transfer.recipient,
        transfer.lamports,
        3 // max retries
      );

      results.push({
        recipient: transfer.recipient,
        lamports: transfer.lamports,
        success: true,
        signature,
        metadata: transfer.metadata,
      });
    } catch (error) {
      results.push({
        recipient: transfer.recipient,
        lamports: transfer.lamports,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: transfer.metadata,
      });
    }
  }

  return results;
}

/**
 * Send SOL transfer with exponential backoff retry
 */
async function sendSolTransferWithRetry(
  recipient: string,
  lamports: number,
  maxRetries: number
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await sendSolTransfer(recipient, lamports);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      // Don't retry on validation errors
      if (lastError.message.includes('Invalid recipient') ||
          lastError.message.includes('must be positive')) {
        throw lastError;
      }

      // Exponential backoff: 1s, 2s, 4s
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Transfer failed after retries');
}

/**
 * Validate that funding wallet has sufficient balance
 * @param requiredLamports - Total lamports needed for transfers
 * @returns Object with validation result and current balance
 */
export async function validateFundingBalance(
  requiredLamports: number
): Promise<{ sufficient: boolean; balance: number; required: number }> {
  const balance = await getFundingBalance();
  // Add buffer for transaction fees (0.001 SOL per tx estimate)
  const feeBuffer = 0.001 * LAMPORTS_PER_SOL;
  return {
    sufficient: balance >= requiredLamports + feeBuffer,
    balance,
    required: requiredLamports,
  };
}

/**
 * Get Solana Explorer URL for a transaction
 */
export function getExplorerUrl(signature: string): string {
  const cluster = SOLANA_NETWORK === 'mainnet-beta' ? '' : `?cluster=${SOLANA_NETWORK}`;
  return `https://explorer.solana.com/tx/${signature}${cluster}`;
}
