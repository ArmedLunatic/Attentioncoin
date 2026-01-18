'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Copy, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4">Admin Access Required</h1>
          <p className="text-xl">Please connect your wallet to access the admin panel</p>
        </div>
      </div>
    );
  }

  if (publicKey.toBase58() !== ADMIN_WALLET) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h1 className="text-4xl font-bold mb-4">Not Authorized</h1>
          <p className="text-xl">This wallet is not authorized to access the admin panel</p>
          <p className="text-gray-300 mt-2">Connected: {publicKey.toBase58().slice(0, 8)}...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" />
          <p className="text-xl">Loading admin data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Admin Dashboard</h1>

        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-8 text-red-200">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
            <p className="text-gray-300 text-sm">Total Users</p>
            <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
            <p className="text-gray-300 text-sm">Total Submissions</p>
            <p className="text-3xl font-bold text-white">{stats.totalSubmissions}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
            <p className="text-gray-300 text-sm">Pending Approval</p>
            <p className="text-3xl font-bold text-yellow-400">{stats.pendingApproval}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setTab('dashboard')}
            className={`px-6 py-2 rounded-lg font-semibold transition ${
              tab === 'dashboard'
                ? 'bg-blue-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setTab('submissions')}
            className={`px-6 py-2 rounded-lg font-semibold transition ${
              tab === 'submissions'
                ? 'bg-blue-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Submissions ({stats.pendingApproval})
          </button>
          <button
            onClick={() => setTab('payout')}
            className={`px-6 py-2 rounded-lg font-semibold transition ${
              tab === 'payout'
                ? 'bg-blue-500 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Payouts
          </button>
        </div>

        {/* Dashboard Tab */}
        {tab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
              <h3 className="text-xl font-semibold text-white mb-4">Overview</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-gray-300">
                  <span>Total Approved:</span>
                  <span className="text-green-400">{stats.totalApproved}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Pending Payment:</span>
                  <span className="text-yellow-400">{stats.pendingPayment}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Total Paid (SOL):</span>
                  <span className="text-blue-400">{(stats.totalPaid / 1000000000).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submissions Tab */}
        {tab === 'submissions' && (
          <div>
            {selectedSubmission ? (
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 border border-white/20">
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="mb-6 text-blue-400 hover:text-blue-300"
                >
                  &larr; Back to Submissions
                </button>

                <div className="space-y-6">
                  <div>
                    <p className="text-gray-400 text-sm">Tweet Content</p>
                    <p className="text-white text-lg mt-2">{selectedSubmission.tweet_text}</p>
                  </div>

                  <div>
                    <p className="text-gray-400 text-sm">Tweet URL</p>
                    <a
                      href={selectedSubmission.tweet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      View Tweet
                    </a>
                  </div>

                  <div>
                    <p className="text-gray-400 text-sm mb-4">Engagement Numbers (from Twitter)</p>
                    <div className="grid grid-cols-3 gap-4">
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
                        className="bg-white/10 border border-white/20 rounded p-3 text-white placeholder-gray-400"
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
                        className="bg-white/10 border border-white/20 rounded p-3 text-white placeholder-gray-400"
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
                        className="bg-white/10 border border-white/20 rounded p-3 text-white placeholder-gray-400"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => approveSubmission(selectedSubmission.id)}
                      disabled={actionLoading === selectedSubmission.id}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2"
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
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2"
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
              <div className="space-y-4">
                {submissions
                  .filter((s) => s.status === 'pending')
                  .map((submission) => (
                    <div
                      key={submission.id}
                      className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20 hover:border-blue-400 transition cursor-pointer"
                      onClick={() => setSelectedSubmission(submission)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-white font-semibold">@{submission.users?.x_username || 'Unknown'}</p>
                          <p className="text-gray-300 text-sm mt-2">{submission.tweet_text}</p>
                        </div>
                        <span className="bg-yellow-500/20 text-yellow-300 text-xs px-3 py-1 rounded-full">
                          Pending
                        </span>
                      </div>
                      <p className="text-blue-400 text-sm mt-4">Click to review</p>
                    </div>
                  ))}
                {submissions.filter((s) => s.status === 'pending').length === 0 && (
                  <div className="text-center text-gray-400 py-12">
                    No pending submissions
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Payout Tab */}
        {tab === 'payout' && (
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 border border-white/20">
            <h3 className="text-xl font-semibold text-white mb-6">Pending Payments</h3>
            <div className="space-y-4">
              {submissions
                .filter((s) => s.status === 'approved')
                .map((submission) => (
                  <div
                    key={submission.id}
                    className="flex justify-between items-center bg-white/5 p-4 rounded-lg border border-white/10"
                  >
                    <div>
                      <p className="text-white font-semibold">@{submission.users?.x_username || 'Unknown'}</p>
                      <p className="text-gray-400 text-sm">
                        {((submission.users?.total_earned_lamports || 0) / 1000000000).toFixed(4)} SOL earned
                      </p>
                    </div>
                    <button
                      onClick={() => markAsPaid(submission.id)}
                      disabled={actionLoading === submission.id}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
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
                <div className="text-center text-gray-400 py-12">
                  No pending payments
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
