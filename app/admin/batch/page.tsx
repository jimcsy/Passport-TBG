export default function BatchPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-beat-border">
        <div>
          <h1 className="text-2xl font-black text-beat-maroon">Batch Sign-Off Tool</h1>
          <p className="text-xs text-beat-muted mt-0.5">
            Bulk attendance and milestone sign-off for cohort training sessions.
          </p>
        </div>
      </div>
      <div className="rounded-3xl bg-beat-card p-8 border border-beat-border text-center text-sm text-beat-muted">
        Batch tool loading...
      </div>
    </div>
  );
}
