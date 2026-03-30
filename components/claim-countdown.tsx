"use client";

import { useEffect, useState } from "react";

const WINDOW_MS = 24 * 60 * 60 * 1000;
const URGENT_MS = 3 * 60 * 60 * 1000;

type Props = {
  claimedAtIso: string | null;
  active: boolean;
};

export function ClaimCountdown({ claimedAtIso, active }: Props) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!active || !claimedAtIso) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [active, claimedAtIso]);

  if (!active || !claimedAtIso) return null;

  const end = new Date(claimedAtIso).getTime() + WINDOW_MS;
  const remaining = end - Date.now();
  if (remaining <= 0) {
    return (
      <p className="font-mono text-sm font-semibold text-red-400 drop-shadow-[0_0_12px_rgba(248,113,113,0.45)]">
        Delivery window expired (24h)
      </p>
    );
  }

  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  const urgent = remaining < URGENT_MS;
  const label = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  const inner = (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        24h delivery window
      </p>
      <p
        className={
          urgent
            ? "countdown-urgent mt-2 font-mono text-2xl font-bold tabular-nums tracking-tight"
            : "mt-2 font-mono text-2xl font-semibold tabular-nums tracking-tight text-slate-100 drop-shadow-[0_0_20px_rgba(255,255,255,0.06)]"
        }
      >
        {label}
      </p>
      <p className="mt-1 text-[10px] text-slate-600">From claim · remaining</p>
    </>
  );

  if (urgent) {
    return (
      <div className="countdown-urgent-shell rounded-2xl border border-red-500/25 bg-red-950/20 p-5 backdrop-blur-md">
        {inner}
      </div>
    );
  }

  return <div>{inner}</div>;
}
