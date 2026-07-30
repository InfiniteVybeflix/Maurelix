"use client";

import { useEffect, useCallback } from "react";

export function triggerHaptic(pattern: number | number[] = 50) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

export function useHaptic() {
  const tap = useCallback(() => triggerHaptic(20), []);
  const success = useCallback(() => triggerHaptic([30, 50, 30]), []);
  const error = useCallback(() => triggerHaptic([100, 50, 100]), []);
  const heartbeat = useCallback(() => triggerHaptic([50, 100, 50]), []);

  return { tap, success, error, heartbeat };
}

export default function HapticWidget() {
  const { heartbeat } = useHaptic();

  useEffect(() => {
    const interval = setInterval(() => {
      heartbeat();
    }, 3000);
    return () => clearInterval(interval);
  }, [heartbeat]);

  return null;
}
