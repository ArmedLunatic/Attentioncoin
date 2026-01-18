'use client';

import { forwardRef, HTMLAttributes } from 'react';
import { motion, MotionProps } from 'framer-motion';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'gradient' | 'glow';
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: '',
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-6',
  lg: 'p-6 sm:p-8',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = 'default',
      hover = true,
      padding = 'md',
      className = '',
      ...props
    },
    ref
  ) => {
    const baseClasses = 'rounded-2xl transition-all duration-300';

    const variantClasses = {
      default: 'bg-surface border border-border',
      glass: 'bg-surface/50 backdrop-blur-xl border border-white/10',
      gradient: 'bg-gradient-to-br from-surface to-surface-light border border-border',
      glow: 'bg-surface border border-primary/20 shadow-[0_0_30px_rgba(0,255,136,0.1)]',
    };

    const hoverClasses = hover
      ? 'hover:border-border-light hover:-translate-y-0.5 hover:shadow-lg'
      : '';

    return (
      <div
        ref={ref}
        className={`
          ${baseClasses}
          ${variantClasses[variant]}
          ${hoverClasses}
          ${paddingClasses[padding]}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Animated card with motion
export const MotionCard = forwardRef<
  HTMLDivElement,
  CardProps & MotionProps
>(({ children, variant = 'default', hover = true, padding = 'md', className = '', ...props }, ref) => {
  const baseClasses = 'rounded-2xl';

  const variantClasses = {
    default: 'bg-surface border border-border',
    glass: 'bg-surface/50 backdrop-blur-xl border border-white/10',
    gradient: 'bg-gradient-to-br from-surface to-surface-light border border-border',
    glow: 'bg-surface border border-primary/20 shadow-[0_0_30px_rgba(0,255,136,0.1)]',
  };

  return (
    <motion.div
      ref={ref}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${paddingClasses[padding]}
        ${className}
      `}
      whileHover={hover ? { y: -2, transition: { duration: 0.2 } } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
});

MotionCard.displayName = 'MotionCard';

// Stat card with animated value
interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  iconColor?: string;
  trend?: { value: number; positive: boolean };
  loading?: boolean;
}

export function StatCard({
  label,
  value,
  icon,
  iconColor = 'text-primary',
  trend,
  loading = false,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-border rounded-xl p-4 sm:p-6 hover:border-border-light transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon && <span className={iconColor}>{icon}</span>}
          <span className="text-xs sm:text-sm text-muted">{label}</span>
        </div>
        {trend && (
          <span
            className={`text-xs font-medium ${
              trend.positive ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {trend.positive ? '+' : ''}
            {trend.value}%
          </span>
        )}
      </div>
      {loading ? (
        <div className="h-8 w-24 bg-surface-light rounded animate-pulse" />
      ) : (
        <motion.div
          className="text-xl sm:text-2xl font-bold"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          {value}
        </motion.div>
      )}
    </motion.div>
  );
}

// Gradient border card
export function GradientBorderCard({
  children,
  className = '',
  gradientFrom = 'from-primary',
  gradientTo = 'to-purple-500',
}: {
  children: React.ReactNode;
  className?: string;
  gradientFrom?: string;
  gradientTo?: string;
}) {
  return (
    <div className={`relative p-[1px] rounded-2xl bg-gradient-to-br ${gradientFrom} ${gradientTo} ${className}`}>
      <div className="bg-surface rounded-2xl p-4 sm:p-6 h-full">
        {children}
      </div>
    </div>
  );
}

// Feature card with icon
export function FeatureCard({
  icon,
  title,
  description,
  iconBg = 'bg-primary/20',
  iconColor = 'text-primary',
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  iconBg?: string;
  iconColor?: string;
}) {
  return (
    <motion.div
      className="p-5 sm:p-6 rounded-2xl bg-surface border border-border group hover:border-primary/30 transition-all"
      whileHover={{ y: -4 }}
    >
      <div
        className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
      >
        <span className={iconColor}>{icon}</span>
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted">{description}</p>
    </motion.div>
  );
}
