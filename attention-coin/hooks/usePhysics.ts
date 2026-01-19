'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSpring, useTransform, MotionValue } from 'framer-motion';

// ============================================================================
// POINTER POSITION HOOK
// Smoothed pointer tracking with lerp interpolation for 60fps smoothness
// ============================================================================

interface PointerPosition {
  x: number;
  y: number;
  normalizedX: number; // -1 to 1 from center
  normalizedY: number; // -1 to 1 from center
  isActive: boolean;
}

export function usePointerPosition(
  containerRef: React.RefObject<HTMLElement>,
  smoothing: number = 0.1
): PointerPosition {
  const [position, setPosition] = useState<PointerPosition>({
    x: 0,
    y: 0,
    normalizedX: 0,
    normalizedY: 0,
    isActive: false,
  });

  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>();
  const isActiveRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Normalize to -1 to 1 from center
      const normalizedX = ((x / rect.width) - 0.5) * 2;
      const normalizedY = ((y / rect.height) - 0.5) * 2;

      targetRef.current = { x: normalizedX, y: normalizedY };
      isActiveRef.current = true;
    };

    const handlePointerLeave = () => {
      targetRef.current = { x: 0, y: 0 };
      isActiveRef.current = false;
    };

    // Lerp animation loop
    const animate = () => {
      currentRef.current.x += (targetRef.current.x - currentRef.current.x) * smoothing;
      currentRef.current.y += (targetRef.current.y - currentRef.current.y) * smoothing;

      setPosition({
        x: currentRef.current.x,
        y: currentRef.current.y,
        normalizedX: currentRef.current.x,
        normalizedY: currentRef.current.y,
        isActive: isActiveRef.current,
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerleave', handlePointerLeave);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [containerRef, smoothing]);

  return position;
}

// ============================================================================
// SCROLL VELOCITY HOOK
// Tracks scroll speed and direction for reactive effects
// ============================================================================

interface ScrollVelocity {
  velocity: number; // pixels per frame, smoothed
  direction: 'up' | 'down' | 'none';
  progress: number; // 0 to 1 page progress
}

export function useScrollVelocity(smoothing: number = 0.15): ScrollVelocity {
  const [state, setState] = useState<ScrollVelocity>({
    velocity: 0,
    direction: 'none',
    progress: 0,
  });

  const lastScrollRef = useRef(0);
  const velocityRef = useRef(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    let lastTime = performance.now();

    const handleScroll = () => {
      const currentScroll = window.scrollY;
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;

      if (deltaTime > 0) {
        const rawVelocity = (currentScroll - lastScrollRef.current) / deltaTime * 16; // normalize to ~60fps
        velocityRef.current += (rawVelocity - velocityRef.current) * smoothing;
      }

      lastScrollRef.current = currentScroll;
      lastTime = currentTime;
    };

    const animate = () => {
      // Decay velocity when not scrolling
      velocityRef.current *= 0.95;

      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;

      setState({
        velocity: velocityRef.current,
        direction: velocityRef.current > 0.5 ? 'down' : velocityRef.current < -0.5 ? 'up' : 'none',
        progress,
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [smoothing]);

  return state;
}

// ============================================================================
// MAGNETIC EFFECT HOOK
// Creates magnetic pull toward element center on hover
// ============================================================================

interface MagneticState {
  x: number;
  y: number;
  scale: number;
  isHovered: boolean;
}

export function useMagneticEffect(
  ref: React.RefObject<HTMLElement>,
  strength: number = 0.3,
  scaleOnHover: number = 1.02
): MagneticState {
  const [state, setState] = useState<MagneticState>({
    x: 0,
    y: 0,
    scale: 1,
    isHovered: false,
  });

  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>();
  const isHoveredRef = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Distance from center
      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;

      targetRef.current = {
        x: deltaX * strength,
        y: deltaY * strength,
      };
    };

    const handlePointerEnter = () => {
      isHoveredRef.current = true;
    };

    const handlePointerLeave = () => {
      isHoveredRef.current = false;
      targetRef.current = { x: 0, y: 0 };
    };

    const animate = () => {
      const springStrength = 0.15;
      currentRef.current.x += (targetRef.current.x - currentRef.current.x) * springStrength;
      currentRef.current.y += (targetRef.current.y - currentRef.current.y) * springStrength;

      setState({
        x: currentRef.current.x,
        y: currentRef.current.y,
        scale: isHoveredRef.current ? scaleOnHover : 1,
        isHovered: isHoveredRef.current,
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    element.addEventListener('pointermove', handlePointerMove);
    element.addEventListener('pointerenter', handlePointerEnter);
    element.addEventListener('pointerleave', handlePointerLeave);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      element.removeEventListener('pointermove', handlePointerMove);
      element.removeEventListener('pointerenter', handlePointerEnter);
      element.removeEventListener('pointerleave', handlePointerLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [ref, strength, scaleOnHover]);

  return state;
}

// ============================================================================
// TILT TRANSFORM HOOK
// Creates 3D perspective tilt based on pointer position
// ============================================================================

interface TiltTransform {
  rotateX: number;
  rotateY: number;
  scale: number;
}

export function useTiltTransform(
  pointer: { normalizedX: number; normalizedY: number; isActive: boolean },
  maxTilt: number = 8,
  scaleOnHover: number = 1.01
): TiltTransform {
  // Invert Y for natural tilt direction
  const rotateX = pointer.isActive ? -pointer.normalizedY * maxTilt : 0;
  const rotateY = pointer.isActive ? pointer.normalizedX * maxTilt : 0;
  const scale = pointer.isActive ? scaleOnHover : 1;

  return { rotateX, rotateY, scale };
}

// ============================================================================
// DEVICE MOTION HOOK (Mobile)
// Uses accelerometer for tilt on mobile devices
// ============================================================================

interface DeviceMotion {
  x: number; // -1 to 1
  y: number; // -1 to 1
  isSupported: boolean;
}

export function useDeviceMotion(sensitivity: number = 0.03): DeviceMotion {
  const [motion, setMotion] = useState<DeviceMotion>({
    x: 0,
    y: 0,
    isSupported: false,
  });

  const currentRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isSupported = 'DeviceOrientationEvent' in window;
    if (!isSupported) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma || 0; // Left/right tilt (-90 to 90)
      const beta = e.beta || 0; // Front/back tilt (-180 to 180)

      // Normalize to -1 to 1
      const targetX = Math.max(-1, Math.min(1, gamma * sensitivity));
      const targetY = Math.max(-1, Math.min(1, (beta - 45) * sensitivity)); // Offset for natural phone holding angle

      // Smooth interpolation
      currentRef.current.x += (targetX - currentRef.current.x) * 0.1;
      currentRef.current.y += (targetY - currentRef.current.y) * 0.1;

      setMotion({
        x: currentRef.current.x,
        y: currentRef.current.y,
        isSupported: true,
      });
    };

    window.addEventListener('deviceorientation', handleOrientation);
    setMotion(prev => ({ ...prev, isSupported: true }));

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [sensitivity]);

  return motion;
}

export default {
  usePointerPosition,
  useScrollVelocity,
  useMagneticEffect,
  useTiltTransform,
  useDeviceMotion,
};
