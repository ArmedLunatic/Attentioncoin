'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { growthPhases, motion as motionTokens, type GrowthPhase } from '@/lib/design-tokens';

/**
 * GrowthMap Component
 *
 * A living, visual growth map representing the expansion of the Attention Coin protocol.
 * Metaphor: An expanding network or territory.
 *
 * Visual Rules:
 * - Dark background
 * - Subtle glow accents
 * - Thin connecting lines
 * - Nodes that unlock progressively
 * - Hover/click reveals short descriptions
 * - No dates, no timelines
 */

interface NodePosition {
  x: number;
  y: number;
}

// Node positions for the network layout (responsive percentages)
const nodePositions: Record<string, NodePosition> = {
  foundation: { x: 15, y: 50 },
  assisted: { x: 35, y: 30 },
  autonomous: { x: 55, y: 55 },
  ecosystem: { x: 75, y: 35 },
  launchpad: { x: 90, y: 50 },
};

// Connection paths between nodes
const connections = [
  { from: 'foundation', to: 'assisted' },
  { from: 'assisted', to: 'autonomous' },
  { from: 'autonomous', to: 'ecosystem' },
  { from: 'ecosystem', to: 'launchpad' },
  // Secondary connections for network feel
  { from: 'foundation', to: 'autonomous' },
  { from: 'assisted', to: 'ecosystem' },
];

// Status to color mapping
const statusColors = {
  active: {
    node: 'rgba(16, 185, 129, 0.9)',
    glow: 'rgba(16, 185, 129, 0.4)',
    line: 'rgba(16, 185, 129, 0.6)',
    bg: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.5)',
    text: '#34d399',
  },
  upcoming: {
    node: 'rgba(167, 139, 250, 0.9)',
    glow: 'rgba(167, 139, 250, 0.3)',
    line: 'rgba(167, 139, 250, 0.4)',
    bg: 'rgba(167, 139, 250, 0.1)',
    border: 'rgba(167, 139, 250, 0.3)',
    text: '#a78bfa',
  },
  future: {
    node: 'rgba(115, 115, 115, 0.6)',
    glow: 'rgba(115, 115, 115, 0.2)',
    line: 'rgba(115, 115, 115, 0.3)',
    bg: 'rgba(115, 115, 115, 0.08)',
    border: 'rgba(115, 115, 115, 0.2)',
    text: '#737373',
  },
};

