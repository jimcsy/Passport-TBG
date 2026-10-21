export function PageSkeleton() {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <span className="sr-only">Loading page…</span>
      <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
        <div className="space-y-3 border-b border-beat-border pb-5">
          <div className="h-7 w-48 max-w-full rounded bg-beat-border" />
          <div className="h-4 w-80 max-w-full rounded bg-beat-border/60" />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="space-y-4 rounded-lg border border-beat-border bg-white p-5">
              <div className="h-4 w-24 rounded bg-beat-border/60" />
              <div className="h-8 w-16 rounded bg-beat-border" />
              <div className="h-3 w-3/4 rounded bg-beat-border/60" />
            </div>
          ))}
        </div>

        <div className="divide-y divide-beat-border rounded-lg border border-beat-border bg-white px-5">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="flex items-center gap-4 py-5">
              <div className="h-10 w-10 shrink-0 rounded-lg bg-beat-border/60" />
              <div className="flex-1 space-y-3">
                <div className="h-4 w-1/2 rounded bg-beat-border" />
                <div className="h-3 w-3/4 rounded bg-beat-border/60" />
              </div>
              <div className="hidden h-7 w-20 rounded bg-beat-border/60 sm:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
