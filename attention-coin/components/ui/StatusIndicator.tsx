'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Clock, XCircle, Loader2, Wallet } from 'lucide-react';

type Status = 'pending' | 'approved' | 'rejected' | 'paid' | 'processing';

interface StatusIndicatorProps {
  status: Status;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animate?: boolean;
}

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/30',
    label: 'Pending Review',
    pulseColor: 'bg-yellow-500',
  },
  processing: {
    icon: Loader2,
    color: 'text-blue-500',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/30',
    label: 'Processing',
    pulseColor: 'bg-blue-500',
  },
  approved: {
    icon: CheckCircle2,
    color: 'text-primary',
    bg: 'bg-primary/20',
    border: 'border-primary/30',
    label: 'Approved',
    pulseColor: 'bg-primary',
  },
  rejected: {
    icon: XCircle,
    color: 'text-red-500',
    bg: 'bg-red-500/20',
    border: 'border-red-500/30',
    label: 'Rejected',
    pulseColor: 'bg-red-500',
  },
  paid: {
    icon: Wallet,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/30',
    label: 'Paid',
    pulseColor: 'bg-emerald-500',
  },
};

const sizeConfig = {
  sm: { icon: 'w-3.5 h-3.5', text: 'text-xs', padding: 'px-2 py-1', gap: 'gap-1' },
  md: { icon: 'w-4 h-4', text: 'text-sm', padding: 'px-2.5 py-1.5', gap: 'gap-1.5' },
  lg: { icon: 'w-5 h-5', text: 'text-base', padding: 'px-3 py-2', gap: 'gap-2' },
};

export function StatusIndicator({
  status,
  size = 'md',
  showLabel = true,
  animate = true,
}: StatusIndicatorProps) {
  const config = statusConfig[status];
  const sizes = sizeConfig[size];
  const Icon = config.icon;
  const shouldPulse = animate && (status === 'pending' || status === 'processing');
  const shouldSpin = status === 'processing';

  return (
    <div
      className={`inline-flex items-center ${sizes.gap} ${sizes.padding} rounded-full ${config.bg} border ${config.border}`}
    >
      <div className="relative">
        {shouldPulse && (
          <motion.span
            className={`absolute inset-0 rounded-full ${config.pulseColor} opacity-40`}
            animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
        <Icon
          className={`${sizes.icon} ${config.color} ${shouldSpin ? 'animate-spin' : ''}`}
        />
      </div>
      {showLabel && (
        <span className={`${sizes.text} font-medium ${config.color}`}>
          {config.label}
        </span>
      )}
    </div>
  );
}

// Minimal dot indicator
export function StatusDot({
  status,
  size = 'md',
  pulse = true,
}: {
  status: Status;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}) {
  const config = statusConfig[status];
  const dotSizes = { sm: 'w-2 h-2', md: 'w-2.5 h-2.5', lg: 'w-3 h-3' };
  const shouldPulse = pulse && (status === 'pending' || status === 'processing');

  return (
    <span className="relative inline-flex">
      {shouldPulse && (
        <motion.span
          className={`absolute inset-0 rounded-full ${config.pulseColor}`}
          animate={{ scale: [1, 2], opacity: [0.6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
      <span className={`relative ${dotSizes[size]} rounded-full ${config.pulseColor}`} />
    </span>
  );
}

// Progress through states animation
export function StatusProgress({
  currentStatus,
}: {
  currentStatus: Status;
}) {
  const states: Status[] = ['pending', 'approved', 'paid'];
  const currentIndex = states.indexOf(currentStatus === 'rejected' ? 'pending' : currentStatus);

  return (
    <div className="flex items-center gap-1">
      {states.map((state, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;
        const config = statusConfig[state];

        return (
          <div key={state} className="flex items-center">
            <motion.div
              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                isComplete || isCurrent ? config.bg : 'bg-surface-light'
              } ${isCurrent ? `border ${config.border}` : ''}`}
              initial={false}
              animate={{
                scale: isCurrent ? [1, 1.1, 1] : 1,
              }}
              transition={{
                duration: 2,
                repeat: isCurrent ? Infinity : 0,
              }}
            >
              {isComplete ? (
                <CheckCircle2 className={`w-4 h-4 ${config.color}`} />
              ) : (
                <span
                  className={`w-2 h-2 rounded-full ${
                    isCurrent ? config.pulseColor : 'bg-muted'
                  }`}
                />
              )}
            </motion.div>
            {index < states.length - 1 && (
              <div
                className={`w-8 h-0.5 ${
                  isComplete ? 'bg-primary' : 'bg-surface-light'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
