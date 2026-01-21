'use client';

import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Loader2, Lock, Wallet } from 'lucide-react';
import { useAdminWallet } from '@/contexts/AdminWalletContext';
import { useSimpleWallet } from '@/hooks/useSimpleWallet';
import { 
  createAndSendSimpleTransfer, 
  validateSimpleWalletBalance, 
  getSimpleWalletBalance,
  getExplorerUrl
} from '@/lib/simple-wallet';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
  const [loginError, setLoginError] = useState<string | null>(null);
  const [customPayoutAmount, setCustomPayoutAmount] = useState<string>('');
  const [adminWalletBalance, setAdminWalletBalance] = useState<number>(0);

  // Store password in session for subsequent API calls
  const [storedPassword, setStoredPassword] = useState<string | null>(null);

  // Admin wallet context - only works on admin page
  const { isAdminWallet } = useAdminWallet();
  const simpleWallet = useSimpleWallet();

  const callAdminApi = useCallback(async (action: string, data: Record<string, any> = {}) => {
    if (!storedPassword) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: storedPassword,
        action,
        ...data,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'API request failed');
    }

    return result;
  }, [storedPassword]);

  const loadData = useCallback(async () => {
    if (!isAuthenticated || !storedPassword) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await callAdminApi('getStats');

      if (result.success) {
        setStats(result.data.stats);
        setSubmissions(result.data.submissions);
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load data');
      // If unauthorized, log out
      if (err.message?.includes('Unauthorized')) {
        setIsAuthenticated(false);
        setStoredPassword(null);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, storedPassword, callAdminApi]);

  // Load data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  // Update admin wallet balance when connected
  useEffect(() => {
    if (simpleWallet.connected && simpleWallet.publicKey) {
      const updateBalance = async () => {
        try {
          // Create a simple wallet object for the balance function
          const walletObj = { publicKey: { toBase58: () => simpleWallet.publicKey } } as any;
          const balance = await getSimpleWalletBalance();
          setAdminWalletBalance(balance);
        } catch (err) {
          console.error('Failed to get admin wallet balance:', err);
        }
      };

      updateBalance();
      
      // Set up interval to update balance
      const interval = setInterval(updateBalance, 10000); // Update every 10 seconds
      
      return () => clearInterval(interval);
    } else {
      setAdminWalletBalance(0);
    }
  }, [simpleWallet.connected, simpleWallet.publicKey]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoading(true);

    try {
      // Test the password by making an API call
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          action: 'getStats',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Invalid password');
      }

      // Password is correct
      setStoredPassword(password);
      setIsAuthenticated(true);
      // Store admin authentication in sessionStorage for wallet context
      sessionStorage.setItem('admin_authenticated', 'true');
      setStats(result.data.stats);
      setSubmissions(result.data.submissions);
      setPassword(''); // Clear the password field
    } catch (err: any) {
      setLoginError(err.message || 'Invalid password');
    } finally {
      setLoading(false);
    }
  };

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

  async function executePayout(submissionId: string, amount?: number) {
    try {
      setActionLoading(submissionId);
      setError(null);

      if (!simpleWallet.connected || !simpleWallet.publicKey) {
        throw new Error('Admin wallet not connected');
      }

      // First get payout details from API
      const result = await callAdminApi('executePayout', { 
        submissionId,
        payoutAmount: amount 
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to prepare payout');
      }

      const { data } = result;

      // Check if client-side signing is required
      if (result.clientSideRequired) {
        // Validate admin wallet balance
        const balanceValidation = await validateSimpleWalletBalance(
          data.amountLamports
        );

        if (!balanceValidation.sufficient) {
          throw new Error(`Insufficient admin wallet balance. Have ${(balanceValidation.balance / 1000000000).toFixed(4)} SOL, need ${(balanceValidation.required / 1000000000).toFixed(4)} SOL`);
        }

        // Execute client-side transfer - this will trigger Phantom popup
        const signature = await createAndSendSimpleTransfer(
          data.recipient,
          data.amountLamports
        );

        // Record the completed transaction
        const recordResult = await callAdminApi('recordPayout', {
          submissionId,
          signature,
          amount: data.amount,
          recipient: data.recipient,
          username: data.username
        });

        if (recordResult.success) {
          // Update the data to reflect the payment
          await loadData();
          
          // Open explorer in new tab for verification
          if (recordResult.data.explorerUrl) {
            window.open(recordResult.data.explorerUrl, '_blank');
          }
        }
      } else {
        // Fallback to server-side (shouldn't happen with new implementation)
        if (data.explorerUrl) {
          window.open(data.explorerUrl, '_blank');
        }
        await loadData();
      }
    } catch (err: any) {
      console.error('Error executing payout:', err);
      setError(err.message || 'Failed to execute payout');
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

  // Login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-surface-light border border-border flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 text-muted" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-3">Admin Access</h1>
            <p className="text-muted-light">Enter your admin password to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm text-muted mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-dark w-full"
                placeholder="Enter admin password"
                autoFocus
              />
            </div>

            {loginError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <p className="text-red-400 text-sm">{loginError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                'Login'
              )}
            </button>
          </form>
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
            onClick={() => {
              setIsAuthenticated(false);
              setStoredPassword(null);
              sessionStorage.removeItem('admin_authenticated');
            }}
            className="text-sm text-muted hover:text-white transition-colors"
          >
            Logout
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
              {simpleWallet.connected && simpleWallet.publicKey ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs text-green-400 font-medium">SECURED</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-xs text-red-400 font-medium">UNSECURED</span>
                </div>
              )}
            </div>
            <p className="text-lg font-bold mb-1">
              {simpleWallet.publicKey 
                ? `${simpleWallet.publicKey.slice(0, 4)}...${simpleWallet.publicKey.slice(-4)}`
                : 'Not Connected'
              }
            </p>
            <p className="text-xs text-muted">
              Balance: {(adminWalletBalance / 1000000000).toFixed(4)} SOL
            </p>
            {!simpleWallet.connected && (
              <p className="text-xs text-yellow-400 mt-1">Connect wallet to enable payouts</p>
            )}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface/80 border border-border rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-5">Overview</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted">Total Approved</span>
                  <span className="text-green-400 font-medium">{stats.totalApproved}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted">Pending Payment</span>
                  <span className="text-yellow-400 font-medium">{stats.pendingPayment}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted">Total Paid (SOL)</span>
                  <span className="text-primary font-medium">{(stats.totalPaid / 1000000000).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submissions Tab */}
        {tab === 'submissions' && (
          <div>
            {selectedSubmission ? (
              <div className="bg-surface/80 border border-border rounded-2xl p-6 sm:p-8">
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="mb-6 text-primary hover:text-primary-light transition-colors text-sm font-medium"
                >
                  &larr; Back to Submissions
                </button>

                <div className="space-y-6">
                  <div>
                    <p className="text-muted text-sm mb-2">Tweet Content</p>
                    <p className="text-white text-base leading-relaxed">{selectedSubmission.tweet_text}</p>
                  </div>

                  <div>
                    <p className="text-muted text-sm mb-2">Tweet URL</p>
                    <a
                      href={selectedSubmission.tweet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary-light transition-colors"
                    >
                      View Tweet &rarr;
                    </a>
                  </div>

                  <div>
                    <p className="text-muted text-sm mb-4">Engagement Numbers (from Twitter)</p>
                    <div className="grid grid-cols-3 gap-3 sm:gap-4">
                      <input
                        type="number"
                        placeholder="Likes"
                        value={engagementData.likes}
                        onChange={(e) =>
                          setEngagementData({
                            ...engagementData,
                            likes: parseInt(e.target.value) || 0,
                          })
                        }
                        className="input-dark"
                      />
                      <input
                        type="number"
                        placeholder="Reposts"
                        value={engagementData.reposts}
                        onChange={(e) =>
                          setEngagementData({
                            ...engagementData,
                            reposts: parseInt(e.target.value) || 0,
                          })
                        }
                        className="input-dark"
                      />
                      <input
                        type="number"
                        placeholder="Replies"
                        value={engagementData.replies}
                        onChange={(e) =>
                          setEngagementData({
                            ...engagementData,
                            replies: parseInt(e.target.value) || 0,
                          })
                        }
                        className="input-dark"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 sm:gap-4 pt-2">
                    <button
                      onClick={() => approveSubmission(selectedSubmission.id)}
                      disabled={actionLoading === selectedSubmission.id}
                      className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      {actionLoading === selectedSubmission.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        'Approve'
                      )}
                    </button>
                    <button
                      onClick={() => rejectSubmission(selectedSubmission.id)}
                      disabled={actionLoading === selectedSubmission.id}
                      className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      {actionLoading === selectedSubmission.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        'Reject'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions
                  .filter((s) => s.status === 'pending')
                  .map((submission) => (
                    <div
                      key={submission.id}
                      className="bg-surface/80 border border-border rounded-2xl p-5 sm:p-6 hover:border-border-light transition-all duration-200 cursor-pointer"
                      onClick={() => setSelectedSubmission(submission)}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">@{submission.users?.x_username || 'Unknown'}</p>
                          <p className="text-muted text-sm mt-2 line-clamp-2">{submission.tweet_text}</p>
                        </div>
                        <span className="bg-yellow-500/10 text-yellow-400 text-xs px-3 py-1.5 rounded-full font-medium flex-shrink-0">
                          Pending
                        </span>
                      </div>
                      <p className="text-primary text-sm mt-4 font-medium">Click to review &rarr;</p>
                    </div>
                  ))}
                {submissions.filter((s) => s.status === 'pending').length === 0 && (
                  <div className="text-center py-16 bg-surface/50 rounded-2xl border border-border border-dashed">
                    <CheckCircle className="w-10 h-10 text-muted mx-auto mb-3" />
                    <p className="text-muted">No pending submissions</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Payout Tab */}
        {tab === 'payout' && (
          <div className="bg-surface/80 border border-border rounded-2xl p-6 sm:p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Approved Payouts</h3>
              <div className="text-sm text-muted">
                {simpleWallet.connected 
                  ? "Click 'Pay' to send SOL instantly" 
                  : "Connect admin wallet to enable payouts"
                }
              </div>
            </div>

            {/* Admin Wallet Status */}
            <div className="mb-6 p-4 bg-surface-light/50 rounded-xl border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-muted" />
                  <div>
                    <p className="text-sm font-medium">Admin Wallet Status</p>
                    <p className="text-xs text-muted">
                      {simpleWallet.publicKey 
                        ? `Connected: ${simpleWallet.publicKey.slice(0, 6)}...${simpleWallet.publicKey.slice(-4)}`
                        : 'No wallet connected'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {simpleWallet.connected ? (
                    <>
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-xs text-green-400 font-medium">CONNECTED</span>
                      <span className="text-xs text-muted ml-2">
                        {(adminWalletBalance / 1000000000).toFixed(4)} SOL
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      <span className="text-xs text-red-400 font-medium">NOT CONNECTED</span>
                      <button
                        onClick={simpleWallet.connect}
                        disabled={simpleWallet.connecting}
                        className="ml-2 bg-primary text-black px-3 py-1 text-xs rounded-lg font-semibold hover:bg-primary/80 disabled:opacity-50"
                      >
                        {simpleWallet.connecting ? 'Connecting...' : 'Connect'}
                      </button>
                    </>
                  )}
                </div>
              </div>
              {!simpleWallet.connected && (
                <p className="text-xs text-yellow-400 mt-1">Connect wallet to enable payouts</p>
              )}
            </div>
            
            <div className="space-y-3">
              {submissions
                .filter((s) => s.status === 'approved')
                .map((submission) => {
                  const calculatedAmount = ((submission.final_score || 0) * 1000000) / 1000000000; // Convert score to SOL
                  const displayAmount = customPayoutAmount || calculatedAmount.toFixed(4);
                  
                  return (
                    <div
                      key={submission.id}
                      className="bg-surface-light/50 p-4 rounded-xl border border-border"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <p className="font-medium">@{submission.users?.x_username || 'Unknown'}</p>
                            <span className="bg-green-500/10 text-green-400 text-xs px-2 py-1 rounded-full font-medium">
                              Approved
                            </span>
                          </div>
                          <p className="text-muted text-sm">
                            Score: {submission.final_score || 0} → Est: {calculatedAmount.toFixed(4)} SOL
                          </p>
                          {submission.users?.payout_address && (
                            <p className="text-xs text-muted mt-1">
                              Payout: {submission.users.payout_address.slice(0, 6)}...{submission.users.payout_address.slice(-4)}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex flex-col justify-between">
                          <div>
                            <label className="text-xs text-muted mb-1 block">Custom Amount (SOL)</label>
                            <input
                              type="number"
                              step="0.001"
                              min="0.001"
                              max="10"
                              placeholder={calculatedAmount.toFixed(4)}
                              value={customPayoutAmount}
                              onChange={(e) => setCustomPayoutAmount(e.target.value)}
                              className="input-dark text-sm"
                            />
                          </div>
                          
                           <div className="flex gap-2 mt-3">
                             <button
                               onClick={() => executePayout(submission.id, parseFloat(displayAmount))}
                               disabled={
                                 actionLoading === submission.id || 
                                 parseFloat(displayAmount) <= 0 ||
                                 !simpleWallet.connected
                               }
                               className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-semibold py-2 rounded-xl transition-colors flex items-center justify-center gap-2"
                             >
                               {actionLoading === submission.id ? (
                                 <>
                                   <Loader2 className="w-4 h-4 animate-spin" />
                                   Paying...
                                 </>
                               ) : !simpleWallet.connected ? (
                                 <>
                                   <Wallet className="w-4 h-4" />
                                   Connect Wallet
                                 </>
                               ) : (
                                 <>
                                   Pay {displayAmount} SOL
                                 </>
                               )}
                             </button>
                            
                            <button
                              onClick={() => markAsPaid(submission.id)}
                              disabled={actionLoading === submission.id}
                              className="bg-surface border border-border hover:border-border-light text-muted px-3 py-2 rounded-xl transition-colors font-medium"
                              title="Mark as paid without sending SOL"
                            >
                              Skip
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              {submissions.filter((s) => s.status === 'approved').length === 0 && (
                <div className="text-center py-16 bg-surface/50 rounded-2xl border border-border border-dashed">
                  <CheckCircle className="w-10 h-10 text-muted mx-auto mb-3" />
                  <p className="text-muted">No approved payouts</p>
                  <p className="text-muted text-sm mt-2">Approve submissions first to enable payouts</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
