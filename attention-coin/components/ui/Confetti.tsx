'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  rotation: number;
  scale: number;
}

interface ConfettiProps {
  trigger: boolean;
  onComplete?: () => void;
  duration?: number;
  pieces?: number;
}

const colors = [
  '#00ff88', // primary green
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#ec4899', // pink
  '#10b981', // emerald
  '#f97316', // orange
];

export function Confetti({
  trigger,
  onComplete,
  duration = 3000,
  pieces = 50,
}: ConfettiProps) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (trigger && !isActive) {
      setIsActive(true);
      const newConfetti: ConfettiPiece[] = Array.from({ length: pieces }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
      }));
      setConfetti(newConfetti);

      setTimeout(() => {
        setConfetti([]);
        setIsActive(false);
        onComplete?.();
      }, duration);
    }
  }, [trigger, duration, pieces, onComplete, isActive]);

  return (
    <AnimatePresence>
      {confetti.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {confetti.map((piece) => (
            <motion.div
              key={piece.id}
              className="absolute w-3 h-3"
              style={{
                left: `${piece.x}%`,
                top: -20,
                backgroundColor: piece.color,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                transform: `scale(${piece.scale})`,
              }}
              initial={{
                y: -20,
                rotate: 0,
                opacity: 1,
              }}
              animate={{
                y: window.innerHeight + 100,
                rotate: piece.rotation + 720,
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: 2.5 + Math.random(),
                delay: piece.delay,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

// Mini confetti burst for smaller celebrations
export function ConfettiBurst({
  trigger,
  x = 50,
  y = 50,
}: {
  trigger: boolean;
  x?: number;
  y?: number;
}) {
  const [particles, setParticles] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (trigger) {
      const newParticles: ConfettiPiece[] = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: 0,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: 0,
        rotation: (i / 12) * 360,
        scale: 0.5 + Math.random() * 0.5,
      }));
      setParticles(newParticles);

      setTimeout(() => setParticles([]), 1000);
    }
  }, [trigger]);

  return (
    <AnimatePresence>
      {particles.length > 0 && (
        <div
          className="absolute pointer-events-none"
          style={{ left: `${x}%`, top: `${y}%` }}
        >
          {particles.map((particle) => {
            const angle = (particle.rotation * Math.PI) / 180;
            const distance = 40 + Math.random() * 30;
            return (
              <motion.div
                key={particle.id}
                className="absolute w-2 h-2 -translate-x-1 -translate-y-1"
                style={{
                  backgroundColor: particle.color,
                  borderRadius: Math.random() > 0.5 ? '50%' : '1px',
                }}
                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                animate={{
                  x: Math.cos(angle) * distance,
                  y: Math.sin(angle) * distance,
                  scale: [0, 1, 0.5],
                  opacity: [1, 1, 0],
                }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
}

// Success checkmark animation
export function SuccessCheck({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center"
        >
          <motion.svg
            viewBox="0 0 24 24"
            className="w-8 h-8 text-primary"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <motion.path
              d="M5 13l4 4L19 7"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
          </motion.svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
