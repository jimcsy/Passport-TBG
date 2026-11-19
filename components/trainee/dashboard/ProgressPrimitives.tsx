import type { EnrichedMilestone } from "@/lib/db/repositories/trainee";
import type { MilestoneStatus } from "@/lib/types/models";
import { STATUS_LABEL } from "./progress";

const SEGMENT: Record<MilestoneStatus, string> = {
  VERIFIED: "bg-beat-gold",
  READY_FOR_REVIEW: "bg-beat-gold/45",
  IN_PROGRESS: "bg-beat-maroon",
  LOCKED: "bg-beat-gold/15",
};

/** One segment per milestone, coloured by status. Falls back to a stacked bar for long paths. */
export function PathBar({ milestones, className = "" }: { milestones: EnrichedMilestone[]; className?: string }) {
  const sorted = [...milestones].sort((a, b) => a.orderIndex - b.orderIndex);
  if (!sorted.length) return <span aria-hidden="true" className={`block h-1.5 rounded-full bg-beat-gold/15 ${className}`} />;
  if (sorted.length > 14) {
    const order: MilestoneStatus[] = ["VERIFIED", "READY_FOR_REVIEW", "IN_PROGRESS", "LOCKED"];
    return <span aria-hidden="true" className={`flex h-1.5 overflow-hidden rounded-full bg-beat-gold/15 ${className}`}>
      {order.map(status => {
        const count = sorted.filter(item => item.status === status).length;
        return count && status !== "LOCKED" ? <span key={status} className={SEGMENT[status]} style={{ width: `${(count / sorted.length) * 100}%` }} /> : null;
      })}
    </span>;
  }
  return <span aria-hidden="true" className={`flex gap-[3px] ${className}`}>
    {sorted.map(item => <span key={item.id} className={`h-1.5 flex-1 rounded-full ${SEGMENT[item.status]}`} />)}
  </span>;
}

export function StatusIcon({ status, className = "h-4 w-4" }: { status: MilestoneStatus; className?: string }) {
  if (status === "VERIFIED") return <svg viewBox="0 0 16 16" aria-hidden="true" className={className}><circle cx="8" cy="8" r="7.25" className="fill-beat-gold" /><path d="M5 8.2 7 10.2 11 6" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (status === "READY_FOR_REVIEW") return <svg viewBox="0 0 16 16" aria-hidden="true" className={className}><circle cx="8" cy="8" r="6.5" fill="none" className="stroke-beat-gold" strokeWidth="1.5" /><path d="M8 4.8V8l2.2 1.4" fill="none" className="stroke-beat-gold" strokeWidth="1.5" strokeLinecap="round" /></svg>;
  if (status === "IN_PROGRESS") return <svg viewBox="0 0 16 16" aria-hidden="true" className={className}><circle cx="8" cy="8" r="6.5" fill="none" className="stroke-beat-maroon" strokeWidth="1.5" /><path d="M8 1.5a6.5 6.5 0 0 1 0 13Z" className="fill-beat-maroon" /></svg>;
  return <svg viewBox="0 0 16 16" aria-hidden="true" className={className}><circle cx="8" cy="8" r="6.5" fill="none" className="stroke-beat-maroon/25" strokeWidth="1.5" /></svg>;
}

export function StatusLegend() {
  return <ul aria-label="Status legend" className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-beat-maroon/60">
    {(["VERIFIED", "READY_FOR_REVIEW", "IN_PROGRESS", "LOCKED"] as const).map(status => <li key={status} className="inline-flex items-center gap-1.5"><StatusIcon status={status} className="h-3.5 w-3.5" />{STATUS_LABEL[status]}</li>)}
  </ul>;
}
