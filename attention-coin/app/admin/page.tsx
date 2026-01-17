'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Shield,
  Users,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  RefreshCw,
  ExternalLink,
  Ban,
  Eye,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { useUser } from '@/components/WalletProvider';
import { supabase } from '@/lib/supabase';
import { isAdminWallet, formatNumber, truncateWallet, timeAgo, formatSol } from '@/lib/utils';
import type { Submission, User } from '@/types';

// Stats Card
function StatCard({ label, value, icon: Icon, color }: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-sm text-muted">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

// Submission Review Card
function SubmissionReviewCard({ 
  submission, 
  onApprove, 
  onReject,
  loading 
}: {
  submission: Submission & { user?: User };
  onApprove: (id: string, engagement: { likes: number; reposts: number; replies: number }) => void;
  onReject: (id: string, reason: string) => void;
  loading: boolean;
}) {
  const [engagement, setEngagement] = useState({
    likes: submission.likes || 0,
    reposts: submission.reposts || 0,
    replies: submission.replies || 0,
  });
  const [rejectionReason, setRejectionReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  return (
    <div className="p-4 rounded-xl bg-surface border border-border">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-bold">
              {(submission.user?.x_username || 'U').charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="font-medium">
              {submission.user?.x_username ? `@${submission.user.x_username}` : 'Unknown'}
            </div>
            <div className="text-xs text-muted">
              {truncateWallet(submission.user?.wallet_address || '')}
            </div>
          </div>
        </div>
        <a
          href={submission.tweet_url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary text-sm py-2 flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" />
          View Tweet
        </a>
      </div>

      {/* Tweet Content */}
      <div className="p-3 rounded-lg bg-surface-light border border-border mb-4">
        <p className="text-sm text-muted">
          {submission.tweet_text || 'Tweet content not yet fetched'}
        </p>
      </div>

      {/* Engagement Inputs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-xs text-muted block mb-1">Likes</label>
          <input
            type="number"
            value={engagement.likes}
            onChange={(e) => setEngagement({ ...engagement, likes: parseInt(e.target.value) || 0 })}
            className="input-dark w-full text-sm py-2"
          />
        </div>
        <div>
          <label className="text-xs text-muted block mb-1">Reposts</label>
          <input
            type="number"
            value={engagement.reposts}
            onChange={(e) => setEngagement({ ...engagement, reposts: parseInt(e.target.value) || 0 })}
            className="input-dark w-full text-sm py-2"
          />
        </div>
        <div>
          <label className="text-xs text-muted block mb-1">Replies</label>
          <input
            type="number"
            value={engagement.replies}
            onChange={(e) => setEngagement({ ...engagement, replies: parseInt(e.target.value) || 0 })}
            className="input-dark w-full text-sm py-2"
          />
        </div>
      </div>

      {/* Rejection Reason */}
      {showReject && (
        <div className="mb-4">
          <label className="text-xs text-muted block mb-1">Rejection Reason</label>
          <input
            type="text"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Enter reason..."
            className="input-dark w-full text-sm py-2"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onApprove(submission.id, engagement)}
          disabled={loading}
          className="btn-primary flex-1 py-2 text-sm flex items-center justify-center gap-1"
        >
          <CheckCircle2 className="w-4 h-4" />
          Approve
        </button>
        {showReject ? (
          <button
            onClick={() => {
              if (rejectionReason.trim()) {
                onReject(submission.id, rejectionReason);
              } else {
                toast.error('Please enter a rejection reason');
              }
            }}
            disabled={loading}
            className="bg-red-500/20 text-red-400 border border-red-500/30 flex-1 py-2 text-sm rounded-lg flex items-center justify-center gap-1"
          >
            <XCircle className="w-4 h-4" />
            Confirm Reject
          </button>
        ) : (
          <button
            onClick={() => setShowReject(true)}
            className="btn-secondary flex-1 py-2 text-sm flex items-center justify-center gap-1"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </button>
        )}
      </div>

      {/* Meta */}
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted">
        <span>Submitted {timeAgo(submission.created_at)}</span>
        <span>ID: {submission.tweet_id}</span>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { publicKey, connected } = useWallet();
  const { user, loading: userLoading } = useUser();
  
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'users' | 'export'>('pending');
  const [submissions, setSubmissions] = useState<(Submission & { user?: User })[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSubmissions: 0,
    pendingSubmissions: 0,
    approvedSubmissions: 0,
    totalPaidOut: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Check admin access
  useEffect(() => {
    if (!userLoading && (!connected || !isAdminWallet(publicKey?.toBase58() || null))) {
      toast.error('Admin access required');
      router.push('/');
    }
  }, [connected, publicKey, userLoading, router]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch stats
      const [
        { count: totalUsers },
        { count: totalSubmissions },
        { count: pendingSubmissions },
        { count: approvedSubmissions },
        { data: usersData },
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('submissions').select('*', { count: 'exact', head: true }),
        supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('submissions').select('*', { count: 'exact', head: true }).in('status', ['approved', 'paid']),
        supabase.from('users').select('total_earned_lamports'),
      ]);

      const totalPaid = usersData?.reduce((sum, u) => sum + (u.total_earned_lamports || 0), 0) || 0;

      setStats({
        totalUsers: totalUsers || 0,
        totalSubmissions: totalSubmissions || 0,
        pendingSubmissions: pendingSubmissions || 0,
        approvedSubmissions: approvedSubmissions || 0,
        totalPaidOut: totalPaid,
      });

      // Fetch submissions based on tab
      const status = activeTab === 'approved' ? 'approved' : 'pending';
      if (activeTab !== 'users' && activeTab !== 'export') {
        const { data: submissionsData } = await supabase
          .from('submissions')
          .select('*, user:users(*)')
          .eq('status', status)
          .order('created_at', { ascending: false })
          .limit(50);

        setSubmissions(submissionsData || []);
      }

      // Fetch users
      if (activeTab === 'users') {
        const { data: allUsers } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        setUsers(allUsers || []);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (isAdminWallet(publicKey?.toBase58() || null)) {
      fetchData();
    }
  }, [fetchData, publicKey]);

  // Approve submission
  const handleApprove = async (id: string, engagement: { likes: number; reposts: number; replies: number }) => {
    setActionLoading(true);
    try {
      // Calculate simple score
      const baseScore = engagement.likes * 1 + engagement.reposts * 3 + engagement.replies * 2;

      const { error } = await supabase
        .from('submissions')
        .update({
          status: 'approved',
          likes: engagement.likes,
          reposts: engagement.reposts,
          replies: engagement.replies,
          base_score: baseScore,
          final_score: baseScore, // You can apply multipliers here
          approved_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Submission approved!');
      fetchData();
    } catch (error) {
      console.error('Error approving:', error);
      toast.error('Failed to approve submission');
    } finally {
      setActionLoading(false);
    }
  };

  // Reject submission
  const handleReject = async (id: string, reason: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('submissions')
        .update({
          status: 'rejected',
          rejection_reason: reason,
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Submission rejected');
      fetchData();
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error('Failed to reject submission');
    } finally {
      setActionLoading(false);
    }
  };

  // Blacklist user
  const handleBlacklist = async (userId: string) => {
    if (!confirm('Are you sure you want to blacklist this user?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ status: 'blacklisted' })
        .eq('id', userId);

      if (error) throw error;

      toast.success('User blacklisted');
      fetchData();
    } catch (error) {
      console.error('Error blacklisting:', error);
      toast.error('Failed to blacklist user');
    }
  };

  // Export approved submissions for manual payout
  const exportForPayout = async () => {
    try {
      const { data } = await supabase
        .from('submissions')
        .select('*, user:users(wallet_address, x_username)')
        .eq('status', 'approved')
        .order('final_score', { ascending: false });

      if (!data || data.length === 0) {
        toast.error('No approved submissions to export');
        return;
      }

      // Calculate rewards
      const totalScore = data.reduce((sum, s) => sum + (s.final_score || 0), 0);
      const dailyBudget = 10; // SOL - you can make this configurable

      const exportData = data.map((s: any) => ({
        wallet: s.user?.wallet_address,
        username: s.user?.x_username,
        tweet_id: s.tweet_id,
        score: s.final_score,
        share: ((s.final_score || 0) / totalScore * 100).toFixed(2) + '%',
        reward_sol: ((s.final_score || 0) / totalScore * dailyBudget).toFixed(6),
      }));

      // Generate CSV
      const headers = ['wallet', 'username', 'tweet_id', 'score', 'share', 'reward_sol'];
      const csv = [
        headers.join(','),
        ...exportData.map(row => headers.map(h => row[h as keyof typeof row]).join(','))
      ].join('\n');

      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attention-coin-payouts-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();

      toast.success('Export downloaded!');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Failed to export');
    }
  };

  // Mark submissions as paid
  const markAsPaid = async () => {
    if (!confirm('Mark all approved submissions as paid? This should be done after you\'ve sent the SOL.')) return;

    try {
      const { error } = await supabase
        .from('submissions')
        .update({ status: 'paid' })
        .eq('status', 'approved');

      if (error) throw error;

      toast.success('All approved submissions marked as paid');
      fetchData();
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast.error('Failed to update');
    }
  };

  if (userLoading || !isAdminWallet(publicKey?.toBase58() || null)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-6 h-6 text-primary" />
              <h1 className="text-3xl font-bold">Admin Panel</h1>
            </div>
            <p className="text-muted">Manage submissions and payouts</p>
          </div>
          <button onClick={fetchData} className="btn-secondary flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard label="Total Users" value={stats.totalUsers} icon={Users} color="text-blue-400" />
          <StatCard label="Total Submissions" value={stats.totalSubmissions} icon={FileText} color="text-purple-400" />
          <StatCard label="Pending Review" value={stats.pendingSubmissions} icon={Clock} color="text-yellow-400" />
          <StatCard label="Approved" value={stats.approvedSubmissions} icon={CheckCircle2} color="text-green-400" />
          <StatCard label="Total Paid" value={`${formatSol(stats.totalPaidOut)} SOL`} icon={DollarSign} color="text-primary" />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {[
            { key: 'pending', label: 'Pending Review', icon: Clock },
            { key: 'approved', label: 'Approved', icon: CheckCircle2 },
            { key: 'users', label: 'Users', icon: Users },
            { key: 'export', label: 'Export & Pay', icon: Download },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary text-black'
                  : 'bg-surface border border-border text-muted hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.key === 'pending' && stats.pendingSubmissions > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                  {stats.pendingSubmissions}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <>
            {/* Pending/Approved Submissions */}
            {(activeTab === 'pending' || activeTab === 'approved') && (
              <div className="space-y-4">
                {submissions.length === 0 ? (
                  <div className="text-center py-20 bg-surface rounded-2xl border border-border">
                    <CheckCircle2 className="w-12 h-12 text-muted mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {activeTab === 'pending' ? 'No pending submissions' : 'No approved submissions'}
                    </h3>
                    <p className="text-muted">
                      {activeTab === 'pending' ? 'All caught up!' : 'Approve some submissions first'}
                    </p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {submissions.map((submission) => (
                      <SubmissionReviewCard
                        key={submission.id}
                        submission={submission}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        loading={actionLoading}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Users */}
            {activeTab === 'users' && (
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-surface border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-primary font-bold">
                          {(user.x_username || user.wallet_address).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">
                          {user.x_username ? `@${user.x_username}` : truncateWallet(user.wallet_address)}
                        </div>
                        <div className="text-xs text-muted">
                          {truncateWallet(user.wallet_address)} • Joined {timeAgo(user.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatSol(user.total_earned_lamports || 0)} SOL</div>
                        <div className="text-xs text-muted">earned</div>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs ${
                        user.status === 'active' ? 'bg-green-500/20 text-green-400' :
                        user.status === 'blacklisted' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {user.status}
                      </div>
                      {user.status === 'active' && (
                        <button
                          onClick={() => handleBlacklist(user.id)}
                          className="p-2 rounded-lg hover:bg-red-500/20 text-muted hover:text-red-400 transition-colors"
                          title="Blacklist"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Export & Pay */}
            {activeTab === 'export' && (
              <div className="max-w-xl mx-auto">
                <div className="p-8 rounded-2xl bg-surface border border-border text-center">
                  <Download className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Export Payouts</h2>
                  <p className="text-muted mb-6">
                    Download a CSV of approved submissions with calculated rewards.
                    Use this to manually send SOL to each wallet.
                  </p>
                  
                  <div className="space-y-4">
                    <button onClick={exportForPayout} className="btn-primary w-full">
                      <Download className="w-4 h-4 mr-2 inline" />
                      Download Payout CSV
                    </button>
                    
                    <button onClick={markAsPaid} className="btn-secondary w-full">
                      <CheckCircle2 className="w-4 h-4 mr-2 inline" />
                      Mark All as Paid
                    </button>
                  </div>

                  <div className="mt-6 p-4 rounded-lg bg-surface-light border border-border text-left">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      Manual Payout Steps
                    </h4>
                    <ol className="text-sm text-muted space-y-1 list-decimal list-inside">
                      <li>Download the CSV</li>
                      <li>Open your Phantom/wallet</li>
                      <li>Send SOL to each wallet address</li>
                      <li>Click "Mark All as Paid" when done</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
