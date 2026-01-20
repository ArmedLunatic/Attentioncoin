'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useUser } from '@/components/WalletProvider';
import { motion, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, Copy, ExternalLink } from 'lucide-react';
import { CONTRACT_ADDRESS, CASHTAG, truncateWallet, formatNumber, timeAgo } from '@/lib/utils';
import { toast } from 'sonner';
import { EvidencePanel, EvidencePanelHeader, LiveIndicator } from '@/components/ui/EvidencePanel';
import { EvidenceFeed } from '@/components/ui/EvidenceFeed';
import { DepthField } from '@/components/ui/DepthField';
import { TiltPanel } from '@/components/ui/TiltPanel';
import { DexScreenerButton, XCommunityButton } from '@/components/ui/MagneticButton';
import { useScrollVelocity } from '@/hooks/usePhysics';

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
    txSignature?: string;
  }>;
}

// Animated number with momentum
function MomentumStat({ value, label }: { value: number; label: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const scrollVelocity = useScrollVelocity(0.1);

  // Spring for the momentum effect
  const momentum = useSpring(0, { stiffness: 300, damping: 30 });

  useEffect(() => {
    // Update momentum based on scroll velocity
    momentum.set(scrollVelocity.velocity * 0.5);
  }, [scrollVelocity.velocity, momentum]);

  // Transform momentum to rotation
  const rotation = useTransform(momentum, [-10, 0, 10], [-2, 0, 2]);

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <motion.div
      className="text-center"
      style={{ rotateZ: rotation }}
    >
      <div className="text-display-sm sm:text-display-md font-display text-foreground tabular-nums">
        {formatNumber(displayValue)}
      </div>
      <div className="text-caption uppercase tracking-widest text-text-tertiary mt-1">
        {label}
      </div>
    </motion.div>
  );
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

export default function Home() {
  const { isAuthenticated } = useUser();
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
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const copyCA = () => {
    navigator.clipboard.writeText(CONTRACT_ADDRESS);
    setCopied(true);
    toast.success('Contract address copied');
    setTimeout(() => setCopied(false), 2000);
  };

  // Transform activity data for EvidenceFeed
  const evidenceItems = (stats?.recentActivity || []).map((item, i) => ({
    id: `payout-${i}-${item.username}`,
    username: item.username,
    amount: item.amount,
    time: item.time ? timeAgo(item.time) : '',
    txSignature: item.txSignature,
  }));

  const totalPaid = stats?.totalPaidSol || 0;
  const creatorCount = stats?.activeCreators || 0;

  return (
    <div className="relative min-h-screen">
      {/* ============================================ */}
      {/* DEPTH FIELD - Living Background             */}
      {/* ============================================ */}
      <DepthField />

      {/* ============================================ */}
      {/* HERO: RESPONSIVE DEPTH EXPERIENCE           */}
      {/* ============================================ */}
      <section className="relative pt-24 sm:pt-32 pb-16 sm:pb-24 px-4 z-10">
        <div className="max-w-2xl mx-auto">
          {/* The Claim - Brief, confident */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
            className="text-center mb-8 sm:mb-10"
          >
            <h1 className="font-display text-display-md sm:text-display-lg lg:text-display-xl text-foreground mb-4">
              Earn SOL for
              <br />
              <span className="text-emerald-400">Driving Attention</span>
            </h1>
            <p className="text-body-md sm:text-body-lg text-text-secondary max-w-md mx-auto">
              Post about {CASHTAG} on X. Get rewarded based on real engagement.
            </p>
          </motion.div>

          {/* Utility Access Nodes - Dex + X */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
            className="flex flex-wrap items-center justify-center gap-3 mb-8 sm:mb-10"
          >
            <DexScreenerButton tokenAddress={CONTRACT_ADDRESS} />
            <XCommunityButton handle="AttentionSol" />
          </motion.div>

          {/* The Evidence - Dominant element with 3D tilt */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.32, 0.72, 0, 1] }}
          >
            <TiltPanel maxTilt={4} glareEnabled={true}>
              <EvidencePanel>
                <EvidencePanelHeader
                  title="Recent Payouts"
                  badge={<LiveIndicator />}
                />
                <EvidenceFeed
                  items={evidenceItems}
                  maxVisible={4}
                  autoScrollInterval={3500}
                />
              </EvidencePanel>
            </TiltPanel>
          </motion.div>

          {/* Stats with Momentum */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex justify-center gap-16 sm:gap-20 mt-12 sm:mt-14"
          >
            <MomentumStat value={totalPaid} label="SOL Paid" />
            <MomentumStat value={creatorCount} label="Creators" />
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5, ease: [0.32, 0.72, 0, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10 sm:mt-12"
          >
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <a
              href="#how-it-works"
              className="btn-secondary w-full sm:w-auto text-center"
            >
              Learn More
            </a>
          </motion.div>
        </div>
      </section>

      {/* ============================================ */}
      {/* HOW IT WORKS                                 */}
      {/* ============================================ */}
      <section id="how-it-works" className="relative py-20 sm:py-28 px-4 border-t border-white/[0.04] z-10">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-display text-display-sm sm:text-display-md text-foreground mb-12 sm:mb-16 text-center">
              How It Works
            </h2>

            <div className="grid sm:grid-cols-3 gap-10 sm:gap-8">
              {[
                {
                  step: '01',
                  title: 'Post',
                  description: `Tweet with ${CASHTAG} or the contract address.`,
                },
                {
                  step: '02',
                  title: 'Get Approved',
                  description: 'Quality + engagement review by our team.',
                },
                {
                  step: '03',
                  title: 'Earn SOL',
                  description: 'Fair, engagement-weighted split from the payout pool.',
                },
              ].map((item, i) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="text-center sm:text-left"
                >
                  <div className="text-emerald-500 text-caption font-mono mb-3">
                    {item.step}
                  </div>
                  <h3 className="font-display text-heading-lg text-foreground mb-2">
                    {item.title}
                  </h3>
                  <p className="text-body-sm text-text-secondary leading-relaxed">
                    {item.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================ */}
      {/* MECHANICS                                    */}
      {/* ============================================ */}
      <section className="relative py-20 sm:py-28 px-4 border-t border-white/[0.04] z-10">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-display text-display-sm sm:text-display-md text-foreground mb-12 sm:mb-16 text-center">
              Transparent Mechanics
            </h2>

            <div className="grid sm:grid-cols-2 gap-12 sm:gap-16">
              <div>
                <h3 className="font-display text-heading-lg text-foreground mb-4">
                  Scoring
                </h3>
                <ul className="space-y-3 text-body-sm text-text-secondary">
                  <li className="flex gap-3">
                    <span className="w-1 h-1 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                    Engagement weighted by value: quotes, reposts, replies, likes
                  </li>
                  <li className="flex gap-3">
                    <span className="w-1 h-1 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                    Account trust factors: age, followers, history
                  </li>
                  <li className="flex gap-3">
                    <span className="w-1 h-1 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                    Content quality signals: length, originality, media
                  </li>
                </ul>
                <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <code className="text-body-sm text-text-secondary font-mono">
                    Score = Engagement × Trust × Quality
                  </code>
                </div>
              </div>

              <div>
                <h3 className="font-display text-heading-lg text-foreground mb-4">
                  Payouts
                </h3>
                <ul className="space-y-3 text-body-sm text-text-secondary">
                  <li className="flex gap-3">
                    <span className="w-1 h-1 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                    Pool distributed proportionally to scores
                  </li>
                  <li className="flex gap-3">
                    <span className="w-1 h-1 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                    Streak bonuses: 3-day, 7-day, 30-day multipliers
                  </li>
                  <li className="flex gap-3">
                    <span className="w-1 h-1 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                    Referral earnings: 10% of referred users' payouts
                  </li>
                </ul>
                <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <code className="text-body-sm text-text-secondary font-mono">
                    {stats?.pool?.intervalHours
                      ? stats.pool.intervalHours >= 24
                        ? 'Payouts: Daily'
                        : `Payouts: Every ${stats.pool.intervalHours}h`
                      : 'Payouts: Regular intervals'}
                  </code>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================ */}
      {/* ROADMAP                                      */}
      {/* ============================================ */}
      <section className="relative py-20 sm:py-28 px-4 border-t border-white/[0.04] z-10">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-display text-display-sm sm:text-display-md text-foreground mb-12 sm:mb-16 text-center">
              Protocol Evolution
            </h2>

            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gradient-to-b from-emerald-500/50 via-white/10 to-transparent" />

              <div className="space-y-10">
                {[
                  {
                    phase: 'Foundation',
                    status: 'active',
                    items: [
                      'Core payout infrastructure operational',
                      'Engagement scoring engine deployed',
                      'Wallet verification and linking',
                    ],
                  },
                  {
                    phase: 'Automation',
                    status: 'upcoming',
                    items: [
                      'Automated content detection',
                      'Enhanced anti-gaming protections',
                      'Performance-based tier system',
                    ],
                  },
                  {
                    phase: 'Scale',
                    status: 'upcoming',
                    items: [
                      'Multi-platform support',
                      'Advanced creator analytics',
                      'Community governance',
                    ],
                  },
                ].map((phase, index) => (
                  <motion.div
                    key={phase.phase}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="relative pl-8"
                  >
                    {/* Dot */}
                    <div
                      className={`absolute left-0 top-1 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center ${
                        phase.status === 'active'
                          ? 'border-emerald-500 bg-emerald-500/20'
                          : 'border-white/20 bg-white/5'
                      }`}
                    >
                      {phase.status === 'active' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      )}
                    </div>

                    <h3 className="font-display text-heading-md text-foreground mb-3">
                      {phase.phase}
                      {phase.status === 'active' && (
                        <span className="ml-2 text-caption text-emerald-400 font-normal">
                          Current
                        </span>
                      )}
                    </h3>
                    <ul className="space-y-2">
                      {phase.items.map((item, i) => (
                        <li
                          key={i}
                          className="text-body-sm text-text-secondary flex items-start gap-2"
                        >
                          <span
                            className={`w-1 h-1 rounded-full mt-2 flex-shrink-0 ${
                              phase.status === 'active'
                                ? 'bg-emerald-500/50'
                                : 'bg-white/20'
                            }`}
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FINAL CTA                                    */}
      {/* ============================================ */}
      <section className="relative py-20 sm:py-28 px-4 border-t border-white/[0.04] z-10">
        <div className="max-w-xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-display text-display-sm sm:text-display-md text-foreground mb-4">
              Start Earning
            </h2>
            <p className="text-body-md text-text-secondary mb-8">
              Verify your X account and add your Solana address to begin.
            </p>

            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="btn-primary inline-flex items-center gap-2"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="btn-primary inline-flex items-center gap-2"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </motion.div>
        </div>
      </section>

      {/* ============================================ */}
      {/* FOOTER                                       */}
      {/* ============================================ */}
      <footer className="relative border-t border-white/[0.04] py-12 px-4 z-10">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <Logo className="w-5 h-5 text-emerald-500" />
              <span className="font-display text-body-sm text-foreground">
                ATTENTION
              </span>
            </Link>

            {/* Contract */}
            <div className="flex items-center gap-3">
              <code className="text-body-sm text-text-tertiary font-mono">
                {truncateWallet(CONTRACT_ADDRESS, 6)}
              </code>
              <button
                onClick={copyCA}
                className="p-2 rounded-lg text-text-tertiary hover:text-foreground hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors"
                title="Copy contract address"
              >
                <Copy className="w-4 h-4" />
              </button>
              <a
                href={`https://solscan.io/token/${CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg text-text-tertiary hover:text-foreground hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors"
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
