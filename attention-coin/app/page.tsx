'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { motion } from 'framer-motion';
import {
  Zap,
  ArrowRight,
  Shield,
  TrendingUp,
  Users,
  CheckCircle2,
  Twitter,
  Wallet,
  DollarSign,
  Copy,
  ExternalLink,
  Flame,
  Gift,
  Crown,
  Star,
  Trophy,
  Sparkles,
  Award,
  Percent,
  UserPlus,
  Clock,
  Coins,
} from 'lucide-react';
import { CONTRACT_ADDRESS, CASHTAG, truncateWallet, formatNumber, timeAgo } from '@/lib/utils';
import { toast } from 'sonner';

// Stats interface
interface PlatformStats {
  totalPaidSol: number;
  activeCreators: number;
  totalUsers: number;
  avgStreak: number;
  pool: {
    budgetSol: number;
    maxPerUserSol: number;
    minPayoutSol: number;
    totalScore: number;
    participants: number;
    intervalHours: number;
    nextPayoutTime: string;
  };
  recentActivity: Array<{
    username: string;
    amount: number;
    time: string;
  }>;
}

// Animated counter component
function AnimatedCounter({ value, duration = 2000 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    const increment = end / (duration / 16);
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span className="tabular-nums">{formatNumber(count)}</span>;
}

// Activity feed item
function ActivityItem({ username, amount, time }: { username: string; amount: number; time: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-primary text-sm font-bold">
            {username.charAt(1).toUpperCase()}
          </span>
        </div>
        <div>
          <span className="text-white font-medium">@{username}</span>
          <span className="text-muted"> earned </span>
          <span className="text-primary font-semibold">{amount.toFixed(2)} SOL</span>
        </div>
      </div>
      <span className="text-muted text-sm">{time}</span>
    </motion.div>
  );
}

export default function Home() {
  const { connected } = useWallet();
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch real stats from API
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/stats');
      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    // Refresh stats every 60 seconds
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const copyCA = () => {
    navigator.clipboard.writeText(CONTRACT_ADDRESS);
    setCopied(true);
    toast.success('Contract address copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculate time until next payout
  const getTimeUntilPayout = () => {
    if (!stats?.pool?.nextPayoutTime) return 'Soon';
    const now = new Date();
    const next = new Date(stats.pool.nextPayoutTime);
    const diff = next.getTime() - now.getTime();
    if (diff <= 0) return 'Processing...';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Use real data or fallback
  const displayStats = {
    totalPaidSol: stats?.totalPaidSol || 0,
    activeCreators: stats?.activeCreators || 0,
    avgStreak: stats?.avgStreak || 0,
    poolBudget: stats?.pool?.budgetSol || 0,
  };

  const recentActivity = stats?.recentActivity?.length
    ? stats.recentActivity.map(a => ({
        username: a.username,
        amount: a.amount,
        time: a.time ? timeAgo(a.time) : 'recently',
      }))
    : [];

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background effects - refined for premium feel */}
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[150px] animate-glow-soft" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-secondary/8 rounded-full blur-[120px] animate-glow-soft" />

      {/* Hero Section */}
      <section className="relative pt-16 sm:pt-24 pb-12 sm:pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-6 sm:mb-8">
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-surface border border-border">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs sm:text-sm text-muted">
                  {stats?.pool?.intervalHours
                    ? stats.pool.intervalHours >= 24
                      ? 'Daily payouts'
                      : `Payouts every ${stats.pool.intervalHours}h`
                    : 'Regular payouts'}
                </span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20">
                <Flame className="w-3 h-3 text-orange-500" />
                <span className="text-xs sm:text-sm text-orange-400">Streak Bonuses</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                <Gift className="w-3 h-3 text-cyan-400" />
                <span className="text-xs sm:text-sm text-cyan-400">10% Referrals</span>
              </div>
            </div>

            {/* Main headline - refined typography */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter mb-4 sm:mb-6">
              <span className="text-white">Earn SOL for</span>
              <br />
              <span className="gradient-text">Driving Attention</span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-muted-light max-w-2xl mx-auto mb-8 sm:mb-10 px-4 leading-relaxed">
              Post about <span className="text-white font-medium">{CASHTAG}</span> on X.
              Get rewarded based on real engagement. No bots. No spam. Just quality content.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-10 sm:mb-16 px-4">
              {connected ? (
                <Link href="/dashboard" className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center">
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <WalletMultiButton />
              )}
              <a
                href="#how-it-works"
                className="btn-secondary flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                How It Works
              </a>
            </div>

            {/* Stats - premium cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto px-2">
              {[
                { label: 'SOL Paid Out', value: displayStats.totalPaidSol, suffix: '', icon: Wallet, color: 'text-primary', bg: 'bg-primary/10' },
                { label: 'Active Creators', value: displayStats.activeCreators, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { label: 'Avg Streak', value: displayStats.avgStreak, suffix: ' days', icon: Flame, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                { label: 'Pool Budget', value: displayStats.poolBudget, suffix: ' SOL', icon: Coins, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="bg-surface/80 border border-border rounded-2xl p-4 sm:p-5 text-center hover:border-border-light hover:bg-surface transition-all duration-200 group"
                >
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${stat.bg} flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform duration-200`}>
                    <stat.icon className={`w-5 h-5 sm:w-5.5 sm:h-5.5 ${stat.color}`} />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-white mb-1">
                    {statsLoading ? (
                      <span className="animate-pulse text-muted">--</span>
                    ) : (
                      <>
                        <AnimatedCounter value={stat.value} />
                        {stat.suffix}
                      </>
                    )}
                  </div>
                  <div className="text-xs sm:text-sm text-muted">{stat.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Pool Info Banner */}
            {stats?.pool && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-6 max-w-2xl mx-auto px-2"
              >
                <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 via-surface to-cyan-500/10 border border-primary/20">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-primary" />
                      </div>
                      <div className="text-center sm:text-left">
                        <p className="text-sm text-muted">Next Payout In</p>
                        <p className="text-lg font-bold text-primary">{getTimeUntilPayout()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-center">
                      <div>
                        <p className="text-xs text-muted">Pool Size</p>
                        <p className="font-semibold">{stats.pool.participants} users</p>
                      </div>
                      <div className="w-px h-8 bg-border" />
                      <div>
                        <p className="text-xs text-muted">Total Score</p>
                        <p className="font-semibold">{stats.pool.totalScore.toFixed(0)}</p>
                      </div>
                      <div className="w-px h-8 bg-border" />
                      <div>
                        <p className="text-xs text-muted">Max/User</p>
                        <p className="font-semibold">{stats.pool.maxPerUserSol} SOL</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* DEXSCREENER CHART SECTION                                              */}
      {/* Shows live token price chart from DexScreener                          */}
      {/* Uses iframe embed - fully responsive with mobile-first design          */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative py-12 sm:py-16 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-6 sm:mb-8"
          >
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">Live Chart</h2>
            <p className="text-muted text-sm sm:text-base">Track $ATTENTION in real-time</p>
          </motion.div>

          {/*
            DexScreener Embed Container
            - Uses aspect-ratio for responsive height
            - Mobile: taller chart (aspect-[4/5]) for better visibility
            - Desktop: wider chart (sm:aspect-[16/9])
            - overflow-hidden prevents any scroll issues
            - rounded corners and border match site theme
          */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="w-full rounded-2xl overflow-hidden border border-border bg-surface"
          >
            {/*
              Responsive iframe container
              - aspect-[4/5] on mobile gives more vertical space for chart
              - sm:aspect-[16/9] on larger screens for standard widescreen
              - max-h prevents chart from being too tall on desktop
            */}
            <div className="relative w-full aspect-[4/5] sm:aspect-[16/9] max-h-[600px]">
              <iframe
                src={`https://dexscreener.com/solana/${CONTRACT_ADDRESS}?embed=1&theme=dark&trades=0&info=0`}
                title="DexScreener Chart"
                className="absolute inset-0 w-full h-full"
                style={{ border: 'none' }}
                loading="lazy"
                allow="clipboard-write"
              />
            </div>
          </motion.div>

          {/* Link to view full chart on DexScreener */}
          <div className="mt-4 text-center">
            <a
              href={`https://dexscreener.com/solana/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-muted hover:text-primary transition-colors"
            >
              View full chart on DexScreener
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* BOOST YOUR EARNINGS SECTION                                            */}
      {/* Explains the three main ways to increase rewards:                      */}
      {/* 1. Referrals - Invite friends and earn 10% of their earnings           */}
      {/* 2. Badges - Unlock achievements that prove your status                 */}
      {/* 3. Multipliers - Stack bonuses to increase every payout                */}
      {/* Mobile: Single column layout / Desktop: Three columns                  */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative py-12 sm:py-20 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-8 sm:mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">Maximize Your Rewards</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
              Boost Your Earnings
            </h2>
            <p className="text-muted text-sm sm:text-base max-w-xl mx-auto">
              Stack rewards with referrals, badges, and multipliers to earn more on every payout.
            </p>
          </motion.div>

          {/*
            Rewards Feature Cards
            - Mobile: Single column (grid-cols-1)
            - Desktop: Three columns (md:grid-cols-3)
            - Each card explains one reward mechanism
          */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">

            {/* Card 1: Referrals */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0 }}
              className="p-5 sm:p-6 rounded-2xl bg-surface border border-border hover:border-cyan-500/30 transition-colors group"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4 group-hover:bg-cyan-500/20 transition-colors">
                <UserPlus className="w-6 h-6 text-cyan-400" />
              </div>
              {/* Title */}
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Referrals</h3>
              {/* Description */}
              <p className="text-sm text-muted mb-4">
                Invite friends and earn <span className="text-cyan-400 font-semibold">10%</span> of everything they earn. Forever.
              </p>
              {/* Feature list */}
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span className="text-muted">Passive income from referrals</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span className="text-muted">No limit on referral count</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span className="text-muted">Unique link in your dashboard</span>
                </li>
              </ul>
            </motion.div>

            {/* Card 2: Badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="p-5 sm:p-6 rounded-2xl bg-surface border border-border hover:border-purple-500/30 transition-colors group"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                <Award className="w-6 h-6 text-purple-400" />
              </div>
              {/* Title */}
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Badges</h3>
              {/* Description */}
              <p className="text-sm text-muted mb-4">
                Unlock achievement badges by hitting milestones. Each badge proves your <span className="text-purple-400 font-semibold">status</span>.
              </p>
              {/* Feature list */}
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <span className="text-muted">Earn badges for activity</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <span className="text-muted">Show off your achievements</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <span className="text-muted">Badges unlock multipliers</span>
                </li>
              </ul>
            </motion.div>

            {/* Card 3: Multipliers */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="p-5 sm:p-6 rounded-2xl bg-surface border border-border hover:border-orange-500/30 transition-colors group"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4 group-hover:bg-orange-500/20 transition-colors">
                <Percent className="w-6 h-6 text-orange-400" />
              </div>
              {/* Title */}
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Multipliers</h3>
              {/* Description */}
              <p className="text-sm text-muted mb-4">
                Stack multipliers from streaks and badges to <span className="text-orange-400 font-semibold">boost every payout</span>.
              </p>
              {/* Feature list */}
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  <span className="text-muted">Up to 1.5x from streaks</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  <span className="text-muted">Badge bonuses stack</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  <span className="text-muted">Applied automatically</span>
                </li>
              </ul>
            </motion.div>
          </div>

          {/* Summary callout - explains how everything works together */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-6 sm:mt-8 p-4 sm:p-6 rounded-xl bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-orange-500/5 border border-border"
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-center sm:text-left">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-cyan-400" />
                <span className="text-sm"><span className="text-white font-medium">Refer</span> <span className="text-muted">friends</span></span>
              </div>
              <span className="text-muted hidden sm:block">+</span>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-400" />
                <span className="text-sm"><span className="text-white font-medium">Earn</span> <span className="text-muted">badges</span></span>
              </div>
              <span className="text-muted hidden sm:block">+</span>
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-400" />
                <span className="text-sm"><span className="text-white font-medium">Build</span> <span className="text-muted">streaks</span></span>
              </div>
              <span className="text-muted hidden sm:block">=</span>
              <div className="flex items-center gap-2 mt-2 sm:mt-0">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="text-sm text-primary font-semibold">Maximum Earnings</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative py-16 sm:py-24 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-10 sm:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3 sm:mb-4">How It Works</h2>
            <p className="text-muted-light text-base sm:text-lg">Three simple steps to start earning</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                icon: Wallet,
                step: '01',
                title: 'Connect & Verify',
                description: 'Connect your Solana wallet and link your X (Twitter) account to get started.',
              },
              {
                icon: Twitter,
                step: '02',
                title: 'Post Quality Content',
                description: `Create engaging posts about ${CASHTAG} or include the contract address.`,
              },
              {
                icon: DollarSign,
                step: '03',
                title: 'Earn SOL',
                description: 'Get rewarded daily based on your content\'s real engagement metrics.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative p-6 sm:p-8 rounded-2xl bg-surface/80 border border-border hover:border-border-light hover:bg-surface transition-all duration-200 group"
              >
                <div className="absolute -top-3 -left-3 sm:-top-3 sm:-left-3 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/15 flex items-center justify-center border border-primary/20">
                  <span className="text-primary font-bold text-sm">{item.step}</span>
                </div>
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-surface-light flex items-center justify-center mb-4 sm:mb-5 group-hover:bg-primary/10 transition-colors duration-200">
                  <item.icon className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">{item.title}</h3>
                <p className="text-sm sm:text-base text-muted leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Loyalty Rewards Section */}
      <section className="relative py-16 sm:py-24 px-4 border-t border-border overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />

        <div className="max-w-6xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-10 sm:mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 mb-4">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-orange-400 font-medium">Loyalty = More Earnings</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
              Rewards for <span className="text-gradient">Loyal Creators</span>
            </h2>
            <p className="text-muted text-base sm:text-lg max-w-2xl mx-auto">
              The more consistent you are, the more you earn. Build streaks and refer friends to multiply your rewards.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
            {/* Streak Bonuses */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <Flame className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Streak Bonuses</h3>
                  <p className="text-sm text-muted">Post daily to earn more</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { days: 3, bonus: '1.1x', label: 'Warming Up', color: 'text-yellow-500', bg: 'bg-yellow-500' },
                  { days: 7, bonus: '1.25x', label: 'On Fire', color: 'text-orange-500', bg: 'bg-orange-500' },
                  { days: 30, bonus: '1.5x', label: 'Legendary', color: 'text-red-500', bg: 'bg-red-500' },
                ].map((tier, i) => (
                  <motion.div
                    key={tier.days}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${tier.bg}/20 flex items-center justify-center`}>
                        <Flame className={`w-5 h-5 ${tier.color}`} />
                      </div>
                      <div>
                        <div className="font-semibold">{tier.days} Day Streak</div>
                        <div className="text-xs text-muted">{tier.label}</div>
                      </div>
                    </div>
                    <div className={`text-xl font-bold ${tier.color}`}>{tier.bonus}</div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-xl bg-background/30 border border-dashed border-orange-500/30">
                <div className="flex items-center gap-2 text-sm">
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  <span className="text-orange-300">Bonus multiplied on every approved submission!</span>
                </div>
              </div>
            </motion.div>

            {/* Referral Program */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <Gift className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Referral Program</h3>
                  <p className="text-sm text-muted">Earn when your friends earn</p>
                </div>
              </div>

              <div className="text-center py-6">
                <div className="text-5xl sm:text-6xl font-bold text-gradient mb-2">10%</div>
                <div className="text-lg text-muted">of every referral's earnings</div>
                <div className="text-sm text-cyan-400 mt-1">Forever, on every payout</div>
              </div>

              <div className="space-y-3">
                {[
                  { icon: Users, text: 'Refer 5 friends → Recruiter Badge' },
                  { icon: Crown, text: 'Refer 25 friends → Ambassador Badge' },
                  { icon: Trophy, text: 'Top referrers featured on leaderboard' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-background/50"
                  >
                    <item.icon className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                    <span className="text-sm">{item.text}</span>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-xl bg-background/30 border border-dashed border-cyan-500/30">
                <div className="flex items-center gap-2 text-sm">
                  <Star className="w-4 h-4 text-cyan-400" />
                  <span className="text-cyan-300">Get your unique referral link in the dashboard!</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Badges Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-10 sm:mt-16 text-center"
          >
            <h3 className="text-lg font-semibold mb-6">Unlock Achievement Badges</h3>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
              {[
                { name: 'First Post', icon: Zap, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
                { name: 'Consistent', icon: Flame, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
                { name: 'Rising Star', icon: Star, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
                { name: 'Whale', icon: Wallet, color: 'bg-green-500/20 text-green-400 border-green-500/30' },
                { name: 'Recruiter', icon: Users, color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
                { name: 'Influencer', icon: Crown, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
              ].map((badge, i) => (
                <motion.div
                  key={badge.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.1, y: -4 }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border ${badge.color} cursor-default`}
                >
                  <badge.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{badge.name}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Scoring Section */}
      <section className="relative py-16 sm:py-24 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
                Transparent Scoring
              </h2>
              <p className="text-muted text-sm sm:text-base md:text-lg mb-6 sm:mb-8">
                Your rewards are calculated using a transparent formula that weights engagement quality over quantity.
              </p>

              <div className="p-4 sm:p-6 rounded-xl bg-surface border border-border mb-4 sm:mb-6">
                <code className="text-primary text-sm sm:text-base md:text-lg">
                  Score = Engagement × Trust × Quality
                </code>
              </div>

              <div className="space-y-4">
                {[
                  { label: 'Engagement', desc: 'Likes, reposts, replies, quotes weighted by value' },
                  { label: 'Trust', desc: 'Account age, followers, history factor' },
                  { label: 'Quality', desc: 'Content length, originality, media bonus' },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-white">{item.label}:</span>
                      <span className="text-muted ml-2">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-2xl bg-surface border border-border"
            >
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Engagement Weights
              </h3>
              
              <div className="space-y-4">
                {[
                  { label: 'Like', weight: '×1.0', color: 'bg-blue-500' },
                  { label: 'Reply', weight: '×2.0', color: 'bg-green-500' },
                  { label: 'Repost', weight: '×3.0', color: 'bg-purple-500' },
                  { label: 'Quote', weight: '×4.0', color: 'bg-primary' },
                ].map((item, i) => (
                  <div key={item.label} className="flex items-center gap-4">
                    <span className="w-20 text-muted">{item.label}</span>
                    <div className="flex-1 h-3 bg-surface-light rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(i + 1) * 25}%` }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1, duration: 0.5 }}
                        className={`h-full ${item.color} rounded-full`}
                      />
                    </div>
                    <span className="w-12 text-right font-mono text-primary">{item.weight}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-border">
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Shield className="w-4 h-4" />
                  <span>Anti-gaming protection: spam and bots get penalized</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Live Activity */}
      <section className="relative py-16 sm:py-24 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 md:gap-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-5 sm:p-8 rounded-2xl bg-surface border border-border"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary live-pulse" />
                  Recent Rewards
                </h3>
                <Link href="/leaderboard" className="text-sm text-primary hover:underline">
                  View All
                </Link>
              </div>
              
              <div className="space-y-1">
                {recentActivity.length > 0 ? (
                  recentActivity.map((item, i) => (
                    <ActivityItem key={i} {...item} />
                  ))
                ) : (
                  <div className="py-8 text-center">
                    <Sparkles className="w-8 h-8 text-muted mx-auto mb-2" />
                    <p className="text-muted text-sm">No payouts yet</p>
                    <p className="text-xs text-muted/70">Be the first to earn!</p>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex flex-col justify-center"
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
                Join the Attention Economy
              </h2>
              <p className="text-muted text-sm sm:text-base md:text-lg mb-6 sm:mb-8">
                Real creators earning real rewards. No gatekeeping. Connect your wallet and start today.
              </p>
              
              {/* Contract Address */}
              <div className="p-3 sm:p-4 rounded-xl bg-surface border border-border">
                <div className="text-xs sm:text-sm text-muted mb-2">Contract Address</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-white font-mono text-xs sm:text-sm truncate">
                    {CONTRACT_ADDRESS}
                  </code>
                  <button
                    onClick={copyCA}
                    className="p-2 rounded-lg bg-surface-light hover:bg-border transition-colors flex-shrink-0"
                    title="Copy"
                  >
                    <Copy className="w-4 h-4 text-muted" />
                  </button>
                  <a
                    href={`https://solscan.io/token/${CONTRACT_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-surface-light hover:bg-border transition-colors flex-shrink-0"
                    title="View on Solscan"
                  >
                    <ExternalLink className="w-4 h-4 text-muted" />
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-16 sm:py-24 px-4 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
              Ready to Earn?
            </h2>
            <p className="text-muted text-sm sm:text-base md:text-lg mb-8 sm:mb-10 px-4">
              Connect your wallet, link your X account, and start submitting your best content.
            </p>
            
            {connected ? (
              <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2">
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <WalletMultiButton />
            )}
          </motion.div>
        </div>
      </section>

      {/* Footer - refined */}
      <footer className="border-t border-border py-10 sm:py-14 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <span className="font-semibold text-sm sm:text-base tracking-tight">ATTENTION</span>
            </div>
            <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted">
              <span className="text-muted-light">{CASHTAG}</span>
              <span className="text-border-light">•</span>
              <span className="font-mono text-muted">{truncateWallet(CONTRACT_ADDRESS, 4)}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
