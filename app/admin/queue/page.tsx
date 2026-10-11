export default function QueuePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-beat-border">
        <div>
          <h1 className="text-2xl font-black text-beat-maroon">Review Queue</h1>
          <p className="text-xs text-beat-muted mt-0.5">
            Milestones submitted by trainees awaiting trainer verification.
          </p>
        </div>
      </div>
      <div className="rounded-3xl bg-beat-card p-8 border border-beat-border text-center text-sm text-beat-muted">
        Queue UI loading...
      </div>
    </div>
  );
}
