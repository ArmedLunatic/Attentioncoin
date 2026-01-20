'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Twitter,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Wallet,
  ExternalLink,
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
import EligibleEarnings from '@/components/EligibleEarnings';
import ClaimAddress from '@/components/ClaimAddress';
import {
  AnimatedCounter,
  StatusIndicator,
  Confetti,
  SubmissionCardSkeleton,
  StatCardSkeleton,
} from '@/components/ui';
import {
  formatNumber,
  extractTweetId,
  isValidTweetUrl,
  timeAgo,
  CASHTAG,
  CONTRACT_ADDRESS,
} from '@/lib/utils';
import type { Submission, UserStats } from '@/types';

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
      className="p-5 sm:p-6 rounded-2xl bg-surface/80 border border-border hover:border-border-light transition-all duration-200"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
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
              className="h-full bg-foreground"
              initial={{ width: 0 }}
              animate={{ width: `${(todayCount / maxDaily) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <motion.button
          type="submit"
          disabled={loading || success || todayCount >= maxDaily || isValidUrl === false}
          className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
            success
              ? 'bg-foreground text-background'
              : 'bg-foreground text-background hover:bg-foreground-muted'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
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
  const { user, loading: userLoading, refreshUser, isAuthenticated } = useUser();
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

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, userLoading, router]);

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
        rank: null,
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

  // Set up real-time subscriptions for live updates when admin approves
  useEffect(() => {
    if (!user) return;

    // Subscribe to changes on user's submissions
    const submissionsChannel = supabase
      .channel('dashboard-submissions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'submissions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refetch data when submissions change
          fetchData();
        }
      )
      .subscribe();

    // Subscribe to changes on user record (for badges, streak, etc.)
    const userChannel = supabase
      .channel('dashboard-user')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`,
        },
        () => {
          // Refresh user data when user record changes
          refreshUser();
          fetchData();
        }
      )
      .subscribe();

    // Subscribe to new badges earned
    const badgesChannel = supabase
      .channel('dashboard-badges')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_badges',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Show toast when new badge earned
          toast.success('New badge earned!', {
            description: 'Check your badges section!',
          });
          fetchData();
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(submissionsChannel);
      supabase.removeChannel(userChannel);
      supabase.removeChannel(badgesChannel);
    };
  }, [user, refreshUser, fetchData]);

  // Show loading or redirect
  if (userLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // User not verified (shouldn't happen with new flow, but just in case)
  if (!user || !user.x_verified_at) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-6">
            <Twitter className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold mb-4">X Account Required</h1>
          <p className="text-muted mb-6">Please verify your X account to access the dashboard.</p>
          <Link href="/login" className="btn-primary">
            Go to Login
          </Link>
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
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 sm:mb-10"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1 sm:mb-2">Dashboard</h1>
            <p className="text-sm sm:text-base text-muted">Welcome back, <span className="text-white font-medium">@{user?.x_username}</span></p>
          </div>
          <div className="flex items-center gap-3">
            <PayoutTimer compact />
            <Link
              href="/payouts"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-light border border-border text-sm text-muted hover:text-white hover:border-border-light transition-all duration-200"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </Link>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-10">
          {loading ? (
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
                className="bg-surface/80 border border-border rounded-2xl p-4 sm:p-6 hover:border-border-light hover:bg-surface transition-all duration-200 group"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
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
                className="bg-surface/80 border border-border rounded-2xl p-4 sm:p-6 hover:border-border-light hover:bg-surface transition-all duration-200 group"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
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
                className="bg-surface/80 border border-border rounded-2xl p-4 sm:p-6 hover:border-border-light hover:bg-surface transition-all duration-200 group"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
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
                className="bg-surface/80 border border-border rounded-2xl p-4 sm:p-6 hover:border-border-light hover:bg-surface transition-all duration-200 group"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
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

        {/* Payout Address Section */}
        <div className="mb-6 sm:mb-8">
          <ClaimAddress />
        </div>

        {/* Eligible Earnings */}
        <div className="mb-6 sm:mb-8">
          <EligibleEarnings />
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
