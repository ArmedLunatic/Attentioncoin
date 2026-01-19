'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';
import { Trophy, Medal, TrendingUp, RefreshCw, Crown } from 'lucide-react';
import { getLeaderboard, supabase } from '@/lib/supabase';
import { formatNumber, truncateWallet } from '@/lib/utils';
import type { LeaderboardEntry } from '@/types';

const periods = [
  { key: 'day', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All Time' },
] as const;

function LeaderboardRow({ entry, index }: { entry: LeaderboardEntry; index: number }) {
  const { publicKey } = useWallet();
  const isCurrentUser = publicKey?.toBase58() === entry.wallet_address;

  const rankColors: Record<number, string> = {
    1: 'text-yellow-400',
    2: 'text-gray-300',
    3: 'text-amber-600',
  };

  const rankBgs: Record<number, string> = {
    1: 'bg-yellow-400/10 border-yellow-400/30',
    2: 'bg-gray-300/10 border-gray-300/30',
    3: 'bg-amber-600/10 border-amber-600/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`flex items-center gap-2 sm:gap-4 p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 ${
        isCurrentUser
          ? 'bg-primary/8 border-primary/25'
          : entry.rank <= 3
          ? rankBgs[entry.rank] || 'bg-surface/80 border-border'
          : 'bg-surface/80 border-border hover:border-border-light hover:bg-surface'
      }`}
    >
      {/* Rank */}
      <div className={`w-8 sm:w-10 text-center font-bold ${
        entry.rank <= 3 ? rankColors[entry.rank] || 'text-muted' : 'text-muted'
      }`}>
        {entry.rank === 1 && <Crown className="w-5 sm:w-6 h-5 sm:h-6 mx-auto text-yellow-400" />}
        {entry.rank === 2 && <Medal className="w-4 sm:w-5 h-4 sm:h-5 mx-auto text-gray-300" />}
        {entry.rank === 3 && <Medal className="w-4 sm:w-5 h-4 sm:h-5 mx-auto text-amber-600" />}
        {entry.rank > 3 && <span className="text-sm sm:text-base">#{entry.rank}</span>}
      </div>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-bold text-xs sm:text-sm">
              {(entry.x_username || entry.wallet_address).charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate text-sm sm:text-base">
              {entry.x_username ? `@${entry.x_username}` : truncateWallet(entry.wallet_address, 4)}
            </div>
            {isCurrentUser && (
              <span className="sm:hidden px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px]">
                You
              </span>
            )}
          </div>
          {isCurrentUser && (
            <span className="hidden sm:inline px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs">
              You
            </span>
          )}
        </div>
      </div>

      {/* Stats - Hidden on mobile */}
      <div className="hidden sm:flex items-center gap-6">
        <div className="text-right">
          <div className="text-xs text-muted">Posts</div>
          <div className="font-medium">{entry.submission_count}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted">Earned</div>
          <div className="font-medium text-primary">{entry.total_earned.toFixed(2)} SOL</div>
        </div>
      </div>

      {/* Score */}
      <div className="text-right min-w-[50px] sm:min-w-[80px]">
        <div className="text-[10px] sm:text-xs text-muted">Score</div>
        <div className="font-bold text-base sm:text-lg">{formatNumber(Math.round(entry.total_score))}</div>
      </div>
    </motion.div>
  );
}

export default function LeaderboardPage() {
  const { publicKey } = useWallet();
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'all'>('week');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLeaderboard(period, 50);
      setLeaderboard(data);

      // Find current user's rank
      if (publicKey) {
        const userEntry = data.find(e => e.wallet_address === publicKey.toBase58());
        setUserRank(userEntry?.rank || null);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }, [period, publicKey]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Real-time subscription for leaderboard updates
  useEffect(() => {
    // Subscribe to submission status changes (approved = leaderboard update)
    const channel = supabase
      .channel('leaderboard-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'submissions',
        },
        (payload) => {
          // Refetch leaderboard when any submission is updated (e.g., approved)
          if (payload.new && (payload.new as any).status === 'approved') {
            fetchLeaderboard();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLeaderboard]);

  return (
    <div className="min-h-screen py-6 sm:py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header - refined */}
        <div className="text-center mb-8 sm:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface/80 border border-border mb-4 sm:mb-6">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="text-xs sm:text-sm text-muted-light">Top Attention Drivers</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3 sm:mb-4">Leaderboard</h1>
            <p className="text-sm sm:text-base text-muted">
              Rankings based on total engagement score
            </p>
          </motion.div>
        </div>

        {/* Period Selector - premium styling */}
        <div className="flex items-center justify-center gap-2 sm:gap-2 mb-8 sm:mb-10 flex-wrap">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                period === p.key
                  ? 'bg-foreground text-background'
                  : 'bg-surface border border-border text-muted hover:text-foreground hover:border-border-light'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* User's Rank Card */}
        {publicKey && userRank && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 sm:p-6 rounded-2xl bg-primary/8 border border-primary/20 mb-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="text-sm text-muted">Your Rank</div>
                  <div className="text-2xl font-bold">#{userRank}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-light">Keep posting to climb!</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Leaderboard List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-20">
              <Trophy className="w-12 h-12 text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No entries yet</h3>
              <p className="text-muted">Be the first to submit and get on the leaderboard!</p>
            </div>
          ) : (
            leaderboard.map((entry, index) => (
              <LeaderboardRow key={entry.wallet_address} entry={entry} index={index} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
