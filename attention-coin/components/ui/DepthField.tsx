'use client';

import { useRef, useMemo } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { useScrollVelocity, usePointerPosition } from '@/hooks/usePhysics';

/**
 * DepthField - Living Background System
 *
 * Creates a multi-layered depth environment that responds to:
 * - Scroll velocity (stretches and flows in scroll direction)
 * - Pointer position (subtle parallax shift)
 *
 * Technical:
 * - Uses CSS transforms only (GPU accelerated)
 * - Spring physics for organic deceleration
 * - Passive scroll listeners
 * - Will-change hints for compositor
 */

interface GradientOrb {
  id: number;
  size: number;
  x: number;
  y: number;
  color: string;
  blur: number;
  depth: number; // 0 = far, 1 = close (affects parallax amount)
}

export function DepthField() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollVelocity = useScrollVelocity(0.12);
  const pointer = usePointerPosition(containerRef, 0.08);

  // Spring physics for smooth velocity response
  const velocitySpring = useSpring(0, {
    stiffness: 100,
    damping: 30,
    mass: 1,
  });

  // Update spring target based on scroll velocity
  velocitySpring.set(scrollVelocity.velocity);

  // Define gradient orbs with different depths
  const orbs: GradientOrb[] = useMemo(() => [
    // Deep background orbs (subtle, large)
    {
      id: 1,
      size: 800,
      x: 20,
      y: -10,
      color: 'rgba(4, 120, 87, 0.08)',
      blur: 120,
      depth: 0.2,
    },
    {
      id: 2,
      size: 600,
      x: 80,
      y: 60,
      color: 'rgba(4, 120, 87, 0.05)',
      blur: 100,
      depth: 0.3,
    },
    // Mid-ground orbs
    {
      id: 3,
      size: 400,
      x: 60,
      y: 20,
      color: 'rgba(16, 185, 129, 0.04)',
      blur: 80,
      depth: 0.5,
    },
    {
      id: 4,
      size: 300,
      x: 10,
      y: 70,
      color: 'rgba(4, 120, 87, 0.06)',
      blur: 60,
      depth: 0.6,
    },
    // Near orbs (more reactive)
    {
      id: 5,
      size: 200,
      x: 85,
      y: 30,
      color: 'rgba(16, 185, 129, 0.03)',
      blur: 50,
      depth: 0.8,
    },
  ], []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden pointer-events-none z-0"
      style={{ willChange: 'transform' }}
      aria-hidden="true"
    >
      {/* Base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 100% 80% at 50% -30%, rgba(4, 120, 87, 0.12) 0%, transparent 50%),
            #060608
          `,
        }}
      />

      {/* Velocity-reactive orbs */}
      {orbs.map((orb) => (
        <VelocityOrb
          key={orb.id}
          orb={orb}
          velocitySpring={velocitySpring}
          pointer={pointer}
        />
      ))}

      {/* Subtle noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      {/* Bottom fade for content separation */}
      <div
        className="absolute inset-x-0 bottom-0 h-[50vh]"
        style={{
          background: 'linear-gradient(to top, #060608 0%, transparent 100%)',
        }}
      />
    </div>
  );
}

interface VelocityOrbProps {
  orb: GradientOrb;
  velocitySpring: any;
  pointer: { normalizedX: number; normalizedY: number };
}

function VelocityOrb({ orb, velocitySpring, pointer }: VelocityOrbProps) {
  // Transform velocity to Y offset (stretches in scroll direction)
  const velocityY = useTransform(velocitySpring, [-20, 0, 20], [-30 * orb.depth, 0, 30 * orb.depth]);

  // Parallax from pointer (deeper = less movement)
  const parallaxX = pointer.normalizedX * 20 * orb.depth;
  const parallaxY = pointer.normalizedY * 15 * orb.depth;

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: orb.size,
        height: orb.size,
        left: `${orb.x}%`,
        top: `${orb.y}%`,
        background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
        filter: `blur(${orb.blur}px)`,
        willChange: 'transform',
        x: parallaxX,
        y: velocityY,
        translateY: parallaxY,
      }}
    />
  );
}

export default DepthField;
