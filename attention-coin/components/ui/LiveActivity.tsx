'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ActivityItem {
  id: string;
  username: string;
  amount: number;
  time: string;
  type?: 'payout' | 'submission' | 'referral';
}

interface LiveActivityFeedProps {
  items: ActivityItem[];
  maxItems?: number;
}

export function LiveActivityFeed({ items, maxItems = 5 }: LiveActivityFeedProps) {
  const displayItems = items.slice(0, maxItems);

  return (
    <div className="space-y-0">
      <AnimatePresence mode="popLayout">
        {displayItems.map((item, index) => (
          <ActivityRow key={item.id || index} item={item} index={index} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ActivityRow({ item, index }: { item: ActivityItem; index: number }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20, height: 0 }}
      animate={{ opacity: 1, x: 0, height: 'auto' }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="group"
    >
      <div className="flex items-center justify-between py-4 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors px-2 -mx-2 rounded-lg">
        <div className="flex items-center gap-4">
          {/* Avatar with gradient */}
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500/20 to-violet-500/20 flex items-center justify-center text-sm font-medium text-foreground">
              {item.username.charAt(0).toUpperCase()}
            </div>
            {/* Live indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background">
              <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
            </div>
          </div>

          <div>
            <span className="text-foreground font-medium">@{item.username}</span>
            {item.type && (
              <span className="ml-2 text-caption text-text-tertiary">
                {item.type === 'payout' && 'received payout'}
                {item.type === 'submission' && 'submitted post'}
                {item.type === 'referral' && 'referral bonus'}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <motion.span
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="font-mono text-foreground font-medium"
          >
            +{item.amount.toFixed(3)} <span className="text-emerald-400">SOL</span>
          </motion.span>
          <span className="text-caption text-text-tertiary min-w-[60px] text-right">
            {item.time}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

interface LivePulseProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'emerald' | 'violet' | 'default';
}

export function LivePulse({ className = '', size = 'md', color = 'emerald' }: LivePulseProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  const colorClasses = {
    emerald: 'bg-emerald-500',
    violet: 'bg-violet-500',
    default: 'bg-white',
  };

  return (
    <span className={`relative flex ${sizeClasses[size]} ${className}`}>
      <span
        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${colorClasses[color]}`}
      />
      <span
        className={`relative inline-flex rounded-full h-full w-full ${colorClasses[color]}`}
      />
    </span>
  );
}

interface LiveBadgeProps {
  children?: React.ReactNode;
}

export function LiveBadge({ children = 'Live' }: LiveBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
      <LivePulse size="sm" />
      <span className="text-caption font-medium text-emerald-400 uppercase tracking-wider">
        {children}
      </span>
    </div>
  );
}

interface RealtimeCounterProps {
  baseValue: number;
  incrementRange?: [number, number];
  intervalMs?: number;
  suffix?: string;
  prefix?: string;
}

export function RealtimeCounter({
  baseValue,
  incrementRange = [0.001, 0.01],
  intervalMs = 3000,
  suffix = '',
  prefix = '',
}: RealtimeCounterProps) {
  const [value, setValue] = useState(baseValue);

  useEffect(() => {
    setValue(baseValue);
  }, [baseValue]);

  useEffect(() => {
    const interval = setInterval(() => {
      const increment =
        Math.random() * (incrementRange[1] - incrementRange[0]) + incrementRange[0];
      setValue((prev) => prev + increment);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [incrementRange, intervalMs]);

  return (
    <motion.span
      key={Math.floor(value * 100)}
      initial={{ opacity: 0.5, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="tabular-nums"
    >
      {prefix}
      {value.toFixed(3)}
      {suffix}
    </motion.span>
  );
}

interface ActivityNotificationProps {
  username: string;
  amount: number;
  onClose?: () => void;
}

export function ActivityNotification({ username, amount, onClose }: ActivityNotificationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose?.();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      className="fixed bottom-6 right-6 z-50"
    >
      <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-[#0a0a0f]/95 backdrop-blur-xl border border-emerald-500/20 shadow-[0_0_40px_rgba(4,120,87,0.15)]">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center text-emerald-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <div>
          <div className="text-body-sm text-text-secondary">New payout</div>
          <div className="text-foreground font-medium">
            @{username} earned <span className="text-emerald-400">{amount.toFixed(3)} SOL</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
