"use client";

import Image from "next/image";
import { useState } from "react";
import { STROBI_MASCOT_MAP } from "@/lib/constants/mascots";

export function StrobiBanner({ path = "ONBOARDING" }: { path?: string }) {
  const mascot = STROBI_MASCOT_MAP[path] ?? STROBI_MASCOT_MAP.ONBOARDING;
  const [expanded, setExpanded] = useState(true);
  return (
    <aside aria-label="Strobi learning guide" className="flex items-center gap-4 rounded-2xl border bg-white p-4 sm:gap-6 sm:p-6" style={{ borderColor: mascot.accentColor }}>
      <Image src={mascot.imagePath} alt={mascot.variantTitle} width={112} height={112} className="h-20 w-20 shrink-0 object-contain sm:h-28 sm:w-28" priority />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-beat-maroon/60">Your learning guide</p>
        <h2 className="mt-1 font-bold text-beat-maroon">{mascot.variantTitle}</h2>
        <button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)} className="mt-2 rounded-xl border border-beat-gold/30 bg-beat-gold/10 p-3 text-left text-sm leading-relaxed text-beat-maroon hover:bg-beat-gold/20">
          {expanded ? mascot.quote : "Show Strobi’s tip"}
        </button>
      </div>
    </aside>
  );
}
