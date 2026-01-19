'use client';

import { motion, useSpring, useTransform, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  duration?: number;
}

export function AnimatedNumber({
  value,
  suffix = '',
  prefix = '',
  decimals = 0,
  duration = 2,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const spring = useSpring(0, {
    duration: duration * 1000,
    bounce: 0,
  });

  const display = useTransform(spring, (current) =>
    `${prefix}${current.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${suffix}`
  );

  const [displayValue, setDisplayValue] = useState(`${prefix}0${suffix}`);

  useEffect(() => {
    if (isInView) {
      spring.set(value);
    }
  }, [isInView, spring, value]);

  useEffect(() => {
    return display.on('change', (latest) => {
      setDisplayValue(latest);
    });
  }, [display]);

  return (
    <span ref={ref} className="tabular-nums">
      {displayValue}
    </span>
  );
}

interface StatCardProps {
  value: number;
  label: string;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  trend?: number;
  icon?: React.ReactNode;
  delay?: number;
  color?: 'emerald' | 'violet' | 'default';
}

export function StatCard({
  value,
  label,
  suffix = '',
  prefix = '',
  decimals = 0,
  trend,
  icon,
  delay = 0,
  color = 'default',
}: StatCardProps) {
  const colorClasses = {
    emerald: 'from-emerald-500/20 to-emerald-500/5',
    violet: 'from-violet-500/20 to-violet-500/5',
    default: 'from-white/10 to-white/5',
  };

  const glowClasses = {
    emerald: 'shadow-[0_0_60px_rgba(4,120,87,0.15)]',
    violet: 'shadow-[0_0_60px_rgba(109,40,217,0.15)]',
    default: '',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="group relative"
    >
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-b ${colorClasses[color]} border border-white/[0.06] p-6 text-center transition-all duration-500 hover:border-white/[0.1] ${glowClasses[color]}`}
      >
        {/* Animated ring background */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <motion.div
            className="w-32 h-32 rounded-full border border-current"
            style={{ borderColor: color === 'emerald' ? '#047857' : color === 'violet' ? '#6d28d9' : '#fff' }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* Top shine */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="relative z-10">
          {icon && (
            <div className="flex justify-center mb-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-text-secondary">
                {icon}
              </div>
            </div>
          )}

          <div className="text-display-md sm:text-display-lg font-display text-foreground mb-2">
            <AnimatedNumber
              value={value}
              suffix={suffix}
              prefix={prefix}
              decimals={decimals}
            />
          </div>

          <div className="text-caption uppercase tracking-widest text-text-tertiary">
            {label}
          </div>

          {trend !== undefined && (
            <div
              className={`mt-3 text-caption font-medium ${
                trend >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% this week
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface HeroStatProps {
  value: number;
  label: string;
  suffix?: string;
  delay?: number;
}

export function HeroStat({ value, label, suffix = '', delay = 0 }: HeroStatProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="relative text-center group"
    >
      {/* Subtle glow on hover */}
      <div className="absolute inset-0 rounded-2xl bg-emerald-500/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative">
        <motion.div
          className="text-display-md sm:text-display-lg lg:text-display-xl font-display text-foreground mb-2"
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          <AnimatedNumber value={value} suffix={suffix} />
        </motion.div>
        <div className="text-caption uppercase tracking-[0.15em] text-text-tertiary font-medium">
          {label}
        </div>
      </div>
    </motion.div>
  );
}

interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  children?: React.ReactNode;
}

export function ProgressRing({
  value,
  max,
  size = 120,
  strokeWidth = 4,
  color = '#047857',
  children,
}: ProgressRingProps) {
  const ref = useRef<SVGSVGElement>(null);
  const isInView = useInView(ref, { once: true });

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(value / max, 1);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg ref={ref} width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-white/5"
        />
        {/* Progress ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
          animate={
            isInView
              ? { strokeDashoffset: circumference * (1 - progress) }
              : { strokeDashoffset: circumference }
          }
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          style={{
            filter: `drop-shadow(0 0 6px ${color})`,
          }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      )}
    </div>
  );
}
