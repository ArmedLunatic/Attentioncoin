'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/lib/supabase';
import { User } from '@/types';
import { Copy, CheckCircle, AlertCircle } from 'lucide-react';

export default function AdminPage() {
  const { publicKey } = useWallet();
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
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [engagementData, setEngagementData] = useState({
    likes: 0,
    reposts: 0,
    replies: 0,
  });

  const ADMIN_WALLET = process.env.NEXT_PUBLIC_ADMIN_WALLET;

  useEffect(() => {
    if (!publicKey) {
      setLoading(false);
      return;
    }

    if (publicKey.toString() !== ADMIN_WALLET) {
      setLoading(false);
      return;
    }

    loadData();
  }, [publicKey]);

  async function loadData() {
    try {
      setLoading(true);

      // Get submissions with user data
      const { data: submissionsData } = await supabase
        .from('submissions')
        .select('*, user_id, users(username, wallet_address, total_earned_lamports)')
        .order('created_at', { ascending: false });

      // Get users
      const { data: usersData } = await supabase
        .from('users')
        .select('*') as { data: User[] | null };

      // Calculate stats
      const totalUsers = usersData?.length || 0;
      const totalSubmissions = submissionsData?.length || 0;
      const totalApproved = submissionsData?.filter((s: any) => s.status === 'approved').length || 0;
      const pendingApproval = submissionsData?.filter((s: any) => s.status === 'pending').length || 0;
      const pendingPayment = submissionsData?.filter((s: any) => s.status === 'approved' && !s.paid).length || 0;

      const totalPaid = usersData?.reduce((sum, u) => sum + (u.total_earned_lamports || 0), 0) || 0;

      setStats({
        totalUsers,
        totalSubmissions,
        totalApproved,
        totalPaid,
        pendingApproval,
        pendingPayment,
      });

      setSubmissions(submissionsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function approveSubmission(submissionId: string) {
    try {
      const { error } = await supabase
        .from('submissions')
        .update({
          status: 'approved',
          engagement_likes: engagementData.likes,
          engagement_reposts: engagementData.reposts,
          engagement_replies: engagementData.replies,
        })
        .eq('id', submissionId);

      if (error) throw error;

      setSelectedSubmission(null);
      setEngagementData({ likes: 0, reposts: 0, replies: 0 });
      loadData();
    } catch (error) {
      console.error('Error approving submission:', error);
      alert('Failed to approve submission');
    }
  }

  async function rejectSubmission(submissionId: string) {
    try {
      const { error } = await supabase
        .from('submissions')
        .update({ status: 'rejected' })
        .eq('id', submissionId);

      if (error) throw error;

      setSelectedSubmission(null);
      loadData();
    } catch (error) {
      console.error('Error rejecting submission:', error);
      alert('Failed to reject submission');
    }
  }

  async function markAsPaid(submissionId: string) {
    try {
      const { error } = await supabase
        .from('submissions')
        .update({ paid: true })
        .eq('id', submissionId);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error marking as paid:', error);
      alert('Failed to mark as paid');
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

  if (publicKey.toString() !== ADMIN_WALLET) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h1 className="text-4xl font-bold mb-4">Not Authorized</h1>
          <p className="text-xl">This wallet is not authorized to access the admin panel</p>
          <p className="text-gray-300 mt-2">Connected: {publicKey.toString().slice(0, 8)}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Admin Dashboard</h1>

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
                  ← Back to Submissions
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
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => rejectSubmission(selectedSubmission.id)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions
                  .filter((s: any) => s.status === 'pending')
                  .map((submission) => (
                    <div
                      key={submission.id}
                      className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20 hover:border-blue-400 transition cursor-pointer"
                      onClick={() => setSelectedSubmission(submission)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-white font-semibold">@{submission.users?.username}</p>
                          <p className="text-gray-300 text-sm mt-2">{submission.tweet_text}</p>
                        </div>
                        <span className="bg-yellow-500/20 text-yellow-300 text-xs px-3 py-1 rounded-full">
                          Pending
                        </span>
                      </div>
                      <p className="text-blue-400 text-sm mt-4">Click to review</p>
                    </div>
                  ))}
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
                .filter((s: any) => s.status === 'approved' && !s.paid)
                .map((submission) => (
                  <div
                    key={submission.id}
                    className="flex justify-between items-center bg-white/5 p-4 rounded-lg border border-white/10"
                  >
                    <div>
                      <p className="text-white font-semibold">@{submission.users?.username}</p>
                      <p className="text-gray-400 text-sm">
                        {(submission.users?.total_earned_lamports / 1000000000 || 0).toFixed(2)} SOL
                      </p>
                    </div>
                    <button
                      onClick={() => markAsPaid(submission.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
                    >
                      Mark Paid
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}