'use client';

import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
}: SkeletonProps) {
  const baseClasses = 'relative overflow-hidden bg-surface-light';

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{ width, height }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
}

// Pre-built skeleton patterns
export function StatCardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton variant="circular" className="w-4 h-4" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-8 w-24" />
    </div>
  );
}

export function SubmissionCardSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-surface border border-border">
      <div className="flex items-start justify-between gap-4 mb-3">
        <Skeleton className="h-4 flex-1" />
        <Skeleton variant="circular" className="w-4 h-4" />
      </div>
      <div className="flex items-center gap-4 mb-3">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-12" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

export function LeaderboardRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-border">
      <Skeleton className="w-10 h-6" />
      <Skeleton variant="circular" className="w-8 h-8" />
      <div className="flex-1">
        <Skeleton className="h-5 w-32 mb-1" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-6 w-16" />
    </div>
  );
}

export function PayoutRowSkeleton() {
  return (
    <div className="p-4 sm:p-6 flex items-center gap-4">
      <Skeleton variant="circular" className="w-10 h-10 rounded-xl" />
      <div className="flex-1">
        <Skeleton className="h-5 w-32 mb-1" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-6 w-20 rounded-lg" />
      <Skeleton className="h-6 w-24" />
    </div>
  );
}

export function BadgeSkeleton() {
  return (
    <div className="p-3 sm:p-4 rounded-xl bg-surface-light border border-border">
      <Skeleton variant="circular" className="w-6 h-6 mx-auto mb-2" />
      <Skeleton className="h-3 w-12 mx-auto" />
    </div>
  );
}
