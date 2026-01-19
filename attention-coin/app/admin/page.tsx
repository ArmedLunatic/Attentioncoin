'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import bs58 from 'bs58';

export default function AdminPage() {
  const { publicKey, signMessage } = useWallet();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSubmissions: 0,
    totalApproved: 0,
    totalPaid: 0,
    pendingApproval: 0,
    pendingPayment: 0,
  });
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [tab, setTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [engagementData, setEngagementData] = useState({
    likes: 0,
    reposts: 0,
    replies: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const ADMIN_WALLET = process.env.NEXT_PUBLIC_ADMIN_WALLET;

  const callAdminApi = useCallback(async (action: string, data: Record<string, any> = {}) => {
    if (!publicKey || !signMessage) {
      throw new Error('Wallet not connected');
    }

    const timestamp = Date.now();
    const message = `admin:${action}:${timestamp}`;

    // Sign the message with wallet
    const encodedMessage = new TextEncoder().encode(message);
    const signatureBytes = await signMessage(encodedMessage);
    const signature = bs58.encode(signatureBytes);

    const response = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet: publicKey.toBase58(),
        signature,
        timestamp,
        action,
        ...data,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'API request failed');
    }

    return result;
  }, [publicKey, signMessage]);

  const loadData = useCallback(async () => {
    if (!publicKey || publicKey.toBase58() !== ADMIN_WALLET) {
      setLoading(false);
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
    } finally {
      setLoading(false);
    }
  }, [publicKey, ADMIN_WALLET, callAdminApi]);

  useEffect(() => {
    if (!publicKey) {
      setLoading(false);
      return;
    }

    if (publicKey.toBase58() !== ADMIN_WALLET) {
      setLoading(false);
      return;
    }

    loadData();
  }, [publicKey, ADMIN_WALLET, loadData]);

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

  if (!publicKey) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-light border border-border flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-muted" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3">Admin Access Required</h1>
          <p className="text-muted-light">Please connect your wallet to access the admin panel</p>
        </div>
      </div>
    );
  }

  if (publicKey.toBase58() !== ADMIN_WALLET) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3">Not Authorized</h1>
          <p className="text-muted-light mb-2">This wallet is not authorized to access the admin panel</p>
          <p className="text-muted font-mono text-sm">Connected: {publicKey.toBase58().slice(0, 8)}...</p>
        </div>
      </div>
    );
  }

  if (loading) {
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
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-8">Admin Dashboard</h1>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-8">
            <p className="font-semibold text-red-400">Error</p>
            <p className="text-red-300 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Stats Grid - premium styling */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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
        </div>

        {/* Tabs - premium styling */}
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
            <h3 className="text-lg font-semibold mb-6">Pending Payments</h3>
            <div className="space-y-3">
              {submissions
                .filter((s) => s.status === 'approved')
                .map((submission) => (
                  <div
                    key={submission.id}
                    className="flex justify-between items-center bg-surface-light/50 p-4 rounded-xl border border-border"
                  >
                    <div>
                      <p className="font-medium">@{submission.users?.x_username || 'Unknown'}</p>
                      <p className="text-muted text-sm mt-0.5">
                        {((submission.users?.total_earned_lamports || 0) / 1000000000).toFixed(4)} SOL earned
                      </p>
                    </div>
                    <button
                      onClick={() => markAsPaid(submission.id)}
                      disabled={actionLoading === submission.id}
                      className="bg-primary hover:bg-primary-light disabled:bg-primary-dim disabled:cursor-not-allowed text-black px-4 py-2.5 rounded-xl transition-colors font-medium flex items-center gap-2"
                    >
                      {actionLoading === submission.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Mark Paid'
                      )}
                    </button>
                  </div>
                ))}
              {submissions.filter((s) => s.status === 'approved').length === 0 && (
                <div className="text-center py-16 bg-surface/50 rounded-2xl border border-border border-dashed">
                  <CheckCircle className="w-10 h-10 text-muted mx-auto mb-3" />
                  <p className="text-muted">No pending payments</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