// Phase detail panel component
function PhaseDetail({ phase, onClose }: { phase: GrowthPhase; onClose: () => void }) {
  const colors = statusColors[phase.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{
        duration: motionTokens.duration.default / 1000,
        ease: [0.4, 0, 0.2, 1],
      }}
      className="absolute left-1/2 -translate-x-1/2 bottom-0 w-full max-w-md px-4 pb-4 sm:pb-6"
    >
      <div
        className="relative p-5 sm:p-6 rounded-2xl backdrop-blur-xl border"
        style={{
          backgroundColor: 'rgba(10, 10, 10, 0.95)',
          borderColor: colors.border,
        }}
      >
        {/* Close hint */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted hover:text-white transition-colors duration-150"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 4L12 12M12 4L4 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* Status badge */}
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-3"
          style={{
            backgroundColor: colors.bg,
            color: colors.text,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: colors.node }}
          />
          {phase.status === 'active' ? 'Live' : phase.status === 'upcoming' ? 'Next' : 'Future'}
        </div>

        {/* Title */}
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-1">
          {phase.title}
        </h3>

        {/* Subtitle */}
        <p className="text-sm font-medium mb-3" style={{ color: colors.text }}>
          {phase.subtitle}
        </p>

        {/* Description */}
        <p className="text-sm text-muted-light mb-4 leading-relaxed">
          {phase.description}
        </p>

        {/* Features */}
        <div className="flex flex-wrap gap-2">
          {phase.features.map((feature) => (
            <span
              key={feature}
              className="px-2.5 py-1 text-xs rounded-lg bg-surface-light border border-border text-muted-light"
            >
              {feature}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Individual node component
function GrowthNode({
  phase,
  position,
  isSelected,
  onClick,
}: {
  phase: GrowthPhase;
  position: NodePosition;
  isSelected: boolean;
  onClick: () => void;
}) {
  const colors = statusColors[phase.status];
  const nodeSize = phase.status === 'active' ? 56 : phase.status === 'upcoming' ? 48 : 40;

  return (
    <motion.g
      style={{ cursor: 'pointer' }}
      onClick={onClick}
      initial={false}
      animate={{ scale: isSelected ? 1.08 : 1 }}
      transition={{
        duration: motionTokens.duration.fast / 1000,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      {/* Glow effect */}
      <circle
        cx={`${position.x}%`}
        cy={`${position.y}%`}
        r={nodeSize * 0.8}
        fill={colors.glow}
        style={{
          filter: `blur(${nodeSize * 0.6}px)`,
          opacity: isSelected ? 0.8 : phase.status === 'active' ? 0.6 : 0.3,
        }}
      />

      {/* Outer ring */}
      <circle
        cx={`${position.x}%`}
        cy={`${position.y}%`}
        r={nodeSize / 2 + 4}
        fill="none"
        stroke={colors.border}
        strokeWidth="1"
        opacity={isSelected ? 1 : 0.6}
      />

      {/* Main node */}
      <circle
        cx={`${position.x}%`}
        cy={`${position.y}%`}
        r={nodeSize / 2}
        fill={colors.bg}
        stroke={colors.border}
        strokeWidth="1.5"
      />

      {/* Inner dot */}
      <circle
        cx={`${position.x}%`}
        cy={`${position.y}%`}
        r={nodeSize / 6}
        fill={colors.node}
      />

      {/* Label */}
      <text
        x={`${position.x}%`}
        y={`${position.y + (nodeSize / 2 + 16) / 4}%`}
        textAnchor="middle"
        className="text-xs font-medium select-none pointer-events-none"
        fill={isSelected ? colors.text : '#a3a3a3'}
        style={{ fontSize: '11px' }}
      >
        {phase.title}
      </text>
    </motion.g>
  );
}

// Connection line component
function ConnectionLine({
  from,
  to,
  fromStatus,
  toStatus,
}: {
  from: NodePosition;
  to: NodePosition;
  fromStatus: GrowthPhase['status'];
  toStatus: GrowthPhase['status'];
}) {
  // Determine line color based on connection status
  const getLineColor = () => {
    if (fromStatus === 'active' && toStatus === 'active') {
      return statusColors.active.line;
    }
    if (fromStatus === 'active' && toStatus === 'upcoming') {
      return statusColors.upcoming.line;
    }
    return statusColors.future.line;
  };

  // Calculate control point for curved line
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const controlX = midX;
  const controlY = midY - 10; // Slight curve upward

  const pathD = `M ${from.x}% ${from.y}% Q ${controlX}% ${controlY}% ${to.x}% ${to.y}%`;

  return (
    <path
      d={pathD}
      fill="none"
      stroke={getLineColor()}
      strokeWidth="1"
      strokeDasharray={fromStatus === 'future' || toStatus === 'future' ? '4 4' : 'none'}
      className="transition-all duration-200"
    />
  );
}

// Main GrowthMap component
export default function GrowthMap() {
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);

  const selectedPhase = useMemo(
    () => growthPhases.find((p) => p.id === selectedPhaseId) || null,
    [selectedPhaseId]
  );

  const handleNodeClick = useCallback((phaseId: string) => {
    setSelectedPhaseId((current) => (current === phaseId ? null : phaseId));
  }, []);

  const handleClose = useCallback(() => {
    setSelectedPhaseId(null);
  }, []);

  return (
    <section className="relative py-20 sm:py-28 px-4 overflow-hidden">
      {/* Section header */}
      <div className="max-w-5xl mx-auto text-center mb-8 sm:mb-12">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{
            duration: motionTokens.duration.default / 1000,
            ease: [0.4, 0, 0.2, 1],
          }}
          className="text-xs sm:text-sm font-medium uppercase tracking-wider text-muted mb-3"
        >
          Protocol Evolution
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{
            duration: motionTokens.duration.default / 1000,
            ease: [0.4, 0, 0.2, 1],
            delay: 0.05,
          }}
          className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white"
        >
          Growth Map
        </motion.h2>
      </div>

      {/* Network visualization */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{
          duration: motionTokens.duration.slow / 1000,
          ease: [0.4, 0, 0.2, 1],
          delay: 0.1,
        }}
        className="relative max-w-5xl mx-auto"
      >
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 60% 40% at 20% 50%, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
          }}
        />

        {/* SVG Network */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-auto"
          style={{ minHeight: '320px', maxHeight: '480px' }}
        >
          {/* Grid pattern (subtle) */}
          <defs>
            <pattern
              id="grid"
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="0.3" cy="0.3" r="0.15" fill="rgba(255,255,255,0.03)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Connection lines */}
          {connections.map((conn, i) => {
            const fromPhase = growthPhases.find((p) => p.id === conn.from);
            const toPhase = growthPhases.find((p) => p.id === conn.to);
            if (!fromPhase || !toPhase) return null;

            return (
              <ConnectionLine
                key={`${conn.from}-${conn.to}`}
                from={nodePositions[conn.from]}
                to={nodePositions[conn.to]}
                fromStatus={fromPhase.status}
                toStatus={toPhase.status}
              />
            );
          })}

          {/* Nodes */}
          {growthPhases.map((phase) => (
            <GrowthNode
              key={phase.id}
              phase={phase}
              position={nodePositions[phase.id]}
              isSelected={selectedPhaseId === phase.id}
              onClick={() => handleNodeClick(phase.id)}
            />
          ))}
        </svg>

        {/* Phase detail panel */}
        <AnimatePresence mode="wait">
          {selectedPhase && (
            <PhaseDetail
              key={selectedPhase.id}
              phase={selectedPhase}
              onClose={handleClose}
            />
          )}
        </AnimatePresence>

        {/* Hint text */}
        <AnimatePresence>
          {!selectedPhase && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: motionTokens.duration.fast / 1000,
                ease: [0.4, 0, 0.2, 1],
              }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-muted"
            >
              Select a node to explore
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Evolution timeline hint */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{
          duration: motionTokens.duration.default / 1000,
          ease: [0.4, 0, 0.2, 1],
          delay: 0.2,
        }}
        className="max-w-3xl mx-auto mt-12 sm:mt-16"
      >
        <div className="flex items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-muted">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: statusColors.active.node }}
            />
            <span>Submit &middot; Earn</span>
          </div>
          <span className="text-border-light">&rarr;</span>
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: statusColors.upcoming.node }}
            />
            <span>Engage &middot; Earn</span>
          </div>
          <span className="text-border-light">&rarr;</span>
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: statusColors.future.node }}
            />
            <span>Exist &middot; Earn</span>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
