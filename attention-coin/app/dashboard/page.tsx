'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Twitter,
  Link as LinkIcon,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Wallet,
  ExternalLink,
  Copy,
  RefreshCw,
  Info,
} from 'lucide-react';
import { useUser } from '@/components/WalletProvider';
import { supabase } from '@/lib/supabase';
import {
  formatSol,
  formatNumber,
  truncateWallet,
  extractTweetId,
  isValidTweetUrl,
  generateVerificationCode,
  generateContentHash,
  timeAgo,
  CASHTAG,
  CONTRACT_ADDRESS,
} from '@/lib/utils';
import type { Submission, UserStats } from '@/types';

// X Account Linking Component
function XAccountLinking({ onLinked }: { onLinked: () => void }) {
  const { user, refreshUser } = useUser();
  const [step, setStep] = useState<'start' | 'verify'>('start');
  const [verificationCode, setVerificationCode] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const generateCode = () => {
    const code = generateVerificationCode();
    setVerificationCode(code);
    setStep('verify');
  };

  const verifyAccount = async () => {
    if (!username.trim()) {
      toast.error('Please enter your X username');
      return;
    }

    setLoading(true);
    try {
      // Update user with X info (in production, you'd verify the tweet exists)
      const { error } = await supabase
        .from('users')
        .update({
          x_username: username.replace('@', ''),
          x_verified_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;

      toast.success('X account linked successfully!');
      await refreshUser();
      onLinked();
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Failed to verify. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const tweetText = `Verifying my wallet for @AttentionCoin 🔐

Code: ${verificationCode}

${CASHTAG}`;

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

  return (
    <div className="p-8 rounded-2xl bg-surface border border-border">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <Twitter className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Link Your X Account</h2>
          <p className="text-muted text-sm">Required to submit tweets for rewards</p>
        </div>
      </div>

      {step === 'start' && (
        <div className="space-y-6">
          <p className="text-muted">
            To verify you own your X account, you'll post a unique code. This is a one-time process.
          </p>
          <button onClick={generateCode} className="btn-primary w-full">
            Generate Verification Code
          </button>
        </div>
      )}

      {step === 'verify' && (
        <div className="space-y-6">
          {/* Step 1: Post Tweet */}
          <div className="p-4 rounded-xl bg-surface-light border border-border">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-bold flex items-center justify-center">1</span>
              <span className="font-medium">Post this tweet</span>
            </div>
            <div className="p-3 rounded-lg bg-background border border-border mb-4">
              <p className="text-sm text-muted whitespace-pre-wrap">{tweetText}</p>
            </div>
            <a
              href={tweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              <Twitter className="w-4 h-4" />
              Post Tweet
            </a>
          </div>

          {/* Step 2: Enter Username */}
          <div className="p-4 rounded-xl bg-surface-light border border-border">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-bold flex items-center justify-center">2</span>
              <span className="font-medium">Enter your X username</span>
            </div>
            <input
              type="text"
              placeholder="@username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-dark w-full mb-4"
            />
            <button
              onClick={verifyAccount}
              disabled={loading || !username.trim()}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                'Verify & Link Account'
              )}
            </button>
          </div>

          <p className="text-xs text-muted text-center">
            Note: Keep the tweet posted for at least 24 hours
          </p>
        </div>
      )}
    </div>
  );
}

// Tweet Submission Form
function SubmissionForm({ onSubmitted }: { onSubmitted: () => void }) {
  const { user } = useUser();
  const [tweetUrl, setTweetUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const maxDaily = 5;

  // Fetch today's submission count
  useEffect(() => {
    if (!user) return;

    const fetchCount = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString());

      setTodayCount(count || 0);
    };

    fetchCount();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tweetUrl.trim()) {
      toast.error('Please enter a tweet URL');
      return;
    }

    if (!isValidTweetUrl(tweetUrl)) {
      toast.error('Please enter a valid Twitter/X URL');
      return;
    }

    if (todayCount >= maxDaily) {
      toast.error(`You've reached the daily limit of ${maxDaily} submissions`);
      return;
    }

    const tweetId = extractTweetId(tweetUrl);
    if (!tweetId) {
      toast.error('Could not extract tweet ID from URL');
      return;
    }

    setLoading(true);
    try {
      // Check for duplicate
      const { data: existing } = await supabase
        .from('submissions')
        .select('id')
        .eq('tweet_id', tweetId)
        .single();

      if (existing) {
        toast.error('This tweet has already been submitted');
        setLoading(false);
        return;
      }

      // Create submission
      const { error } = await supabase.from('submissions').insert({
        user_id: user?.id,
        tweet_id: tweetId,
        tweet_url: tweetUrl.trim(),
        status: 'pending',
        // These would be populated when you verify the tweet
        has_ca: tweetUrl.toLowerCase().includes(CONTRACT_ADDRESS.toLowerCase()),
        has_cashtag: tweetUrl.toLowerCase().includes(CASHTAG.toLowerCase()),
      });

      if (error) throw error;

      toast.success('Tweet submitted successfully! Pending review.');
      setTweetUrl('');
      setTodayCount(prev => prev + 1);
      onSubmitted();
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit tweet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-surface border border-border">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Send className="w-5 h-5 text-primary" />
        Submit a Tweet
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-muted mb-2">Tweet URL</label>
          <input
            type="url"
            placeholder="https://twitter.com/user/status/..."
            value={tweetUrl}
            onChange={(e) => setTweetUrl(e.target.value)}
            className="input-dark w-full"
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            Today: {todayCount}/{maxDaily} submissions
          </span>
          {todayCount >= maxDaily && (
            <span className="text-accent">Daily limit reached</span>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || todayCount >= maxDaily}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Submit for Review
              <Send className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-4 p-3 rounded-lg bg-surface-light border border-border">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-muted mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted">
            Make sure your tweet includes <span className="text-white">{CASHTAG}</span> or the contract address.
            Engagement will be verified before approval.
          </p>
        </div>
      </div>
    </div>
  );
}

// Submission Card
function SubmissionCard({ submission }: { submission: Submission }) {
  const statusColors = {
    pending: 'text-yellow-500',
    approved: 'text-primary',
    rejected: 'text-red-500',
    paid: 'text-blue-500',
  };

  const statusIcons = {
    pending: Clock,
    approved: CheckCircle2,
    rejected: AlertCircle,
    paid: CheckCircle2,
  };

  const StatusIcon = statusIcons[submission.status];

  return (
    <div className="p-4 rounded-xl bg-surface border border-border card-hover">
      <div className="flex items-start justify-between gap-4 mb-3">
        <p className="text-sm text-muted line-clamp-2 flex-1">
          {submission.tweet_text || 'Tweet content pending verification...'}
        </p>
        <a
          href={submission.tweet_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted hover:text-white transition-colors flex-shrink-0"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted mb-3">
        <span>❤️ {formatNumber(submission.likes)}</span>
        <span>🔁 {formatNumber(submission.reposts)}</span>
        <span>💬 {formatNumber(submission.replies)}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-1.5 text-sm ${statusColors[submission.status]}`}>
          <StatusIcon className="w-4 h-4" />
          <span className="capitalize">{submission.status}</span>
        </div>

        {submission.final_score > 0 && (
          <div className="text-sm">
            <span className="text-muted">Score: </span>
            <span className="text-white font-semibold">{submission.final_score.toFixed(1)}</span>
          </div>
        )}

        <span className="text-xs text-muted">{timeAgo(submission.created_at)}</span>
      </div>
    </div>
  );
}

// Main Dashboard Page
export default function DashboardPage() {
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const { user, loading: userLoading, refreshUser } = useUser();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Redirect if not connected
  useEffect(() => {
    if (!userLoading && !connected) {
      router.push('/');
    }
  }, [connected, userLoading, router]);

  // Fetch user data
  const fetchData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch submissions
      const { data: submissionsData } = await supabase
        .from('submissions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setSubmissions(submissionsData || []);

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count: todayCount } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString());

      const { count: approvedCount } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['approved', 'paid']);

      const { count: pendingCount } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'pending');

      setStats({
        totalEarnedSol: (user.total_earned_lamports || 0) / 1e9,
        totalSubmissions: user.total_submissions || 0,
        approvedSubmissions: approvedCount || 0,
        pendingSubmissions: pendingCount || 0,
        rank: null, // Would need a separate query
        todaySubmissions: todayCount || 0,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Show loading or redirect
  if (userLoading || !connected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Show X linking if not verified
  if (user && !user.x_verified_at) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-lg mx-auto">
          <XAccountLinking onLinked={refreshUser} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted">Welcome back, @{user?.x_username}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: 'Total Earned',
              value: `${stats?.totalEarnedSol.toFixed(4) || '0'} SOL`,
              icon: Wallet,
              color: 'text-primary',
            },
            {
              label: 'Approved Posts',
              value: stats?.approvedSubmissions || 0,
              icon: CheckCircle2,
              color: 'text-green-500',
            },
            {
              label: 'Pending Review',
              value: stats?.pendingSubmissions || 0,
              icon: Clock,
              color: 'text-yellow-500',
            },
            {
              label: 'Trust Score',
              value: `${((user?.trust_score || 0.5) * 100).toFixed(0)}%`,
              icon: TrendingUp,
              color: 'text-blue-500',
            },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="stat-card"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-sm text-muted">{stat.label}</span>
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Submission Form */}
          <div className="lg:col-span-1">
            <SubmissionForm onSubmitted={fetchData} />
          </div>

          {/* Submissions List */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Your Submissions</h2>
              <button
                onClick={fetchData}
                className="text-sm text-muted hover:text-white flex items-center gap-1"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {submissions.length === 0 ? (
              <div className="p-12 rounded-2xl bg-surface border border-border text-center">
                <Send className="w-12 h-12 text-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No submissions yet</h3>
                <p className="text-muted">
                  Submit your first tweet to start earning rewards
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {submissions.map((submission, i) => (
                    <motion.div
                      key={submission.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <SubmissionCard submission={submission} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
