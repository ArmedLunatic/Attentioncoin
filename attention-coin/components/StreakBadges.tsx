'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Flame,
  Zap,
  Star,
  Crown,
  Wallet,
  Users,
  Award,
  Lock,
  Trophy,
} from 'lucide-react';

// Icon mapping
const iconMap: Record<string, any> = {
  Flame,
  Zap,
  Star,
  Crown,
  Wallet,
  Users,
  Award,
  Trophy,
};

// Color mapping
const colorMap: Record<string, string> = {
  blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  red: 'bg-red-500/20 text-red-400 border-red-500/30',
  yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  green: 'bg-green-500/20 text-green-400 border-green-500/30',
  cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  gold: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  primary: 'bg-primary/20 text-primary border-primary/30',
};

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  earned?: boolean;
  earned_at?: string;
}

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  compact?: boolean;
}

export function StreakDisplay({ currentStreak, longestStreak, compact = false }: StreakDisplayProps) {
  const streakLevel = currentStreak >= 30 ? 'legendary' : currentStreak >= 7 ? 'hot' : currentStreak >= 3 ? 'warming' : 'cold';

  const streakColors = {
    legendary: 'text-red-500',
    hot: 'text-orange-500',
    warming: 'text-yellow-500',
    cold: 'text-muted',
  };

  const streakBgs = {
    legendary: 'bg-red-500/20 border-red-500/30',
    hot: 'bg-orange-500/20 border-orange-500/30',
    warming: 'bg-yellow-500/20 border-yellow-500/30',
    cold: 'bg-surface border-border',
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${streakBgs[streakLevel]}`}>
        <Flame className={`w-4 h-4 ${streakColors[streakLevel]} ${currentStreak >= 7 ? 'animate-pulse' : ''}`} />
        <span className={`font-bold ${streakColors[streakLevel]}`}>{currentStreak}</span>
        <span className="text-xs text-muted">day streak</span>
      </div>
    );
  }

  return (
    <div className={`p-4 sm:p-6 rounded-2xl border ${streakBgs[streakLevel]}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            streakLevel === 'cold' ? 'bg-surface-light' : streakBgs[streakLevel].split(' ')[0]
          }`}>
            <Flame className={`w-6 h-6 ${streakColors[streakLevel]} ${currentStreak >= 7 ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <h3 className="font-semibold">Submission Streak</h3>
            <p className="text-xs text-muted">Submit daily to keep it going!</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 rounded-xl bg-background/50">
          <div className={`text-3xl sm:text-4xl font-bold ${streakColors[streakLevel]}`}>
            {currentStreak}
          </div>
          <div className="text-xs text-muted mt-1">Current</div>
        </div>
        <div className="text-center p-3 rounded-xl bg-background/50">
          <div className="text-3xl sm:text-4xl font-bold text-white">
            {longestStreak}
          </div>
          <div className="text-xs text-muted mt-1">Best</div>
        </div>
      </div>

      {currentStreak >= 3 && (
        <div className="mt-4 text-center">
          <span className={`text-sm ${streakColors[streakLevel]}`}>
            {streakLevel === 'legendary' && '🔥 LEGENDARY! Keep the fire burning!'}
            {streakLevel === 'hot' && '🔥 On fire! You\'re crushing it!'}
            {streakLevel === 'warming' && '✨ Great start! Keep going!'}
          </span>
        </div>
      )}
    </div>
  );
}

interface BadgeGridProps {
  badges: Badge[];
  earnedBadgeIds: string[];
  compact?: boolean;
}

export function BadgeGrid({ badges, earnedBadgeIds, compact = false }: BadgeGridProps) {
  const sortedBadges = [...badges].sort((a, b) => {
    const aEarned = earnedBadgeIds.includes(a.id);
    const bEarned = earnedBadgeIds.includes(b.id);
    if (aEarned && !bEarned) return -1;
    if (!aEarned && bEarned) return 1;
    return 0;
  });

  if (compact) {
    const earned = badges.filter(b => earnedBadgeIds.includes(b.id));
    return (
      <div className="flex flex-wrap gap-2">
        {earned.slice(0, 4).map((badge) => {
          const Icon = iconMap[badge.icon] || Trophy;
          return (
            <div
              key={badge.id}
              className={`p-2 rounded-lg border ${colorMap[badge.color] || colorMap.primary}`}
              title={badge.name}
            >
              <Icon className="w-4 h-4" />
            </div>
          );
        })}
        {earned.length > 4 && (
          <div className="p-2 rounded-lg bg-surface border border-border text-muted text-xs font-medium">
            +{earned.length - 4}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 rounded-2xl bg-surface border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Badges
        </h3>
        <span className="text-sm text-muted">
          {earnedBadgeIds.length}/{badges.length} earned
        </span>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-4 gap-2 sm:gap-3">
        {sortedBadges.map((badge, index) => {
          const Icon = iconMap[badge.icon] || Trophy;
          const earned = earnedBadgeIds.includes(badge.id);

          return (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`relative p-3 sm:p-4 rounded-xl border text-center transition-all ${
                earned
                  ? colorMap[badge.color] || colorMap.primary
                  : 'bg-surface-light border-border opacity-50 grayscale'
              }`}
              title={`${badge.name}: ${badge.description}`}
            >
              <Icon className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1" />
              <div className="text-[10px] sm:text-xs font-medium truncate">{badge.name}</div>
              {!earned && (
                <Lock className="absolute top-1 right-1 w-3 h-3 text-muted" />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// Default badges data (used if DB fetch fails)
export const defaultBadges: Badge[] = [
  { id: '1', name: 'First Post', description: 'Submit your first tweet', icon: 'Zap', color: 'blue' },
  { id: '2', name: 'Consistent', description: '7 day streak', icon: 'Flame', color: 'orange' },
  { id: '3', name: 'On Fire', description: '30 day streak', icon: 'Flame', color: 'red' },
  { id: '4', name: 'Rising Star', description: '10 approved', icon: 'Star', color: 'yellow' },
  { id: '5', name: 'Influencer', description: '50 approved', icon: 'Crown', color: 'purple' },
  { id: '6', name: 'Whale', description: 'Earned 1 SOL', icon: 'Wallet', color: 'green' },
  { id: '7', name: 'Recruiter', description: 'Refer 5 users', icon: 'Users', color: 'cyan' },
  { id: '8', name: 'Ambassador', description: 'Refer 25 users', icon: 'Award', color: 'gold' },
];
