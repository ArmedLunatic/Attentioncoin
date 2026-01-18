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
  History,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/components/WalletProvider';
import { supabase } from '@/lib/supabase';
import PayoutTimer from '@/components/PayoutTimer';
import { StreakDisplay, BadgeGrid, defaultBadges } from '@/components/StreakBadges';
import ReferralCard from '@/components/ReferralCard';
import {
  AnimatedCounter,
  StatusIndicator,
  Confetti,
  SubmissionCardSkeleton,
  StatCardSkeleton,
} from '@/components/ui';
import {
  formatSol,
  formatNumber,
  truncateWallet,
  extractTweetId,
  isValidTweetUrl,
  generateContentHash,
  timeAgo,
  CASHTAG,
  CONTRACT_ADDRESS,
} from '@/lib/utils';
import type { Submission, UserStats } from '@/types';

// X Account Linking Component
function XAccountLinking({ onLinked }: { onLinked: () => void }) {
  const { publicKey } = useWallet();
  const { user, refreshUser } = useUser();
  const [step, setStep] = useState<'start' | 'verify'>('start');
  const [verificationCode, setVerificationCode] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  // If user is null, try to create/refresh the user record first.
  useEffect(() => {
    if (!user) {
      refreshUser();
    }
  }, [user, refreshUser]);

  const generateCode = async () => {
    if (!publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/verify-x', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: publicKey.toBase58(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate code');
      }

      setVerificationCode(result.data.code);
      setStep('verify');
      toast.success('Verification code generated!');
    } catch (error) {
      console.error('Generate code error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate code');
    } finally {
      setLoading(false);
    }
  };

  const verifyAccount = async () => {
    if (!username.trim()) {
      toast.error('Please enter your X username');
      return;
    }

    if (!publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      const cleanUsername = username.replace('@', '').trim();

      const response = await fetch('/api/verify-x', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: publicKey.toBase58(),
          username: cleanUsername,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to verify account');
      }

      toast.success('X account linked successfully!');
      await refreshUser();
      onLinked();
    } catch (error) {
      console.error('Verification error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to verify. Please try again.');
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
          <button
            onClick={generateCode}
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
            ) : (
              'Generate Verification Code'
            )}
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
function SubmissionForm({ onSubmitted, onSuccess }: { onSubmitted: () => void; onSuccess?: () => void }) {
  const { user } = useUser();
  const [tweetUrl, setTweetUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [isValidUrl, setIsValidUrl] = useState<boolean | null>(null);
  const maxDaily = 5;

  // Validate URL as user types
  useEffect(() => {
    if (!tweetUrl.trim()) {
      setIsValidUrl(null);
      return;
    }
    setIsValidUrl(isValidTweetUrl(tweetUrl));
  }, [tweetUrl]);

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

      // Success state
      setSuccess(true);
      onSuccess?.();
      toast.success('Tweet submitted successfully! Pending review.');

      setTimeout(() => {
        setTweetUrl('');
        setSuccess(false);
        setTodayCount(prev => prev + 1);
        onSubmitted();
      }, 1500);
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit tweet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="p-6 rounded-2xl bg-surface border border-border hover:border-border-light transition-colors"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <Send className="w-4 h-4 text-primary" />
        </div>
        Submit a Tweet
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-muted mb-2">Tweet URL</label>
          <div className="relative">
            <input
              type="url"
              placeholder="https://twitter.com/user/status/..."
              value={tweetUrl}
              onChange={(e) => setTweetUrl(e.target.value)}
              className={`input-dark w-full pr-10 transition-all ${
                isValidUrl === true ? 'border-primary/50 focus:border-primary' :
                isValidUrl === false ? 'border-red-500/50 focus:border-red-500' : ''
              }`}
            />
            {isValidUrl !== null && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {isValidUrl ? (
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* Progress bar for daily limit */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">
              Today: {todayCount}/{maxDaily} submissions
            </span>
            {todayCount >= maxDaily && (
              <span className="text-red-400 text-xs">Daily limit reached</span>
            )}
          </div>
          <div className="h-1.5 bg-surface-light rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-emerald-400"
              initial={{ width: 0 }}
              animate={{ width: `${(todayCount / maxDaily) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <motion.button
          type="submit"
          disabled={loading || success || todayCount >= maxDaily || isValidUrl === false}
          className={`w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
            success
              ? 'bg-primary text-black'
              : 'bg-primary text-black hover:shadow-[0_0_20px_rgba(0,255,136,0.4)] hover:scale-[1.02]'
          } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none`}
          whileTap={{ scale: 0.98 }}
        >
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.span
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4 animate-spin" />
                Submitting...
              </motion.span>
            ) : success ? (
              <motion.span
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Submitted!
              </motion.span>
            ) : (
              <motion.span
                key="default"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                Submit for Review
                <Send className="w-4 h-4" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
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
    </motion.div>
  );
}

// Submission Card
function SubmissionCard({ submission, index = 0 }: { submission: Submission; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-4 rounded-xl bg-surface border border-border hover:border-border-light hover:-translate-y-0.5 transition-all group"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <p className="text-sm text-muted line-clamp-2 flex-1">
          {submission.tweet_text || 'Tweet content pending verification...'}
        </p>
        <a
          href={submission.tweet_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted hover:text-primary transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Engagement stats with icons */}
      <div className="flex items-center gap-3 text-sm text-muted mb-3">
        <span className="flex items-center gap-1">
          <span className="text-red-400">♥</span>
          {formatNumber(submission.likes)}
        </span>
        <span className="flex items-center gap-1">
          <span className="text-green-400">↻</span>
          {formatNumber(submission.reposts)}
        </span>
        <span className="flex items-center gap-1">
          <span className="text-blue-400">○</span>
          {formatNumber(submission.replies)}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <StatusIndicator status={submission.status} size="sm" />

        {submission.final_score > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="px-2 py-1 rounded-md bg-primary/10 border border-primary/20"
          >
            <span className="text-xs text-muted">Score: </span>
            <span className="text-sm text-primary font-bold">{submission.final_score.toFixed(1)}</span>
          </motion.div>
        )}

        <span className="text-xs text-muted">{timeAgo(submission.created_at)}</span>
      </div>
    </motion.div>
  );
}

// Badge type for the dashboard
interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

// Main Dashboard Page
export default function DashboardPage() {
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const { user, loading: userLoading, refreshUser } = useUser();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState<Badge[]>(defaultBadges);
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<string[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);

  // Trigger confetti on successful submission
  const handleSubmissionSuccess = () => {
    setShowConfetti(true);
  };

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

      // Fetch badges from DB (fallback to defaults if not available)
      try {
        const { data: badgesData } = await supabase
          .from('badges')
          .select('*');

        if (badgesData && badgesData.length > 0) {
          setBadges(badgesData);
        }

        // Fetch user's earned badges
        const { data: userBadgesData } = await supabase
          .from('user_badges')
          .select('badge_id')
          .eq('user_id', user.id);

        if (userBadgesData) {
          setEarnedBadgeIds(userBadgesData.map((ub: any) => ub.badge_id));
        }
      } catch {
        // Use default badges if DB tables don't exist yet
      }
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

  // FIX: Show X linking if user is null (new user not yet created in DB)
  // OR if user exists but hasn't verified their X account yet.
  // Previously this only checked "user && !user.x_verified_at" which would
  // skip X linking when user was null (e.g., after DB error or timing issue).
  if (!user || !user.x_verified_at) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-lg mx-auto">
          <XAccountLinking onLinked={refreshUser} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 sm:py-12 px-4">
      {/* Confetti celebration */}
      <Confetti trigger={showConfetti} onComplete={() => setShowConfetti(false)} />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Dashboard</h1>
            <p className="text-sm sm:text-base text-muted">Welcome back, <span className="text-white">@{user?.x_username}</span></p>
          </div>
          <div className="flex items-center gap-3">
            <PayoutTimer compact />
            <Link
              href="/payouts"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-light border border-border text-sm text-muted hover:text-white hover:border-primary/50 transition-all hover:scale-105"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </Link>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {loading ? (
            // Skeleton loading state
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              {/* Total Earned */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-surface border border-border rounded-xl p-4 sm:p-6 hover:border-primary/30 transition-colors group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Wallet className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-xs sm:text-sm text-muted">Total Earned</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-primary">
                  <AnimatedCounter value={stats?.totalEarnedSol || 0} decimals={4} suffix=" SOL" />
                </div>
              </motion.div>

              {/* Approved Posts */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-surface border border-border rounded-xl p-4 sm:p-6 hover:border-green-500/30 transition-colors group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </div>
                  <span className="text-xs sm:text-sm text-muted">Approved Posts</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold">
                  <AnimatedCounter value={stats?.approvedSubmissions || 0} />
                </div>
              </motion.div>

              {/* Pending Review */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-surface border border-border rounded-xl p-4 sm:p-6 hover:border-yellow-500/30 transition-colors group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Clock className="w-4 h-4 text-yellow-500" />
                  </div>
                  <span className="text-xs sm:text-sm text-muted">Pending Review</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold">
                  <AnimatedCounter value={stats?.pendingSubmissions || 0} />
                </div>
              </motion.div>

              {/* Trust Score */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-surface border border-border rounded-xl p-4 sm:p-6 hover:border-blue-500/30 transition-colors group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                  </div>
                  <span className="text-xs sm:text-sm text-muted">Trust Score</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold">
                  <AnimatedCounter value={(user?.trust_score || 0.5) * 100} decimals={0} suffix="%" />
                </div>
              </motion.div>
            </>
          )}
        </div>

        {/* Streak & Badges Row */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <StreakDisplay
            currentStreak={user?.current_streak || 0}
            longestStreak={user?.longest_streak || 0}
          />
          <BadgeGrid
            badges={badges}
            earnedBadgeIds={earnedBadgeIds}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Submission Form */}
          <div className="lg:col-span-1">
            <SubmissionForm onSubmitted={fetchData} onSuccess={handleSubmissionSuccess} />
          </div>

          {/* Submissions List */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                Your Submissions
                {submissions.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-surface-light text-xs text-muted">
                    {submissions.length}
                  </span>
                )}
              </h2>
              <motion.button
                onClick={fetchData}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="text-sm text-muted hover:text-white flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-surface-light transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </motion.button>
            </div>

            {loading ? (
              // Skeleton loading state
              <div className="space-y-4">
                <SubmissionCardSkeleton />
                <SubmissionCardSkeleton />
                <SubmissionCardSkeleton />
              </div>
            ) : submissions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-12 rounded-2xl bg-surface border border-border border-dashed text-center"
              >
                <div className="w-16 h-16 rounded-full bg-surface-light flex items-center justify-center mx-auto mb-4">
                  <Send className="w-8 h-8 text-muted" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No submissions yet</h3>
                <p className="text-muted text-sm mb-4">
                  Submit your first tweet to start earning rewards
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm">
                  <Sparkles className="w-4 h-4" />
                  Earn SOL for your tweets
                </div>
              </motion.div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {submissions.map((submission, i) => (
                    <SubmissionCard key={submission.id} submission={submission} index={i} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Referral Section */}
        <div className="mt-6 sm:mt-8">
          <ReferralCard
            referralCode={user?.referral_code || ''}
            totalReferrals={user?.total_referrals || 0}
            referralEarnings={user?.referral_earnings_lamports || 0}
          />
        </div>
      </div>
    </div>
  );
}
