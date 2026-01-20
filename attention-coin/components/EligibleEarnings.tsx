'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coins,
  TrendingUp,
  Clock,
  Sparkles,
  Info,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';
import { useUser } from '@/components/WalletProvider';
import { AnimatedCounter } from '@/components/ui';

interface EarningsData {
  eligible: boolean;
  userScore: number;
  totalPoolScore: number;
  sharePercentage: number;
  estimatedSol: number;
  maxPossibleSol: number;
  approvedSubmissions: number;
  dailyBudgetSol: number;
  message: string;
}

interface PoolData {
  totalPoolScore: number;
  totalParticipants: number;
  dailyBudgetSol: number;
  nextPayoutTime: string;
}

export default function EligibleEarnings() {
  const { user, isAuthenticated } = useUser();
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [pool, setPool] = useState<PoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchEarnings = useCallback(async () => {
    if (!isAuthenticated || !user?.x_username) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/earnings?username=${encodeURIComponent(user.x_username)}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch earnings');
      }

      setEarnings(result.data.earnings);
      setPool(result.data.pool);
    } catch (err) {
      console.error('Error fetching earnings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [user?.x_username, isAuthenticated]);

  useEffect(() => {
    fetchEarnings();

    // Refresh every 30 seconds
    const interval = setInterval(fetchEarnings, 30000);
    return () => clearInterval(interval);
  }, [fetchEarnings]);

  // Calculate time until next payout
  const getTimeUntilPayout = () => {
    if (!pool?.nextPayoutTime) return null;
    const now = new Date();
    const next = new Date(pool.nextPayoutTime);
    const diff = next.getTime() - now.getTime();

    if (diff <= 0) return 'Processing...';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-surface to-surface border border-primary/20 animate-pulse">
        <div className="h-6 w-32 bg-surface-light rounded mb-4" />
        <div className="h-10 w-24 bg-surface-light rounded mb-2" />
        <div className="h-4 w-48 bg-surface-light rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-surface border border-red-500/20">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={fetchEarnings}
          className="mt-2 text-sm text-muted hover:text-white flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    );
  }

  const hasEarnings = earnings && earnings.estimatedSol > 0;
  const isAtMax = earnings && earnings.estimatedSol >= earnings.maxPossibleSol;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl border transition-all ${
        hasEarnings
          ? 'bg-gradient-to-br from-primary/15 via-primary/5 to-surface border-primary/30'
          : 'bg-surface border-border'
      }`}
    >
      {/* Glow effect for users with earnings */}
      {hasEarnings && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 animate-pulse" />
      )}

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              hasEarnings ? 'bg-primary/20' : 'bg-surface-light'
            }`}>
              {hasEarnings ? (
                <Sparkles className="w-5 h-5 text-primary" />
              ) : (
                <Coins className="w-5 h-5 text-muted" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-lg">Eligible Earnings</h3>
              <p className="text-xs text-muted">Next payout in {getTimeUntilPayout()}</p>
            </div>
          </div>

          <motion.button
            onClick={fetchEarnings}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-lg hover:bg-surface-light transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-muted ${loading ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>

        {/* Main Earnings Display */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-bold ${hasEarnings ? 'text-primary' : 'text-muted'}`}>
              {earnings ? (
                <AnimatedCounter
                  value={earnings.estimatedSol}
                  decimals={4}
                />
              ) : (
                '0.0000'
              )}
            </span>
            <span className="text-xl text-muted">SOL</span>
            {isAtMax && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-2 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium flex items-center gap-1"
              >
                <Zap className="w-3 h-3" />
                MAX
              </motion.span>
            )}
          </div>

          {/* Message */}
          <p className={`text-sm mt-2 ${hasEarnings ? 'text-primary/80' : 'text-muted'}`}>
            {earnings?.message || 'Submit tweets and get approved to earn SOL'}
          </p>
        </div>

        {/* Share percentage bar */}
        {earnings && earnings.totalPoolScore > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted">Your share of daily pool</span>
              <span className={hasEarnings ? 'text-primary font-medium' : 'text-muted'}>
                {earnings.sharePercentage.toFixed(2)}%
              </span>
            </div>
            <div className="h-2 bg-surface-light rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-foreground"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(earnings.sharePercentage, 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* Expand/Collapse for details */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 py-2 text-sm text-muted hover:text-white transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Hide details
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show details
            </>
          )}
        </button>

        {/* Expandable Details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-4 border-t border-border space-y-3">
                {/* Your Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-surface-light">
                    <div className="flex items-center gap-2 text-muted text-xs mb-1">
                      <TrendingUp className="w-3 h-3" />
                      Your Score
                    </div>
                    <p className="font-semibold">{earnings?.userScore.toFixed(1) || '0'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-light">
                    <div className="flex items-center gap-2 text-muted text-xs mb-1">
                      <Coins className="w-3 h-3" />
                      Approved Posts
                    </div>
                    <p className="font-semibold">{earnings?.approvedSubmissions || 0}</p>
                  </div>
                </div>

                {/* Pool Stats */}
                <div className="p-3 rounded-lg bg-surface-light/50 border border-border">
                  <p className="text-xs text-muted mb-2 font-medium">Today's Pool</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-primary">{pool?.dailyBudgetSol || 10}</p>
                      <p className="text-xs text-muted">SOL Budget</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{pool?.totalParticipants || 0}</p>
                      <p className="text-xs text-muted">Participants</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{pool?.totalPoolScore.toFixed(0) || 0}</p>
                      <p className="text-xs text-muted">Total Score</p>
                    </div>
                  </div>
                </div>

                {/* How it works */}
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-muted">
                      <p className="font-medium text-blue-400 mb-1">How payouts work:</p>
                      <ul className="space-y-1 list-disc list-inside">
                        <li>Earnings are proportional to your score</li>
                        <li>Max {earnings?.maxPossibleSol || 1} SOL per person per day</li>
                        <li>Payouts process daily at midnight UTC</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
