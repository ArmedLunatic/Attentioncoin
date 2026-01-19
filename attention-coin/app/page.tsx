'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { motion } from 'framer-motion';
import { ArrowRight, Copy, ExternalLink } from 'lucide-react';
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

// Lightning Logo
function Logo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M13 2L4.09 12.11C3.95 12.28 3.86 12.49 3.86 12.72C3.86 13.22 4.27 13.63 4.77 13.63H11L10 22L18.91 11.89C19.05 11.72 19.14 11.51 19.14 11.28C19.14 10.78 18.73 10.37 18.23 10.37H12L13 2Z"
        fill="currentColor"
      />
    </svg>
  );
}

// Animated counter
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

export default function Home() {
  const { connected } = useWallet();
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

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
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const copyCA = () => {
    navigator.clipboard.writeText(CONTRACT_ADDRESS);
    setCopied(true);
    toast.success('Contract address copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const displayStats = {
    totalPaidSol: stats?.totalPaidSol || 0,
    activeCreators: stats?.activeCreators || 0,
    poolBudget: stats?.pool?.budgetSol || 0,
  };

  const recentActivity = stats?.recentActivity?.slice(0, 5) || [];

  return (
    <div className="relative min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-24 sm:pt-32 pb-20 sm:pb-28 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            {/* Main headline */}
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tight text-foreground mb-6">
              Earn SOL for
              <br />
              Driving Attention
            </h1>

            <p className="text-lg sm:text-xl text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
              Post about {CASHTAG} on X. Get rewarded based on real engagement.
              <br className="hidden sm:block" />
              Quality content. Transparent scoring. Direct payouts.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              {connected ? (
                <Link href="/dashboard" className="btn-primary flex items-center gap-2">
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <WalletMultiButton />
              )}
              <a href="#how-it-works" className="btn-secondary">
                How It Works
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 sm:gap-8 max-w-xl mx-auto">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-display text-foreground mb-1">
                  {statsLoading ? (
                    <span className="text-muted">--</span>
                  ) : (
                    <AnimatedCounter value={displayStats.totalPaidSol} />
                  )}
                </div>
                <div className="text-sm text-muted">SOL Paid</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-display text-foreground mb-1">
                  {statsLoading ? (
                    <span className="text-muted">--</span>
                  ) : (
                    <AnimatedCounter value={displayStats.activeCreators} />
                  )}
                </div>
                <div className="text-sm text-muted">Creators</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-display text-foreground mb-1">
                  {statsLoading ? (
                    <span className="text-muted">--</span>
                  ) : (
                    <AnimatedCounter value={displayStats.poolBudget} />
                  )}
                </div>
                <div className="text-sm text-muted">Pool SOL</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 sm:py-28 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-2xl sm:text-3xl text-foreground mb-12 text-center">
              How It Works
            </h2>

            <div className="grid sm:grid-cols-3 gap-8 sm:gap-12">
              <div className="text-center sm:text-left">
                <div className="text-muted-light text-sm mb-3 font-mono">01</div>
                <h3 className="font-display text-lg text-foreground mb-2">Connect</h3>
                <p className="text-muted text-sm leading-relaxed">
                  Link your Solana wallet and X account to get started.
                </p>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-muted-light text-sm mb-3 font-mono">02</div>
                <h3 className="font-display text-lg text-foreground mb-2">Create</h3>
                <p className="text-muted text-sm leading-relaxed">
                  Post quality content about {CASHTAG} or include the contract address.
                </p>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-muted-light text-sm mb-3 font-mono">03</div>
                <h3 className="font-display text-lg text-foreground mb-2">Earn</h3>
                <p className="text-muted text-sm leading-relaxed">
                  Receive SOL based on your content's engagement metrics.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Mechanics */}
      <section className="py-20 sm:py-28 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-2xl sm:text-3xl text-foreground mb-12 text-center">
              Transparent Mechanics
            </h2>

            <div className="grid sm:grid-cols-2 gap-12">
              <div>
                <h3 className="font-display text-lg text-foreground mb-4">Scoring</h3>
                <div className="space-y-3 text-sm text-muted">
                  <p>Engagement weighted by value: quotes, reposts, replies, likes.</p>
                  <p>Account trust factors: age, followers, history.</p>
                  <p>Content quality signals: length, originality, media.</p>
                </div>
                <div className="mt-6 p-4 bg-surface rounded-lg border border-border">
                  <code className="text-sm text-muted-light">
                    Score = Engagement x Trust x Quality
                  </code>
                </div>
              </div>

              <div>
                <h3 className="font-display text-lg text-foreground mb-4">Payouts</h3>
                <div className="space-y-3 text-sm text-muted">
                  <p>Pool distributed proportionally to scores.</p>
                  <p>Streak bonuses: 3-day, 7-day, 30-day multipliers.</p>
                  <p>Referral earnings: 10% of referred users' payouts.</p>
                </div>
                <div className="mt-6 p-4 bg-surface rounded-lg border border-border">
                  <code className="text-sm text-muted-light">
                    {stats?.pool?.intervalHours ? (
                      stats.pool.intervalHours >= 24 ? 'Payouts: Daily' : `Payouts: Every ${stats.pool.intervalHours}h`
                    ) : 'Payouts: Regular intervals'}
                  </code>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="py-20 sm:py-28 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-2xl sm:text-3xl text-foreground mb-12 text-center">
              Protocol Evolution
            </h2>

            <div className="space-y-12">
              {/* Phase 1 */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2 h-2 rounded-full bg-foreground" />
                  <h3 className="font-display text-lg text-foreground">Foundation</h3>
                </div>
                <div className="ml-5 pl-4 border-l border-border space-y-2 text-sm text-muted">
                  <p>Core payout infrastructure operational</p>
                  <p>Engagement scoring engine deployed</p>
                  <p>Wallet verification and linking</p>
                  <p>Manual approval workflow established</p>
                </div>
              </div>

              {/* Phase 2 */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2 h-2 rounded-full bg-muted" />
                  <h3 className="font-display text-lg text-foreground">Automation</h3>
                </div>
                <div className="ml-5 pl-4 border-l border-border space-y-2 text-sm text-muted">
                  <p>Automated content detection and scoring</p>
                  <p>Enhanced anti-gaming protections</p>
                  <p>Expanded engagement metrics</p>
                  <p>Performance-based tier system</p>
                </div>
              </div>

              {/* Phase 3 */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2 h-2 rounded-full bg-muted" />
                  <h3 className="font-display text-lg text-foreground">Scale</h3>
                </div>
                <div className="ml-5 pl-4 border-l border-border space-y-2 text-sm text-muted">
                  <p>Multi-platform content support</p>
                  <p>Advanced creator analytics</p>
                  <p>Community governance mechanisms</p>
                  <p>Protocol sustainability features</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <section className="py-20 sm:py-28 px-4 border-t border-border">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-display text-2xl sm:text-3xl text-foreground">
                  Recent Payouts
                </h2>
                <Link href="/leaderboard" className="text-sm text-muted hover:text-foreground transition-colors">
                  View All
                </Link>
              </div>

              <div className="space-y-0">
                {recentActivity.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-4 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-foreground">@{item.username}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-foreground">{item.amount.toFixed(3)} SOL</span>
                      <span className="text-sm text-muted">{item.time ? timeAgo(item.time) : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 sm:py-28 px-4 border-t border-border">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-2xl sm:text-3xl text-foreground mb-4">
              Start Earning
            </h2>
            <p className="text-muted mb-8">
              Connect your wallet and link your X account to begin.
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

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <Logo className="w-5 h-5 text-foreground" />
              <span className="font-display text-sm text-foreground">ATTENTION</span>
            </div>

            {/* Contract */}
            <div className="flex items-center gap-3">
              <code className="text-sm text-muted font-mono">{truncateWallet(CONTRACT_ADDRESS, 6)}</code>
              <button
                onClick={copyCA}
                className="p-2 rounded-lg text-muted hover:text-foreground transition-colors"
                title="Copy contract address"
              >
                <Copy className="w-4 h-4" />
              </button>
              <a
                href={`https://solscan.io/token/${CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg text-muted hover:text-foreground transition-colors"
                title="View on Solscan"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
