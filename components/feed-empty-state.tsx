"use client";

const STROKE = 1.25;

export function FeedEmptyState() {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-zinc-800/50 bg-[#09090b]/90 px-8 py-16 backdrop-blur-md">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(46,91,255,0.1),transparent_55%)]" />

      <div className="relative mb-8 flex h-28 w-28 items-center justify-center">
        <div
          className="absolute h-[88px] w-[88px] rounded-full border border-[#2E5BFF]/15 search-ring-pulse"
          style={{ animationDelay: "0s" }}
        />
        <div
          className="absolute h-[62px] w-[62px] rounded-full border border-[#2E5BFF]/20 search-ring-pulse"
          style={{ animationDelay: "0.35s" }}
        />
        <div
          className="absolute h-[88px] w-[88px] rounded-full border-2 border-transparent border-t-[#2E5BFF]/70 radar-sweep"
          aria-hidden
        />
        <svg
          className="relative z-10 h-9 w-9 text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={STROKE}
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3-3" strokeLinecap="round" />
        </svg>
      </div>

      <p className="relative text-center text-sm font-medium tracking-tight text-zinc-300">
        Scanning the marketplace
      </p>
      <p className="relative mt-2 max-w-xs text-center text-xs leading-relaxed text-zinc-500">
        No Rapid tasks in the feed yet. Open{" "}
        <span className="font-medium text-[#2E5BFF]">Post a Task</span> to broadcast the first
        brief.
      </p>
    </div>
  );
}
