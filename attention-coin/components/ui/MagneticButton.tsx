'use client';

import { useRef, ReactNode, useEffect, useState } from 'react';
import { motion, useSpring } from 'framer-motion';
import { ExternalLink } from 'lucide-react';

/**
 * MagneticButton - Premium Utility Button
 *
 * Creates a button with magnetic pull effect on hover.
 * The button content follows the cursor within bounds.
 *
 * Technical:
 * - Spring physics for natural snap-back
 * - GPU accelerated transforms
 * - Touch-optimized (no hover dependency for core function)
 */

interface MagneticButtonProps {
  href: string;
  icon: ReactNode;
  label: string;
  className?: string;
}

export function MagneticButton({ href, icon, label, className = '' }: MagneticButtonProps) {
  const buttonRef = useRef<HTMLAnchorElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Spring physics for magnetic effect
  const x = useSpring(0, { stiffness: 400, damping: 30, mass: 0.5 });
  const y = useSpring(0, { stiffness: 400, damping: 30, mass: 0.5 });
  const scale = useSpring(1, { stiffness: 400, damping: 25 });

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = button.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate distance from center
      const deltaX = (e.clientX - centerX) * 0.25; // Magnetic strength
      const deltaY = (e.clientY - centerY) * 0.25;

      x.set(deltaX);
      y.set(deltaY);
    };

    const handlePointerEnter = () => {
      setIsHovered(true);
      scale.set(1.05);
    };

    const handlePointerLeave = () => {
      setIsHovered(false);
      x.set(0);
      y.set(0);
      scale.set(1);
    };

    button.addEventListener('pointermove', handlePointerMove);
    button.addEventListener('pointerenter', handlePointerEnter);
    button.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      button.removeEventListener('pointermove', handlePointerMove);
      button.removeEventListener('pointerenter', handlePointerEnter);
      button.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [x, y, scale]);

  return (
    <motion.a
      ref={buttonRef}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`
        group relative flex items-center gap-2.5 px-5 py-3
        rounded-xl
        bg-white/[0.03] hover:bg-white/[0.06]
        border border-white/[0.06] hover:border-white/[0.12]
        text-text-secondary hover:text-foreground
        transition-colors duration-200
        touch-manipulation
        ${className}
      `}
      style={{
        x,
        y,
        scale,
        willChange: 'transform',
      }}
    >
      {/* Icon */}
      <motion.span
        className="flex-shrink-0"
        style={{
          x: isHovered ? x : 0,
          y: isHovered ? y : 0,
        }}
      >
        {icon}
      </motion.span>

      {/* Label */}
      <span className="text-body-sm font-medium">{label}</span>

      {/* External link indicator */}
      <ExternalLink className="w-3.5 h-3.5 opacity-40 group-hover:opacity-70 transition-opacity" />
    </motion.a>
  );
}

/**
 * DexScreener Icon
 */
export function DexScreenerIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z"
        fill="currentColor"
        fillOpacity="0.3"
      />
      <path
        d="M7 7h8M7 12h8M7 17h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="17" cy="17" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M19.5 19.5L21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * X (Twitter) Icon
 */
export function XIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Pre-configured DexScreener Button
 */
export function DexScreenerButton({ tokenAddress }: { tokenAddress: string }) {
  return (
    <MagneticButton
      href={`https://dexscreener.com/solana/${tokenAddress}`}
      icon={<DexScreenerIcon className="w-5 h-5" />}
      label="DexScreener"
    />
  );
}

/**
 * Pre-configured X Community Button
 */
export function XCommunityButton({ handle }: { handle: string }) {
  return (
    <MagneticButton
      href={`https://x.com/${handle}`}
      icon={<XIcon className="w-4 h-4" />}
      label="Community"
    />
  );
}

export default MagneticButton;
