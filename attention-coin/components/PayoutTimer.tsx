'use client';

import { useState, useEffect } from 'react';
import { Clock, Zap } from 'lucide-react';

interface PayoutTimerProps {
  intervalHours?: number;
  compact?: boolean;
}

export default function PayoutTimer({ intervalHours = 6, compact = false }: PayoutTimerProps) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const calculateTimeLeft = () => {
      const now = new Date();
      const hours = now.getUTCHours();
      const currentInterval = Math.floor(hours / intervalHours) * intervalHours;
      const nextPayout = new Date(now);
      nextPayout.setUTCHours(currentInterval + intervalHours, 0, 0, 0);

      if (nextPayout <= now) {
        nextPayout.setUTCHours(nextPayout.getUTCHours() + intervalHours);
      }

      const diff = nextPayout.getTime() - now.getTime();
      const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
      const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secondsLeft = Math.floor((diff % (1000 * 60)) / 1000);

      return { hours: hoursLeft, minutes: minutesLeft, seconds: secondsLeft };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [intervalHours]);

  if (!mounted) {
    return null;
  }

  const formatTime = (num: number) => num.toString().padStart(2, '0');
  const isUrgent = timeLeft.hours === 0 && timeLeft.minutes < 30;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
        isUrgent ? 'bg-primary/20 text-primary' : 'bg-surface-light text-muted'
      }`}>
        <Clock className="w-4 h-4" />
        <span className="font-mono text-sm font-medium">
          {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
        </span>
      </div>
    );
  }

  return (
    <div className={`p-4 sm:p-6 rounded-2xl border ${
      isUrgent
        ? 'bg-primary/10 border-primary/30'
        : 'bg-surface border-border'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isUrgent ? 'bg-primary/20' : 'bg-surface-light'
          }`}>
            <Zap className={`w-5 h-5 ${isUrgent ? 'text-primary' : 'text-muted'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-sm sm:text-base">Next Payout</h3>
            <p className="text-xs text-muted">Every {intervalHours} hours</p>
          </div>
        </div>
        {isUrgent && (
          <span className="px-2 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium animate-pulse">
            Soon!
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { label: 'Hours', value: timeLeft.hours },
          { label: 'Minutes', value: timeLeft.minutes },
          { label: 'Seconds', value: timeLeft.seconds },
        ].map((item) => (
          <div key={item.label} className="text-center">
            <div className={`text-2xl sm:text-4xl font-bold font-mono ${
              isUrgent ? 'text-primary' : 'text-white'
            }`}>
              {formatTime(item.value)}
            </div>
            <div className="text-xs text-muted mt-1">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
