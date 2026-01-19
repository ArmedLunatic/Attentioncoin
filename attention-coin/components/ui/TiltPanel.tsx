'use client';

import { useRef, ReactNode, useEffect, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';
import { usePointerPosition, useDeviceMotion, useTiltTransform } from '@/hooks/usePhysics';

/**
 * TiltPanel - 3D Perspective Card
 *
 * Creates a card that tilts toward the pointer position,
 * giving it real depth and dimensionality.
 *
 * Technical:
 * - Uses CSS perspective and transform3d (GPU accelerated)
 * - Spring physics for organic settle
 * - Falls back to device orientation on mobile
 * - Respects reduced-motion preferences
 */

interface TiltPanelProps {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
  glareEnabled?: boolean;
}

export function TiltPanel({
  children,
  className = '',
  maxTilt = 6,
  glareEnabled = true,
}: TiltPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Pointer tracking
  const pointer = usePointerPosition(containerRef, 0.1);

  // Device motion for mobile
  const deviceMotion = useDeviceMotion(0.02);

  // Calculate tilt (use device motion on mobile if supported)
  const inputX = deviceMotion.isSupported ? deviceMotion.x : pointer.normalizedX;
  const inputY = deviceMotion.isSupported ? deviceMotion.y : pointer.normalizedY;
  const isActive = deviceMotion.isSupported || pointer.isActive;

  // Spring physics for smooth transitions
  const rotateX = useSpring(0, { stiffness: 200, damping: 25 });
  const rotateY = useSpring(0, { stiffness: 200, damping: 25 });
  const scale = useSpring(1, { stiffness: 300, damping: 30 });

  // Glare position
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);
  const glareOpacity = useSpring(0, { stiffness: 200, damping: 30 });

  // Update springs based on input
  useEffect(() => {
    if (prefersReducedMotion) {
      rotateX.set(0);
      rotateY.set(0);
      scale.set(1);
      glareOpacity.set(0);
      return;
    }

    if (isActive) {
      rotateX.set(-inputY * maxTilt);
      rotateY.set(inputX * maxTilt);
      scale.set(1.02);
      glareX.set(50 + inputX * 30);
      glareY.set(50 + inputY * 30);
      glareOpacity.set(0.1);
    } else {
      rotateX.set(0);
      rotateY.set(0);
      scale.set(1);
      glareOpacity.set(0);
    }
  }, [inputX, inputY, isActive, maxTilt, prefersReducedMotion, rotateX, rotateY, scale, glareX, glareY, glareOpacity]);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{ perspective: '1200px', perspectiveOrigin: 'center' }}
    >
      <motion.div
        className="relative"
        style={{
          rotateX,
          rotateY,
          scale,
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        }}
      >
        {/* Main content */}
        {children}

        {/* Glare overlay */}
        {glareEnabled && !prefersReducedMotion && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden"
            style={{
              opacity: glareOpacity,
              background: `radial-gradient(circle at ${glareX.get()}% ${glareY.get()}%, rgba(255,255,255,0.15) 0%, transparent 60%)`,
            }}
          />
        )}

        {/* Depth shadow */}
        <motion.div
          className="absolute -inset-4 -z-10 rounded-3xl"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
            opacity: scale,
            filter: 'blur(40px)',
            transform: 'translateZ(-50px)',
          }}
        />
      </motion.div>
    </div>
  );
}

export default TiltPanel;
