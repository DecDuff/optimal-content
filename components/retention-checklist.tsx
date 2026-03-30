"use client";

import type { ChecklistState } from "@/types/database";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

const ITEMS: { key: keyof ChecklistState; label: string }[] = [
  { key: "1", label: "Hook optimization: analyzed the first 5 seconds for retention" },
  { key: "2", label: "Pacing & flow: removed dead air and weak segments" },
  { key: "3", label: "CTR assets: suggested high-impact thumbnail or title variations" },
  { key: "4", label: "Audience engagement: clear calls-to-action in the video structure" },
  { key: "5", label: "Metadata & SEO: optimized description and tags for search" },
];

type Props = {
  checklist: ChecklistState;
  disabled?: boolean;
  /** Toggle one item — parent owns state (avoids stale checklist snapshots in the parent). */
  onToggle: (key: keyof ChecklistState) => void;
};

export function RetentionChecklist({ checklist, disabled, onToggle }: Props) {
  const toggle = (key: keyof ChecklistState) => {
    if (disabled) return;
    onToggle(key);
  };

  return (
    <div className="glass-panel p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        Submission checklist
      </p>
      <p className="mt-1 text-xs text-slate-400">
        All five items are required before you can submit work for creator review.
      </p>
      <ul className="mt-4 space-y-2">
        {ITEMS.map(({ key, label }) => {
          const done = Boolean(checklist[key]);
          return (
            <li key={key}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => toggle(key)}
                className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                  done
                    ? "border-violet-500/45 bg-violet-500/10 text-white"
                    : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/15"
                } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <motion.span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                    done ? "border-violet-500 bg-violet-600" : "border-slate-600"
                  }`}
                  whileTap={disabled ? {} : { scale: 0.92 }}
                >
                  {done ? <Check className="h-3 w-3 text-white" strokeWidth={2.5} /> : null}
                </motion.span>
                <span>{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
