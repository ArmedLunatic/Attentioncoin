'use client';

import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Loader2, Wallet } from 'lucide-react';
import bs58 from 'bs58';

// Get the correct Helius RPC URL based on network
function getHeliusRpcUrl(): string {
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';
  const apiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;

  // Use mainnet or devnet based on env
  const rpcNetwork = network === 'mainnet-beta' ? 'mainnet' : 'devnet';

  if (apiKey) {
    return `https://${rpcNetwork}.helius-rpc.com/?api-key=${apiKey}`;
  }

  // Fallback to public RPC if no API key (not recommended for production)
  return network === 'mainnet-beta'
    ? 'https://api.mainnet-beta.solana.com'
    : 'https://api.devnet.solana.com';
}

// Add global type for Phantom wallet
declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      publicKey?: { toString: () => string; toBytes: () => Uint8Array };
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
      on: (event: string, callback: () => void) => void;
      off: (event: string, callback: () => void) => void;
    };
    solanaWeb3: any;
  }
}

export default function AdminPage() {
  // Client-side mount state
  const [isMounted, setIsMounted] = useState(false);
  const [phantomInstalled, setPhantomInstalled] = useState(false);

  // Wallet-based authentication state
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletPublicKey, setWalletPublicKey] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [connecting, setConnecting] = useState(false);
  const [authChecking, setAuthChecking] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Dashboard state
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSubmissions: 0,
    totalApproved: 0,
    totalPaid: 0,
    pendingApproval: 0,
    pendingPayment: 0,
    fundingBalance: 0,
  });
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [aggregatedPayouts, setAggregatedPayouts] = useState<any[]>([]);
  const [tab, setTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [engagementData, setEngagementData] = useState({
    likes: 0,
    reposts: 0,
    replies: 0,
  });
  const [error, setError] = useState<string | null>(null);

  /**
   * Sign a message with Phantom wallet and call admin API
   */
  const callAdminApi = useCallback(async (action: string, data: Record<string, any> = {}) => {
    if (!window.solana?.publicKey) {
      throw new Error('Wallet not connected');
    }

    const publicKey = window.solana.publicKey.toString();
    const submissionId = data.submissionId || '';
    const message = `admin-action-${action}-${submissionId}`;

    // Sign the message with Phantom
    const encodedMessage = new TextEncoder().encode(message);
    const signedMessage = await window.solana.signMessage(encodedMessage);
    const signature = bs58.encode(signedMessage.signature);

    const response = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        signature,
        publicKey,
        ...data,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'API request failed');
    }

    return result;
  }, []);

  /**
   * Verify wallet is in admin allowlist
   */
  const verifyAdminAccess = useCallback(async () => {
    if (!window.solana?.publicKey) {
      return false;
    }

    setAuthChecking(true);
    setAuthError(null);

    try {
      // Try to call getStats - if successful, wallet is admin
      const result = await callAdminApi('getStats');
      if (result.success) {
        setIsAdmin(true);
        setStats(result.data.stats);
        setSubmissions(result.data.submissions);
        return true;
      }
      return false;
    } catch (err: any) {
      const errorMsg = err.message || 'Access denied';
      if (errorMsg.includes('Unauthorized') || errorMsg.includes('403')) {
        setAuthError('This wallet is not in the admin allowlist.');
      } else if (errorMsg.includes('Invalid signature') || errorMsg.includes('401')) {
        setAuthError('Signature verification failed. Please try again.');
      } else {
        setAuthError(errorMsg);
      }
      setIsAdmin(false);
      return false;
    } finally {
      setAuthChecking(false);
    }
  }, [callAdminApi]);

  /**
   * Connect to Phantom wallet
   */
  const connectWallet = async () => {
    if (!window.solana?.isPhantom) {
      window.open('https://phantom.app', '_blank');
      return;
    }

    setConnecting(true);
    setAuthError(null);

    try {
      const response = await window.solana.connect();
      const pubKey = response.publicKey.toString();
      setWalletConnected(true);
      setWalletPublicKey(pubKey);

      // Get wallet balance
      await updateWalletBalance(pubKey);

      // Verify admin access
      await verifyAdminAccess();
    } catch (err: any) {
      console.error('Failed to connect wallet:', err);
      setAuthError(err.message || 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  };

  /**
   * Disconnect wallet and log out
   */
  const disconnectWallet = async () => {
    if (window.solana) {
      try {
        await window.solana.disconnect();
      } catch (err) {
        console.error('Error disconnecting:', err);
      }
    }
    setWalletConnected(false);
    setWalletPublicKey(null);
    setIsAdmin(false);
    setWalletBalance(0);
    setAuthError(null);
  };

  /**
   * Update wallet balance
   */
  const updateWalletBalance = async (publicKey: string) => {
    try {
      const connection = new (window as any).solanaWeb3.Connection(
        getHeliusRpcUrl(),
        'confirmed'
      );
      const pubKey = new (window as any).solanaWeb3.PublicKey(publicKey);
      const balance = await connection.getBalance(pubKey);
      setWalletBalance(balance);
    } catch (err) {
      console.error('Failed to get balance:', err);
    }
  };

  /**
   * Load dashboard data
   */
  const loadData = useCallback(async () => {
    if (!isAdmin || !walletConnected) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [statsResult, payoutsResult] = await Promise.all([
        callAdminApi('getStats'),
        callAdminApi('getAggregatedPayouts')
      ]);

      if (statsResult.success) {
        setStats(statsResult.data.stats);
        setSubmissions(statsResult.data.submissions);
      }

      if (payoutsResult.success) {
        setAggregatedPayouts(payoutsResult.data);
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load data');
      // If unauthorized, reset admin state
      if (err.message?.includes('Unauthorized') || err.message?.includes('403')) {
        setIsAdmin(false);
        setAuthError('Session expired. Please reconnect your wallet.');
      }
    } finally {
      setLoading(false);
    }
  }, [isAdmin, walletConnected, callAdminApi]);

  // Check wallet connection on mount
  useEffect(() => {
    setIsMounted(true);

    const checkConnection = async () => {
      // Check if Phantom is installed
      const hasPhantom = !!(window.solana?.isPhantom);
      setPhantomInstalled(hasPhantom);

      if (hasPhantom && window.solana?.publicKey) {
        const pubKey = window.solana.publicKey.toString();
        setWalletConnected(true);
        setWalletPublicKey(pubKey);
        await updateWalletBalance(pubKey);
        await verifyAdminAccess();
      }
    };

    // Wait for Phantom to inject
    const timer = setTimeout(checkConnection, 100);
    return () => clearTimeout(timer);
  }, [verifyAdminAccess]);

  // Listen for account changes
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined' || !window.solana) return;

    const handleAccountChange = () => {
      if (window.solana?.publicKey) {
        const pubKey = window.solana.publicKey.toString();
        setWalletPublicKey(pubKey);
        updateWalletBalance(pubKey);
        verifyAdminAccess();
      } else {
        disconnectWallet();
      }
    };

    window.solana.on('accountChanged', handleAccountChange);
    return () => {
      window.solana?.off('accountChanged', handleAccountChange);
    };
  }, [isMounted, verifyAdminAccess]);

  // Load data when admin is verified
  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, loadData]);

  async function approveSubmission(submissionId: string) {
    try {
      setActionLoading(submissionId);
      setError(null);

      await callAdminApi('approve', {
        submissionId,
        engagementData,
      });

      setSelectedSubmission(null);
      setEngagementData({ likes: 0, reposts: 0, replies: 0 });
      await loadData();
    } catch (err: any) {
      console.error('Error approving submission:', err);
      setError(err.message || 'Failed to approve submission');
    } finally {
      setActionLoading(null);
    }
  }

  async function rejectSubmission(submissionId: string) {
    try {
      setActionLoading(submissionId);
      setError(null);

      await callAdminApi('reject', { submissionId });

      setSelectedSubmission(null);
      await loadData();
    } catch (err: any) {
      console.error('Error rejecting submission:', err);
      setError(err.message || 'Failed to reject submission');
    } finally {
      setActionLoading(null);
    }
  }

  async function executeAggregatePayout(userId: string, aggregatedData: any) {
    try {
      setActionLoading(`aggregate-${userId}`);
      setError(null);

      if (!window.solana?.publicKey) {
        throw new Error('Wallet not connected. Please reconnect your Phantom wallet.');
      }

      // Get payout details from API
      const result = await callAdminApi('executeAggregatePayout', { userId });

      if (!result.success) {
        throw new Error(result.error || 'Failed to prepare aggregate payout');
      }

      const { data } = result;

      // Validate admin wallet balance with buffer
      const requiredLamports = data.amountLamports;
      const feeBuffer = 2000000; // 0.002 SOL buffer for fees
      if (walletBalance < requiredLamports + feeBuffer) {
        throw new Error(`Insufficient wallet balance. Have ${(walletBalance / 1000000000).toFixed(4)} SOL, need ${((requiredLamports + feeBuffer) / 1000000000).toFixed(4)} SOL (includes fees)`);
      }

      // Execute client-side transfer - this will trigger Phantom popup
      const connection = new (window as any).solanaWeb3.Connection(
        getHeliusRpcUrl(),
        'confirmed'
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      const transaction = new (window as any).solanaWeb3.Transaction({
        blockhash,
        lastValidBlockHeight,
        feePayer: window.solana.publicKey,
      }).add(
        (window as any).solanaWeb3.SystemProgram.transfer({
          fromPubkey: window.solana.publicKey,
          toPubkey: new (window as any).solanaWeb3.PublicKey(data.recipient),
          lamports: data.amountLamports,
        })
      );

      // Add timeout to wallet signing
      const signingTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Wallet signing timeout. Please try again.')), 60000);
      });

      // Sign transaction with Phantom wallet
      const signedTransaction = await Promise.race([
        (async () => {
          // Sign the transaction with Phantom
          return await (window.solana as any).signTransaction(transaction);
        })(),
        signingTimeout
      ]) as any;

      const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });

      // Confirm transaction with timeout
      const confirmationTimeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Transaction confirmation timeout. Please check the transaction manually.')), 30000);
      });

      await Promise.race([
        connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight,
        }),
        confirmationTimeout
      ]);

      // Record completed transaction
      const recordResult = await callAdminApi('recordAggregatePayout', {
        signature,
        amount: data.amount,
        recipient: data.recipient,
        username: data.username,
        userId,
        submissionIds: data.submissionIds
      });

      if (recordResult.success) {
        // Refresh data to reflect the payment
        await loadData();

        // Update wallet balance
        if (walletPublicKey) {
          await updateWalletBalance(walletPublicKey);
        }

        // Open explorer in new tab for verification
        if (recordResult.data.explorerUrl) {
          window.open(recordResult.data.explorerUrl, '_blank');
        }

        alert(`Successfully paid ${data.amount} SOL to @${data.username} for ${data.submissionCount} submissions!`);
      } else {
        throw new Error(recordResult.error || 'Failed to record payment');
      }
    } catch (err: any) {
      console.error('Error executing aggregate payout:', err);
      const errorMessage = err.message || 'Failed to execute aggregate payout';
      setError(errorMessage);
      alert(`Payment failed: ${errorMessage}`);

      // Refresh wallet balance on error
      if (walletPublicKey) {
        await updateWalletBalance(walletPublicKey);
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function markAsPaid(submissionId: string) {
    try {
      setActionLoading(submissionId);
      setError(null);

      await callAdminApi('markPaid', { submissionId });

      await loadData();
    } catch (err: any) {
      console.error('Error marking as paid:', err);
      setError(err.message || 'Failed to mark as paid');
    } finally {
      setActionLoading(null);
    }
  }

  // Show loading state before client-side mount
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-muted-light">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // Wallet connection screen (not connected or not admin)
  if (!walletConnected || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-surface-light border border-border flex items-center justify-center mx-auto mb-6">
              <Wallet className="w-8 h-8 text-muted" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-3">Admin Access</h1>
            <p className="text-muted-light">
              {walletConnected
                ? 'Verifying admin wallet...'
                : 'Connect your admin wallet to continue'}
            </p>
          </div>

          {authError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-400">Access Denied</p>
                  <p className="text-red-300 text-sm mt-1">{authError}</p>
                </div>
              </div>
            </div>
          )}

          {walletConnected && walletPublicKey && (
            <div className="bg-surface/80 border border-border rounded-xl p-4 mb-6">
              <p className="text-sm text-muted mb-1">Connected Wallet</p>
              <p className="font-mono text-sm">
                {walletPublicKey.slice(0, 8)}...{walletPublicKey.slice(-8)}
              </p>
              <p className="text-xs text-muted mt-2">
                Balance: {(walletBalance / 1000000000).toFixed(4)} SOL
              </p>
            </div>
          )}

          <div className="space-y-3">
            {!walletConnected ? (
              <button
                onClick={connectWallet}
                disabled={connecting}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="w-5 h-5" />
                    Connect Phantom Wallet
                  </>
                )}
              </button>
            ) : authChecking ? (
              <div className="flex items-center justify-center gap-2 py-3 text-muted">
                <Loader2 className="w-5 h-5 animate-spin" />
                Verifying admin access...
              </div>
            ) : (
              <>
                <button
                  onClick={verifyAdminAccess}
                  disabled={authChecking}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Retry Verification
                </button>
                <button
                  onClick={disconnectWallet}
                  className="w-full py-2.5 text-sm text-muted hover:text-white transition-colors"
                >
                  Disconnect Wallet
                </button>
              </>
            )}
          </div>

          {!phantomInstalled && (
            <p className="text-center text-sm text-muted mt-6">
              Don&apos;t have Phantom?{' '}
              <a
                href="https://phantom.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Install it here
              </a>
            </p>
          )}
        </div>
      </div>
    );
  }

  if (loading && submissions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-muted-light">Loading admin data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-6 sm:py-10 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Admin Dashboard</h1>
          <button
            onClick={disconnectWallet}
            className="text-sm text-muted hover:text-white transition-colors"
          >
            Disconnect
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-8">
            <p className="font-semibold text-red-400">Error</p>
            <p className="text-red-300 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-surface/80 border border-border rounded-2xl p-5 sm:p-6 hover:border-border-light transition-all duration-200">
            <p className="text-muted text-sm mb-1">Total Users</p>
            <p className="text-2xl sm:text-3xl font-bold">{stats.totalUsers}</p>
          </div>
          <div className="bg-surface/80 border border-border rounded-2xl p-5 sm:p-6 hover:border-border-light transition-all duration-200">
            <p className="text-muted text-sm mb-1">Total Submissions</p>
            <p className="text-2xl sm:text-3xl font-bold">{stats.totalSubmissions}</p>
          </div>
          <div className="bg-surface/80 border border-border rounded-2xl p-5 sm:p-6 hover:border-border-light transition-all duration-200">
            <p className="text-muted text-sm mb-1">Pending Approval</p>
            <p className="text-2xl sm:text-3xl font-bold text-yellow-400">{stats.pendingApproval}</p>
          </div>
          <div className="bg-surface/80 border border-border rounded-2xl p-5 sm:p-6 hover:border-border-light transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-muted text-sm">Admin Wallet</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-xs text-green-400 font-medium">CONNECTED</span>
              </div>
            </div>
            <p className="text-lg font-bold mb-1">
              {walletPublicKey
                ? `${walletPublicKey.slice(0, 4)}...${walletPublicKey.slice(-4)}`
                : 'Not Connected'
              }
            </p>
            <p className="text-xs text-muted">
              Balance: {(walletBalance / 1000000000).toFixed(4)} SOL
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 sm:gap-3 mb-8 flex-wrap">
          <button
            onClick={() => setTab('dashboard')}
            className={`px-4 sm:px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${
              tab === 'dashboard'
                ? 'bg-primary text-black'
                : 'bg-surface-light border border-border text-muted hover:text-white hover:border-border-light'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setTab('submissions')}
            className={`px-4 sm:px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${
              tab === 'submissions'
                ? 'bg-primary text-black'
                : 'bg-surface-light border border-border text-muted hover:text-white hover:border-border-light'
            }`}
          >
            Submissions ({stats.pendingApproval})
          </button>
          <button
            onClick={() => setTab('payout')}
            className={`px-4 sm:px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${
              tab === 'payout'
                ? 'bg-primary text-black'
                : 'bg-surface-light border border-border text-muted hover:text-white hover:border-border-light'
            }`}
          >
            Payouts
          </button>
        </div>

        {/* Dashboard Tab */}
        {tab === 'dashboard' && (
          <div className="bg-surface/80 border border-border rounded-2xl p-6 sm:p-8">
            <h3 className="text-lg font-semibold mb-6">Recent Activity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-surface-light/50 rounded-xl p-5 border border-border">
                <p className="text-muted text-sm mb-2">Approved Submissions</p>
                <p className="text-3xl font-bold text-green-400">{stats.totalApproved}</p>
              </div>
              <div className="bg-surface-light/50 rounded-xl p-5 border border-border">
                <p className="text-muted text-sm mb-2">Paid Out</p>
                <p className="text-3xl font-bold text-blue-400">{stats.totalPaid}</p>
              </div>
              <div className="bg-surface-light/50 rounded-xl p-5 border border-border">
                <p className="text-muted text-sm mb-2">Pending Payment</p>
                <p className="text-3xl font-bold text-yellow-400">{stats.pendingPayment}</p>
              </div>
              <div className="bg-surface-light/50 rounded-xl p-5 border border-border">
                <p className="text-muted text-sm mb-2">Funding Balance</p>
                <p className="text-3xl font-bold">{(stats.fundingBalance / 1000000000).toFixed(4)} SOL</p>
              </div>
            </div>
          </div>
        )}

        {/* Submissions Tab */}
        {tab === 'submissions' && (
          <div className="bg-surface/80 border border-border rounded-2xl p-6 sm:p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Pending Submissions</h3>
              <button
                onClick={loadData}
                disabled={loading}
                className="text-sm text-muted hover:text-white transition-colors flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Refresh
              </button>
            </div>

            <div className="space-y-4">
              {submissions
                .filter((s) => s.status === 'pending')
                .map((submission) => (
                  <div
                    key={submission.id}
                    className="bg-surface-light/50 p-5 rounded-xl border border-border hover:border-border-light transition-all"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-medium">@{submission.users?.x_username || 'Unknown'}</p>
                        <a
                          href={submission.tweet_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          View Tweet
                        </a>
                      </div>
                      <span className="bg-yellow-500/10 text-yellow-400 text-xs px-2 py-1 rounded-full font-medium">
                        PENDING
                      </span>
                    </div>

                    {selectedSubmission?.id === submission.id ? (
                      <div className="mt-4 space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm text-muted mb-1">Likes</label>
                            <input
                              type="number"
                              value={engagementData.likes}
                              onChange={(e) => setEngagementData({...engagementData, likes: parseInt(e.target.value) || 0})}
                              className="input-dark w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-muted mb-1">Reposts</label>
                            <input
                              type="number"
                              value={engagementData.reposts}
                              onChange={(e) => setEngagementData({...engagementData, reposts: parseInt(e.target.value) || 0})}
                              className="input-dark w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-muted mb-1">Replies</label>
                            <input
                              type="number"
                              value={engagementData.replies}
                              onChange={(e) => setEngagementData({...engagementData, replies: parseInt(e.target.value) || 0})}
                              className="input-dark w-full"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => approveSubmission(submission.id)}
                            disabled={actionLoading === submission.id}
                            className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                            {actionLoading === submission.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => rejectSubmission(submission.id)}
                            disabled={actionLoading === submission.id}
                            className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                            {actionLoading === submission.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <AlertCircle className="w-4 h-4" />
                            )}
                            Reject
                          </button>
                          <button
                            onClick={() => {
                              setSelectedSubmission(null);
                              setEngagementData({ likes: 0, reposts: 0, replies: 0 });
                            }}
                            className="px-4 py-2 text-muted hover:text-white transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedSubmission(submission)}
                        className="mt-3 text-sm text-primary hover:underline"
                      >
                        Review Submission
                      </button>
                    )}
                  </div>
                ))}
              {submissions.filter((s) => s.status === 'pending').length === 0 && (
                <div className="text-center py-16 bg-surface/50 rounded-2xl border border-border border-dashed">
                  <CheckCircle className="w-10 h-10 text-muted mx-auto mb-3" />
                  <p className="text-muted">No pending submissions</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payout Tab */}
        {tab === 'payout' && (
          <div className="bg-surface/80 border border-border rounded-2xl p-6 sm:p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold">Aggregated Payouts</h3>
                <p className="text-sm text-muted mt-1">Total SOL owed per user across all approved submissions</p>
              </div>
              <div className="text-sm text-muted">
                Click &apos;Pay&apos; to send SOL instantly
              </div>
            </div>

            <div className="space-y-4">
              {aggregatedPayouts.length > 0 ? (
                aggregatedPayouts.map((payout: any) => {
                  const amountSol = payout.totalAmountLamports / 1000000000;
                  const loadingId = `aggregate-${payout.userId}`;

                  return (
                    <div
                      key={payout.userId}
                      className="bg-surface-light/50 p-5 rounded-xl border border-border hover:border-border-light transition-all"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <p className="font-medium text-lg">@{payout.username}</p>
                            <span className="bg-green-500/10 text-green-400 text-xs px-2 py-1 rounded-full font-medium">
                              {payout.submissionCount} submissions
                            </span>
                          </div>
                          <p className="text-muted text-sm">
                            Total score: {payout.totalScore.toFixed(0)}
                          </p>
                          <p className="text-xs text-muted mt-1">
                            {payout.payoutAddress.slice(0, 8)}...{payout.payoutAddress.slice(-8)}
                          </p>
                        </div>

                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-400">{amountSol.toFixed(4)} SOL</p>
                          <p className="text-xs text-muted mt-1">Total amount owed</p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => executeAggregatePayout(payout.userId, payout)}
                            disabled={actionLoading === loadingId}
                            className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                          >
                            {actionLoading === loadingId ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Paying...
                              </>
                            ) : (
                              <>
                                Pay {amountSol.toFixed(4)} SOL
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-16 bg-surface/50 rounded-2xl border border-border border-dashed">
                  <CheckCircle className="w-10 h-10 text-muted mx-auto mb-3" />
                  <p className="text-muted">No approved payouts</p>
                  <p className="text-muted text-sm mt-2">Approve submissions first to enable payouts</p>
                </div>
              )}
            </div>

            {/* Legacy Individual Submissions Section */}
            <div className="mt-12">
              <div className="border-t border-border/50 pt-6">
                <h4 className="text-md font-semibold mb-4 text-muted">Individual Submissions (Legacy View)</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {submissions
                    .filter((s) => s.status === 'approved')
                    .map((submission) => {
                      const calculatedAmount = ((submission.final_score || 0) * 1000000) / 1000000000;

                      return (
                        <div
                          key={submission.id}
                          className="bg-surface/30 p-3 rounded-lg border border-border/50 text-sm"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-medium">@{submission.users?.x_username || 'Unknown'}</span>
                              <span className="text-muted ml-2">{calculatedAmount.toFixed(4)} SOL</span>
                            </div>
                            <span className="text-xs text-muted bg-surface/50 px-2 py-1 rounded">
                              Score: {submission.final_score?.toFixed(0)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  {submissions.filter((s) => s.status === 'approved').length === 0 && (
                    <p className="text-center text-muted text-sm py-4">No approved submissions</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
