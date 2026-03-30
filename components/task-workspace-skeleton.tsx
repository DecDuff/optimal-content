/** Mirrors task workspace layout heights to reduce CLS while loading. */
export function TaskWorkspaceSkeleton() {
  return (
    <div
      className="min-h-screen px-4 py-6 sm:px-6 sm:py-8"
      aria-busy="true"
      aria-label="Loading task"
    >
      <div className="animate-pulse">
        <div className="h-3 w-44 rounded bg-white/10" />
        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:justify-between">
          <div className="min-w-0 max-w-2xl flex-1 space-y-3">
            <div className="h-3 w-28 rounded bg-white/10" />
            <div className="h-8 max-w-lg rounded-lg bg-white/10" />
            <div className="h-20 max-w-xl rounded-lg bg-white/5" />
            <div className="h-4 w-40 rounded bg-white/10" />
          </div>
          <div className="h-28 w-full max-w-xs shrink-0 rounded-2xl bg-white/5 lg:h-32" />
        </div>
        <div className="mt-8 h-24 rounded-2xl bg-white/5 sm:mt-10" />
        <div className="mt-8 grid gap-8 sm:mt-10 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="space-y-4">
            <div className="h-44 rounded-2xl bg-white/5 sm:h-48" />
            <div className="h-36 rounded-2xl bg-white/5" />
          </div>
          <div className="h-[min(520px,70vh)] rounded-2xl bg-white/5" />
        </div>
      </div>
    </div>
  );
}
