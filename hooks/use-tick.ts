"use client";

import { useEffect, useState } from "react";

/** Re-renders at interval for live countdowns (Rapid ticker). */
export function useTick(intervalMs = 1000) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
}
