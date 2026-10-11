export default function TraineesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-beat-border">
        <div>
          <h1 className="text-2xl font-black text-beat-maroon">Trainee Directory</h1>
          <p className="text-xs text-beat-muted mt-0.5">
            Filter by restaurant brand, branch location, and cohort batch.
          </p>
        </div>
      </div>
      <div className="rounded-3xl bg-beat-card p-8 border border-beat-border text-center text-sm text-beat-muted">
        Trainee Directory loading...
      </div>
    </div>
  );
}
