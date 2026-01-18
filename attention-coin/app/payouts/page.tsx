'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  Wallet,
  Gift,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { useUser } from '@/components/WalletProvider';
import { supabase } from '@/lib/supabase';
import PayoutTimer from '@/components/PayoutTimer';
import { formatSol, timeAgo } from '@/lib/utils';

interface Payout {
  id: string;
  amount_lamports: number;
  payout_type: 'submission' | 'referral' | 'bonus';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  tx_signature: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
  completed_at: string | null;
}

export default function PayoutsPage() {
  const router = useRouter();
  const { connected } = useWallet();
  const { user, loading: userLoading } = useUser();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPaid: 0,
    pendingAmount: 0,
    totalPayouts: 0,
  });

  // Redirect if not connected
  useEffect(() => {
    if (!userLoading && !connected) {
      router.push('/');
    }
  }, [connected, userLoading, router]);

  const fetchPayouts = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payouts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching payouts:', error);
        setPayouts([]);
      } else {
        setPayouts(data || []);

        // Calculate stats
        const completed = (data || []).filter((p: Payout) => p.status === 'completed');
        const pending = (data || []).filter((p: Payout) => p.status === 'pending' || p.status === 'processing');

        setStats({
          totalPaid: completed.reduce((sum: number, p: Payout) => sum + p.amount_lamports, 0),
          pendingAmount: pending.reduce((sum: number, p: Payout) => sum + p.amount_lamports, 0),
          totalPayouts: completed.length,
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  if (userLoading || !connected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const statusConfig = {
    pending: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    processing: { icon: RefreshCw, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    completed: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
    failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  };

  const typeConfig = {
    submission: { icon: Zap, label: 'Submission Reward', color: 'text-primary' },
    referral: { icon: Gift, label: 'Referral Bonus', color: 'text-cyan-400' },
    bonus: { icon: TrendingUp, label: 'Bonus', color: 'text-purple-400' },
  };

  return (
    <div className="min-h-screen py-6 sm:py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg bg-surface border border-border hover:border-primary/50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-muted" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Payout History</h1>
              <p className="text-sm text-muted">Track your earnings and rewards</p>
            </div>
          </div>
          <button
            onClick={fetchPayouts}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-border text-sm hover:border-primary/50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats & Timer */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <PayoutTimer intervalHours={6} />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface border border-border rounded-xl p-4 sm:p-6"
          >
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-primary" />
              <span className="text-xs sm:text-sm text-muted">Total Paid</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-primary">
              {formatSol(stats.totalPaid)} SOL
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-surface border border-border rounded-xl p-4 sm:p-6"
          >
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              <span className="text-xs sm:text-sm text-muted">Pending</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold">
              {formatSol(stats.pendingAmount)} SOL
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-surface border border-border rounded-xl p-4 sm:p-6"
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs sm:text-sm text-muted">Completed</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold">{stats.totalPayouts}</div>
          </motion.div>
        </div>

        {/* Payouts List */}
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-border">
            <h2 className="font-semibold">Recent Payouts</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
            </div>
          ) : payouts.length === 0 ? (
            <div className="p-12 text-center">
              <Wallet className="w-12 h-12 text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No payouts yet</h3>
              <p className="text-muted text-sm">
                Submit tweets and get them approved to receive payouts
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {payouts.map((payout, index) => {
                const status = statusConfig[payout.status];
                const type = typeConfig[payout.payout_type];
                const StatusIcon = status.icon;
                const TypeIcon = type.icon;

                return (
                  <motion.div
                    key={payout.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 sm:p-6 hover:bg-surface-light/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Type & Amount */}
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-10 h-10 rounded-xl ${status.bg} flex items-center justify-center`}>
                          <TypeIcon className={`w-5 h-5 ${type.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{type.label}</div>
                          <div className="text-sm text-muted">{timeAgo(payout.created_at)}</div>
                        </div>
                      </div>

                      {/* Status */}
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${status.bg}`}>
                        <StatusIcon className={`w-4 h-4 ${status.color} ${payout.status === 'processing' ? 'animate-spin' : ''}`} />
                        <span className={`text-sm font-medium capitalize ${status.color}`}>
                          {payout.status}
                        </span>
                      </div>

                      {/* Amount */}
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">
                          +{formatSol(payout.amount_lamports)} SOL
                        </div>
                        {payout.tx_signature && (
                          <a
                            href={`https://solscan.io/tx/${payout.tx_signature}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-muted hover:text-primary transition-colors"
                          >
                            View TX
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-6 p-4 sm:p-6 rounded-xl bg-surface-light border border-border">
          <h3 className="font-semibold mb-3">How Payouts Work</h3>
          <ul className="space-y-2 text-sm text-muted">
            <li className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Payouts are processed every 6 hours automatically</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span>Only approved submissions are included in payouts</span>
            </li>
            <li className="flex items-start gap-2">
              <Gift className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
              <span>Referral bonuses are paid when your referrals earn rewards</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
