"use client";
import { useId, useState, type ReactNode } from "react";
import type { EnrichedMilestone } from "@/lib/db/repositories/trainee";

export function StampMetadata({ milestone }: { milestone: EnrichedMilestone }) {
  return <dl className="space-y-2 text-xs text-beat-maroon">
    <div><dt className="font-semibold">Milestone</dt><dd>{milestone.code}: {milestone.title}</dd></div>
    <div><dt className="font-semibold">Status</dt><dd>{milestone.status === "VERIFIED" ? "Verified & Stamped" : milestone.status === "READY_FOR_REVIEW" ? "In Review" : milestone.status === "LOCKED" ? "Locked" : "In Progress"}</dd></div>
    <div><dt className="font-semibold">Description</dt><dd>{milestone.description}</dd></div>
    {milestone.status === "VERIFIED" && <>
    <div><dt className="font-semibold">Trainer</dt><dd>{milestone.trainerName || "Not recorded"}</dd></div>
    <div><dt className="font-semibold">Verified at</dt><dd>{milestone.verifiedAt ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(milestone.verifiedAt)) : "Not recorded"}</dd></div>
    <div><dt className="font-semibold">Verification hash</dt><dd className="font-mono">{milestone.verificationHash?.slice(0, 8) || "Not recorded"}</dd></div>
    </>}
    {milestone.traineeNote && <div><dt className="font-semibold">Trainee reflection</dt><dd className="line-clamp-2 italic">{milestone.traineeNote}</dd></div>}
    {milestone.trainerNote && <div><dt className="font-semibold">Trainer feedback</dt><dd className="line-clamp-2">{milestone.trainerNote}</dd></div>}
  </dl>;
}
export function StampDetailTooltip({ milestone, children }: { milestone: EnrichedMilestone; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
    <button type="button" aria-label={`Stamp details for ${milestone.code}`} aria-expanded={open} aria-describedby={open ? id : undefined} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onClick={() => setOpen(true)} onKeyDown={event => { if (event.key === "Escape") setOpen(false); }}>{children}</button>
    {open && <div id={id} role="tooltip" className="absolute right-0 top-full z-30 w-64 max-w-[80vw] rounded-lg border border-beat-gold bg-white p-4 text-left shadow-xl"><StampMetadata milestone={milestone} /><button type="button" onClick={() => setOpen(false)} className="mt-3 min-h-11 text-xs underline">Close details</button></div>}
  </div>;
}
