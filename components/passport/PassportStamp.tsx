"use client";

import { useId, useState } from "react";
import { Check, Clock } from "lucide-react";
import type { EnrichedMilestone } from "@/lib/db/repositories/trainee";

export function PassportStamp({ milestone, onInspect, detailPanelId }: { milestone: EnrichedMilestone; onInspect?: (milestone: EnrichedMilestone) => void; detailPanelId?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const verified = milestone.status === "VERIFIED";
  const inReview = milestone.status === "READY_FOR_REVIEW";
  function inspect() {
    if (onInspect) onInspect(milestone);
    else setOpen(true);
  }
  return (
    <div className="relative flex flex-col items-center gap-2 text-center" onMouseEnter={inspect} onMouseLeave={() => setOpen(false)}>
      <button type="button" aria-label={`${milestone.title}: ${verified ? "verified and stamped" : inReview ? "in review" : "incomplete"}, view details`}
        aria-controls={detailPanelId}
        aria-describedby={open && verified ? id : undefined} aria-expanded={!onInspect && verified ? open : undefined}
        onFocus={inspect} onBlur={() => setOpen(false)} onClick={inspect}
        className={`flex h-16 w-16 flex-col items-center justify-center rounded-full border-2 text-[9px] font-bold sm:h-20 sm:w-20 ${verified ? "border-beat-gold bg-beat-maroon text-beat-gold shadow-md ring-4 ring-beat-gold/10" : "border-dashed border-beat-gold/50 bg-beat-canvas text-beat-maroon/70"}`}>
        {verified ? <Check className="h-6 w-6" /> : inReview ? <Clock className="h-5 w-5" /> : <span className="text-lg">·</span>}
        <span>{milestone.code}</span>
      </button>
      <span className="max-w-32 text-[11px] font-semibold leading-snug text-beat-maroon">{milestone.title}</span>
      {verified && open && (
        <div id={id} role="tooltip" className="absolute top-12 z-30 w-52 rounded-xl border border-beat-gold bg-white p-4 text-left text-xs text-beat-maroon shadow-xl">
          <p className="font-bold">Trainer: {milestone.trainerName || "Not recorded"}</p>
          <p className="mt-2 text-[10px] uppercase tracking-wide">Signature · digital approval</p>
          <p className="mt-1 font-semibold italic">{milestone.trainerName || "Not recorded"}</p>
          <p className="text-[10px]">{milestone.trainerEmployeeId || "Trainer ID not recorded"}</p>
          <p className="mt-2">Date approved: {milestone.verifiedAt ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" }).format(new Date(milestone.verifiedAt)) : "Not recorded"}</p>
          {milestone.trainerNote && <p className="mt-2 border-t border-beat-gold/20 pt-2">{milestone.trainerNote}</p>}
        </div>
      )}
    </div>
  );
}
