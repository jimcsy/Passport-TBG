"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { PassportStampSVG } from "./PassportStampSVG";
import { StampMetadata } from "./StampDetailTooltip";
import type { EnrichedMilestone } from "@/lib/db/repositories/trainee";

export function PassportStamp({ milestone }: { milestone: EnrichedMilestone }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const verified = milestone.status === "VERIFIED";
  const inReview = milestone.status === "READY_FOR_REVIEW";
  return (
    <div className="relative flex flex-col items-center gap-2 text-center" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <Link href={`/trainee/dashboard/modules/${milestone.id}`} aria-label={`${milestone.title}: ${verified ? "verified and stamped" : inReview ? "in review" : milestone.status === "LOCKED" ? "locked" : "incomplete"}, open module`}
        aria-describedby={open ? id : undefined}
        onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onKeyDown={event => { if (event.key === "Escape") setOpen(false); }}
        className="flex flex-col items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-beat-gold">
        <PassportStampSVG design={milestone.stampDesign} path={milestone.path} verified={verified} className="h-16 w-16 sm:h-20 sm:w-20" />
        <span className="text-[9px] font-bold text-beat-maroon">{milestone.code}</span>
      </Link>
      <span className="max-w-32 text-[11px] font-semibold leading-snug text-beat-maroon">{milestone.title}</span>
      {open && (
        <div id={id} role="tooltip" className="fixed bottom-4 left-4 right-4 z-50 md:absolute md:bottom-auto md:left-auto md:right-auto md:top-12 md:w-52 rounded-xl border border-beat-gold bg-white p-4 text-left text-xs text-beat-maroon shadow-xl">
          <StampMetadata milestone={milestone} />
        </div>
      )}
    </div>
  );
}
