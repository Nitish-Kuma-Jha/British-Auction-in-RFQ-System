import { useState, useEffect, useRef } from 'react';

export function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!targetDate) return;

    const calculate = () => {
      const diff = new Date(targetDate) - new Date();
      if (diff <= 0) { setTimeLeft(null); clearInterval(intervalRef.current); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ h, m, s, diff, total: diff });
    };

    calculate();
    intervalRef.current = setInterval(calculate, 1000);
    return () => clearInterval(intervalRef.current);
  }, [targetDate]);

  return timeLeft;
}

export function formatCountdown(tl) {
  if (!tl) return '00:00:00';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(tl.h)}:${pad(tl.m)}:${pad(tl.s)}`;
}

export function usePerBidTimer(durationSeconds, running, onExpire) {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const intervalRef = useRef(null);

  useEffect(() => {
    setTimeLeft(durationSeconds);
  }, [durationSeconds]);

  useEffect(() => {
    if (!running) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, onExpire]);

  const reset = () => setTimeLeft(durationSeconds);
  return { timeLeft, reset };
}
