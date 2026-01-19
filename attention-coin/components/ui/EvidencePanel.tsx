'use client';

import { ReactNode } from 'react';

interface EvidencePanelProps {
  children: ReactNode;
  className?: string;
}

/**
 * EvidencePanel - Architectural glass container
 *
 * The glass treatment for The Evidence feed.
 * Restrained, weighted, institutional feel.
 *
 * - Subtle backdrop blur (not frosted glass effect)
 * - Top border highlight for depth
 * - Inner shadow for weight
 * - No outer glow - authority comes from shadow, not light
 */
export function EvidencePanel({ children, className = '' }: EvidencePanelProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Main panel */}
      <div
        className="
          relative overflow-hidden
          rounded-2xl
          bg-[#08080a]/80
          backdrop-blur-xl
          border border-white/[0.06]
          shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)]
        "
      >
        {/* Top edge highlight - subtle, architectural */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

        {/* Content */}
        <div className="relative z-10 p-4 sm:p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * EvidencePanelHeader - Optional header for the panel
 */
interface EvidencePanelHeaderProps {
  title?: string;
  badge?: ReactNode;
}

export function EvidencePanelHeader({ title, badge }: EvidencePanelHeaderProps) {
  if (!title && !badge) return null;

  return (
    <div className="flex items-center justify-between mb-4 px-4 sm:px-0">
      {title && (
        <span className="text-caption uppercase tracking-widest text-text-tertiary font-medium">
          {title}
        </span>
      )}
      {badge}
    </div>
  );
}

/**
 * LiveIndicator - Small pulsing dot to show real-time status
 */
export function LiveIndicator() {
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span className="text-caption uppercase tracking-wider text-emerald-400 font-medium">
        Live
      </span>
    </div>
  );
}

export default EvidencePanel;
