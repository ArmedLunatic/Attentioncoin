// Format SOL amount
export function formatSol(lamports: number): string {
  const sol = lamports / 1e9;
  if (sol >= 1000) {
    return `${(sol / 1000).toFixed(1)}K`;
  }
  if (sol >= 1) {
    return sol.toFixed(2);
  }
  return sol.toFixed(4);
}

// Format large numbers
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

// Truncate wallet address
export function truncateWallet(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

// Extract tweet ID from URL
export function extractTweetId(url: string): string | null {
  // Handles:
  // https://twitter.com/user/status/1234567890
  // https://x.com/user/status/1234567890
  // https://twitter.com/user/status/1234567890?s=20
  const patterns = [
    /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/,
    /(?:twitter\.com|x\.com)\/\w+\/statuses\/(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

// Generate verification code
export function generateVerificationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate content hash for duplicate detection
export function generateContentHash(text: string): string {
  // Normalize: lowercase, remove URLs, mentions, extra spaces
  const normalized = text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '')
    .replace(/@\w+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Simple hash
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

// Time ago formatter
export function timeAgo(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return then.toLocaleDateString();
}

// Calculate score (simplified client-side version)
export function calculateScore(submission: {
  likes: number;
  reposts: number;
  replies: number;
  quotes: number;
  views: number;
}, weights = {
  like: 1,
  repost: 3,
  reply: 2,
  quote: 4,
  view: 0.001,
}): number {
  return (
    submission.likes * weights.like +
    submission.reposts * weights.repost +
    submission.replies * weights.reply +
    submission.quotes * weights.quote +
    submission.views * weights.view
  );
}

// Check if wallet is admin
export function isAdminWallet(wallet: string | null): boolean {
  if (!wallet) return false;
  const adminWallet = process.env.NEXT_PUBLIC_ADMIN_WALLET;
  return wallet.toLowerCase() === adminWallet?.toLowerCase();
}

// Validate tweet URL
export function isValidTweetUrl(url: string): boolean {
  return /^https?:\/\/(twitter\.com|x\.com)\/\w+\/status\/\d+/.test(url);
}

// Days since date
export function daysSince(date: string | Date): number {
  const now = new Date();
  const then = new Date(date);
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

// Contract address and cashtag
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 'YOUR_CA_HERE';
export const CASHTAG = process.env.NEXT_PUBLIC_CASHTAG || '$ATTENTION';
