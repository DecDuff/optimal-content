"use client";

import { motion } from "framer-motion";

function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-slate-800/35 ${className ?? ""}`} aria-hidden>
      <div className="feed-shimmer-layer" />
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, type: "spring", stiffness: 320, damping: 28 }}
          className="glass-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 flex-1 space-y-3">
            <ShimmerBlock className="h-4 w-[min(100%,20rem)]" />
            <ShimmerBlock className="h-3 w-full max-w-xl" />
            <ShimmerBlock className="h-3 w-[min(100%,18rem)]" />
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-3 sm:items-end">
            <ShimmerBlock className="h-8 w-28" />
            <ShimmerBlock className="h-11 w-36" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
