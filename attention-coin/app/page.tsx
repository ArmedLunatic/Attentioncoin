'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { motion } from 'framer-motion';
import { ArrowRight, Zap } from 'lucide-react';
import { CONTRACT_ADDRESS, CASHTAG, truncateWallet } from '@/lib/utils';
import { motion as motionTokens } from '@/lib/design-tokens';
import GrowthMap from '@/components/GrowthMap';

/**
 * Attention Coin Homepage
 *
 * Structure (LOCKED):
 * 1. Hero Section - One headline, one subline, one CTA
 * 2. Growth Map Section - Visual protocol evolution
 *
 * Design Principles:
 * - Minimal, calm, confident
 * - High-contrast, intentional
 * - No visual noise
 * - Declarative tone only
 */

// Stats interface for live data
interface PlatformStats {
  totalPaidSol: number;
  activeCreators: number;
  pool: {
    budgetSol: number;
  };
}

export default function Home() {
  const { connected } = useWallet();
  const [stats, setStats] = useState<PlatformStats | null>(null);

  // Fetch platform stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/stats');
      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return (
    <div className="relative min-h-screen">
      {/* Background - subtle, premium */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 grid-bg opacity-[0.015]" />
        <div
          className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* HERO SECTION                                                            */}
      {/* Purpose: Immediate legitimacy and clarity                               */}
      {/* Requirements: One headline, one subline, one CTA, one visual anchor     */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative pt-24 sm:pt-32 md:pt-40 pb-16 sm:pb-24 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: motionTokens.duration.slow / 1000,
              ease: [0.4, 0, 0.2, 1],
            }}
            className="text-center"
          >
            {/* Visual anchor - live indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: motionTokens.duration.default / 1000,
                ease: [0.4, 0, 0.2, 1],
                delay: 0.1,
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border mb-8 sm:mb-10"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs sm:text-sm text-muted-light">
                {stats?.activeCreators
                  ? `${stats.activeCreators} creators earning`
                  : 'Protocol active'}
              </span>
            </motion.div>

            {/* Dominant headline - declarative, no hype */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter mb-5 sm:mb-6 text-white leading-[1.1]">
              Attention Creates Value
            </h1>

            {/* Supporting subline - single line, clear */}
            <p className="text-base sm:text-lg md:text-xl text-muted-light max-w-xl mx-auto mb-8 sm:mb-10 leading-relaxed">
              A protocol that rewards meaningful contribution to{' '}
              <span className="text-white font-medium">{CASHTAG}</span>
            </p>

            {/* Single primary CTA */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: motionTokens.duration.default / 1000,
                ease: [0.4, 0, 0.2, 1],
                delay: 0.15,
              }}
            >
              {connected ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 bg-primary text-black font-semibold px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl transition-all duration-200 hover:shadow-glow-md"
                  style={{
                    transition: `all ${motionTokens.duration.default}ms cubic-bezier(0.4, 0, 0.2, 1)`,
                  }}
                >
                  Enter Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <WalletMultiButton />
              )}
            </motion.div>

            {/* Minimal stat anchor - single metric */}
            {stats && stats.totalPaidSol > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  duration: motionTokens.duration.default / 1000,
                  ease: [0.4, 0, 0.2, 1],
                  delay: 0.25,
                }}
                className="mt-12 sm:mt-16 text-sm text-muted"
              >
                <span className="text-white font-semibold tabular-nums">
                  {stats.totalPaidSol.toFixed(2)} SOL
                </span>{' '}
                distributed to contributors
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* GROWTH MAP SECTION                                                      */}
      {/* Purpose: Communicate expansion, automation, and ecosystem evolution     */}
      {/* This is NOT a traditional roadmap - it's a living visual growth map     */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <GrowthMap />

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MINIMAL FOOTER                                                          */}
      {/* Clean, informational only                                               */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-border py-8 sm:py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="font-semibold text-sm tracking-tight text-white">
                ATTENTION
              </span>
            </div>

            {/* Contract reference */}
            <div className="flex items-center gap-3 text-xs text-muted">
              <span>{CASHTAG}</span>
              <span className="text-border-light">|</span>
              <span className="font-mono">{truncateWallet(CONTRACT_ADDRESS, 4)}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
