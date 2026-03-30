/** Generic in-app route placeholder (dashboard, profile, etc.). */
export function AppRouteSkeleton() {
  return (
    <div className="min-h-[70vh] px-4 py-6 sm:px-6 sm:py-8" aria-busy="true" aria-label="Loading">
      <div className="animate-pulse">
        <div className="h-3 w-36 rounded bg-white/10" />
        <div className="mt-6 h-9 max-w-sm rounded-lg bg-white/10" />
        <div className="mt-3 h-4 w-full max-w-xl rounded bg-white/5" />
        <div className="mt-3 h-4 w-full max-w-md rounded bg-white/5" />
        <div className="mt-12 space-y-3">
          <div className="h-24 rounded-2xl bg-white/5" />
          <div className="h-24 rounded-2xl bg-white/5" />
          <div className="h-24 rounded-2xl bg-white/5" />
        </div>
      </div>
    </div>
  );
}

/** Wallet / CTA block while dashboard profile is loading. */
export function DashboardPanelsSkeleton() {
  return (
    <div className="mt-10 animate-pulse space-y-8" aria-busy="true" aria-label="Loading dashboard">
      <div className="h-52 rounded-2xl bg-white/5 sm:h-56" />
      <div className="h-12 max-w-[280px] rounded-xl bg-white/10" />
    </div>
  );
}

export function TaskListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="mt-6 space-y-3 animate-pulse">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-24 rounded-2xl bg-white/5 sm:h-[5.5rem]" />
      ))}
    </div>
  );
}
