'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink } from 'lucide-react';

interface PayoutEntry {
  id: string;
  username: string;
  amount: number;
  time: string;
  txSignature?: string;
}

interface EvidenceFeedProps {
  items: PayoutEntry[];
  maxVisible?: number;
  autoScrollInterval?: number;
}

/**
 * EvidenceFeed - The signature moment
 *
 * A real-time scrolling feed of actual SOL payouts.
 * Proves the protocol works while you watch.
 *
 * - Auto-scrolls to show continuous activity
 * - Pauses on hover (desktop) or touch (mobile)
 * - Each entry links to on-chain verification
 */
export function EvidenceFeed({
  items,
  maxVisible = 4,
  autoScrollInterval = 3000,
}: EvidenceFeedProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [visibleStartIndex, setVisibleStartIndex] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic
  useEffect(() => {
    if (isPaused || items.length <= maxVisible) return;

    const interval = setInterval(() => {
      setVisibleStartIndex((prev) => (prev + 1) % items.length);
    }, autoScrollInterval);

    return () => clearInterval(interval);
  }, [isPaused, items.length, maxVisible, autoScrollInterval]);

  // Get visible items with wrap-around
  const getVisibleItems = useCallback(() => {
    if (items.length === 0) return [];
    if (items.length <= maxVisible) return items;

    const visible: PayoutEntry[] = [];
    for (let i = 0; i < maxVisible; i++) {
      const index = (visibleStartIndex + i) % items.length;
      visible.push(items[index]);
    }
    return visible;
  }, [items, maxVisible, visibleStartIndex]);

  const visibleItems = getVisibleItems();

  // Track if user is actively interacting
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle hover/focus to pause (desktop)
  const handleMouseEnter = () => {
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    // Resume after short delay
    interactionTimeoutRef.current = setTimeout(() => setIsPaused(false), 1500);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (interactionTimeoutRef.current) {
        clearTimeout(interactionTimeoutRef.current);
      }
    };
  }, []);

  // Handle entry tap (mobile) / click
  const handleEntryTap = (id: string) => {
    // Toggle expanded state
    const newExpandedId = expandedId === id ? null : id;
    setExpandedId(newExpandedId);

    // Clear any existing resume timeout
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }

    // Pause while expanded, auto-resume when collapsed
    if (newExpandedId) {
      setIsPaused(true);
    } else {
      // Resume after short delay when collapsing
      interactionTimeoutRef.current = setTimeout(() => setIsPaused(false), 1000);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-text-tertiary text-body-sm">
        Waiting for activity...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative touch-pan-y"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Feed entries */}
      <div className="space-y-0">
        <AnimatePresence mode="popLayout" initial={false}>
          {visibleItems.map((entry) => (
            <EvidenceEntry
              key={entry.id}
              entry={entry}
              isExpanded={expandedId === entry.id}
              onTap={() => handleEntryTap(entry.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Pause indicator */}
      <AnimatePresence>
        {isPaused && items.length > maxVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-2 right-2 px-2 py-1 rounded bg-white/5 text-text-tertiary text-caption"
          >
            Paused
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface EvidenceEntryProps {
  entry: PayoutEntry;
  isExpanded: boolean;
  onTap: () => void;
}

function EvidenceEntry({ entry, isExpanded, onTap }: EvidenceEntryProps) {
  const solscanUrl = entry.txSignature
    ? `https://solscan.io/tx/${entry.txSignature}`
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{
        duration: 0.35,
        ease: [0.32, 0.72, 0, 1], // Smooth deceleration curve
        layout: { duration: 0.25, ease: [0.32, 0.72, 0, 1] },
      }}
      onClick={onTap}
      className="group cursor-pointer"
    >
      <div
        className={`
          flex items-center justify-between py-4 px-4 -mx-4
          border-b border-white/[0.04] last:border-0
          transition-colors duration-150
          hover:bg-white/[0.02] active:bg-white/[0.03]
          ${isExpanded ? 'bg-white/[0.02]' : ''}
        `}
      >
        {/* Left: Username */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar placeholder - initials */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center flex-shrink-0">
            <span className="text-caption font-medium text-emerald-400">
              {entry.username.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-foreground font-medium truncate">
            @{entry.username}
          </span>
        </div>

        {/* Right: Amount + Time */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <span className="font-mono text-foreground font-medium tabular-nums">
            +{entry.amount.toFixed(3)}{' '}
            <span className="text-emerald-400">SOL</span>
          </span>
          <span className="text-caption text-text-tertiary min-w-[52px] text-right">
            {entry.time}
          </span>
        </div>
      </div>

      {/* Expanded state: Verification link */}
      <AnimatePresence>
        {isExpanded && solscanUrl && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden"
          >
            <a
              href={solscanUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 px-4 py-4 -mx-4 text-body-sm text-emerald-400 hover:text-emerald-300 active:text-emerald-200 active:bg-emerald-500/5 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Verify on Solscan
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default EvidenceFeed;
