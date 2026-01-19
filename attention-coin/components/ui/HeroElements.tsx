'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

export function FloatingOrb({
  className = '',
  color = 'emerald',
  size = 'md',
  delay = 0,
}: {
  className?: string;
  color?: 'emerald' | 'violet';
  size?: 'sm' | 'md' | 'lg';
  delay?: number;
}) {
  const sizeClasses = {
    sm: 'w-32 h-32',
    md: 'w-64 h-64',
    lg: 'w-96 h-96',
  };

  const colorClasses = {
    emerald: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
    violet: 'from-violet-500/15 via-violet-500/5 to-transparent',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.5, delay, ease: 'easeOut' }}
      className={`absolute rounded-full bg-gradient-radial ${colorClasses[color]} ${sizeClasses[size]} blur-3xl ${className}`}
    >
      <motion.div
        className="w-full h-full"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
          delay,
        }}
      />
    </motion.div>
  );
}

export function GridPattern({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 ${className}`}>
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }}
      />
      {/* Fade out at edges */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
    </div>
  );
}

export function AnimatedGradientBorder({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative p-px rounded-2xl overflow-hidden">
      {/* Animated gradient border */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-emerald-500/50 via-violet-500/50 to-emerald-500/50"
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{
          backgroundSize: '200% 200%',
        }}
      />
      {/* Content container */}
      <div className="relative bg-background rounded-2xl">{children}</div>
    </div>
  );
}

export function ParallaxSection({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [50, -50]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  return (
    <motion.div ref={ref} style={{ y, opacity }}>
      {children}
    </motion.div>
  );
}

export function GlowLine({ className = '' }: { className?: string }) {
  return (
    <div className={`relative h-px ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent blur-sm" />
    </div>
  );
}

export function ShimmerButton({
  children,
  className = '',
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative overflow-hidden group ${className}`}
    >
      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full"
        animate={{ x: ['0%', '200%'] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatDelay: 3,
          ease: 'easeInOut',
        }}
      />
      {children}
    </motion.button>
  );
}

export function AnimatedLogo({ className = '' }: { className?: string }) {
  return (
    <motion.div
      className={`relative ${className}`}
      whileHover={{ scale: 1.1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 bg-emerald-500/30 blur-xl rounded-full"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      {/* Lightning bolt */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-full"
      >
        <motion.path
          d="M13 2L4.09 12.11C3.95 12.28 3.86 12.49 3.86 12.72C3.86 13.22 4.27 13.63 4.77 13.63H11L10 22L18.91 11.89C19.05 11.72 19.14 11.51 19.14 11.28C19.14 10.78 18.73 10.37 18.23 10.37H12L13 2Z"
          fill="currentColor"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
    </motion.div>
  );
}

export function FloatingCard({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.8,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
    >
      <motion.div
        animate={{
          y: [0, -8, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
          delay,
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export function TypewriterText({
  text,
  className = '',
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.span className={className}>
      {text.split('').map((char, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.03,
            delay: delay + index * 0.03,
          }}
        >
          {char}
        </motion.span>
      ))}
    </motion.span>
  );
}

export function ScrollIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.5, duration: 0.5 }}
      className="flex flex-col items-center gap-2"
    >
      <span className="text-caption text-text-tertiary uppercase tracking-widest">Scroll</span>
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        className="w-5 h-8 rounded-full border border-white/20 flex justify-center pt-2"
      >
        <motion.div
          animate={{ opacity: [1, 0], y: [0, 8] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="w-1 h-1 rounded-full bg-white/50"
        />
      </motion.div>
    </motion.div>
  );
}
