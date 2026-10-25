"use client";

import { useId, useState } from "react";
import { PassportStampSVG } from "./PassportStampSVG";
import { StampMetadata } from "./StampDetailTooltip";
import type { EnrichedMilestone } from "@/lib/db/repositories/trainee";

export function PassportStamp({ milestone, onInspect, detailPanelId }: { milestone: EnrichedMilestone; onInspect?: (milestone: EnrichedMilestone) => void; detailPanelId?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const verified = milestone.status === "VERIFIED";
  const inReview = milestone.status === "READY_FOR_REVIEW";
  function inspect() {
    if (onInspect) onInspect(milestone);
    setOpen(true);
  }
  return (
    <div className="relative flex flex-col items-center gap-2 text-center" onMouseEnter={inspect} onMouseLeave={() => setOpen(false)}>
      <button type="button" aria-label={`${milestone.title}: ${verified ? "verified and stamped" : inReview ? "in review" : "incomplete"}, view details`}
        aria-controls={detailPanelId}
        aria-describedby={open && verified ? id : undefined} aria-expanded={verified ? open : undefined}
        onFocus={inspect} onBlur={() => setOpen(false)} onClick={inspect}
        className="flex flex-col items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-beat-gold">
        <PassportStampSVG design={milestone.stampDesign} path={milestone.path} verified={verified} className="h-16 w-16 sm:h-20 sm:w-20" />
        <span className="text-[9px] font-bold text-beat-maroon">{milestone.code}</span>
      </button>
      <span className="max-w-32 text-[11px] font-semibold leading-snug text-beat-maroon">{milestone.title}</span>
      {verified && open && (
        <div id={id} role="tooltip" className="fixed bottom-4 left-4 right-4 z-50 md:absolute md:bottom-auto md:left-auto md:right-auto md:top-12 md:w-52 rounded-xl border border-beat-gold bg-white p-4 text-left text-xs text-beat-maroon shadow-xl">
          <StampMetadata milestone={milestone} />
        </div>
      )}
    </div>
  );
}
