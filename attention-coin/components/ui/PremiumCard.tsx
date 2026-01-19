'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface PremiumCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  delay?: number;
}

export function PremiumCard({
  children,
  className = '',
  hover = true,
  glow = false,
  delay = 0,
}: PremiumCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
      className={`group relative ${className}`}
    >
      {/* Glow effect on hover */}
      {glow && (
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
      )}

      {/* Card container */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0a0a0f]/80 backdrop-blur-xl border border-white/[0.06] transition-all duration-300 group-hover:border-white/[0.1] group-hover:shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
        {/* Top edge highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Inner gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

        {/* Content */}
        <div className="relative z-10">{children}</div>
      </div>
    </motion.div>
  );
}

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

export function GlassCard({ children, className = '', padding = 'md' }: GlassCardProps) {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-white/[0.02] backdrop-blur-md border border-white/[0.05] ${paddingClasses[padding]} ${className}`}
    >
      {/* Subtle top shine */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

interface FeatureCardProps {
  icon?: ReactNode;
  title: string;
  description: string;
  index?: number;
}

export function FeatureCard({ icon, title, description, index = 0 }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="group relative"
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.06] p-6 transition-all duration-300 hover:border-emerald-500/20 hover:shadow-[0_0_40px_rgba(4,120,87,0.08)]">
        {/* Hover gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Top shine */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="relative z-10">
          {icon && (
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 text-emerald-400">
              {icon}
            </div>
          )}
          <h3 className="font-display text-heading-md text-foreground mb-2">{title}</h3>
          <p className="text-body-sm text-text-secondary leading-relaxed">{description}</p>
        </div>
      </div>
    </motion.div>
  );
}
