"use client";

import { useTick } from "@/hooks/use-tick";
import type { MarketplaceTask } from "@/lib/tasks-types";
import { getCountdownParts, isUrgentDeadline } from "@/lib/task-time";

const ICON_STROKE = 1.25;

function DigitSlot({ value }: { value: string }) {
  return (
    <span
      className="inline-flex min-h-[1.4rem] min-w-[0.95rem] items-center justify-center rounded-[4px] border border-zinc-800/60 bg-black/50 px-1 font-mono text-[11px] tabular-nums tracking-tight text-inherit transition-all duration-300 ease-out [font-variant-numeric:tabular-nums]"
    >
      {value}
    </span>
  );
}

function TwoDigits({ n }: { n: number }) {
  const s = String(Math.min(99, Math.max(0, n))).padStart(2, "0");
  return (
    <div className="flex gap-0.5">
      <DigitSlot value={s[0] ?? "0"} />
      <DigitSlot value={s[1] ?? "0"} />
    </div>
  );
}

type Props = {
  task: MarketplaceTask;
};

/** Rapid ticker with segmented digits and higher refresh rate for smooth clock feel. */
export function DigitalCountdown({ task }: Props) {
  useTick(80);
  const parts = getCountdownParts(task);
  const urgent = isUrgentDeadline(task);
  const colorClass = parts.expired
    ? "text-zinc-600"
    : urgent
      ? "text-red-500"
      : "text-[#2E5BFF]";

  if (parts.expired) {
    return <span className="font-mono text-[11px] text-zinc-600">—</span>;
  }

  const showHours = parts.hours > 0;

  return (
    <div className={`flex items-center gap-0.5 font-medium ${colorClass}`}>
      {showHours ? (
        <>
          <TwoDigits n={parts.hours} />
          <span className="mx-0.5 opacity-60">:</span>
        </>
      ) : null}
      <TwoDigits n={parts.minutes} />
      <span className="mx-0.5 opacity-60">:</span>
      <TwoDigits n={parts.seconds} />
    </div>
  );
}
