"use client";
export function UploadProgressBar({ fileName, percent, onCancel }: { fileName: string; percent: number; onCancel: () => void }) {
  return <div className="rounded-lg border border-beat-border p-3 text-xs text-beat-maroon"><div className="flex items-center justify-between gap-3"><span className="min-w-0 break-all">{fileName} · {percent}%</span><button type="button" onClick={onCancel} disabled={percent >= 100} className="min-h-11 shrink-0 underline">{percent >= 100 ? "Confirming…" : "Cancel"}</button></div><div role="progressbar" aria-label={`Uploading ${fileName}`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded bg-beat-canvas"><div className="h-full bg-beat-gold" style={{ width: `${percent}%` }} /></div></div>;
}
