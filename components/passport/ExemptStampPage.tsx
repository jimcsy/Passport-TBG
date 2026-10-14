"use client";

import { Award, ShieldCheck } from "lucide-react";
import type { PathProgressSummary } from "@/lib/db/repositories/trainee";

interface ExemptStampPageProps {
  path?: PathProgressSummary;
  roleName?: string | null;
}

export function ExemptStampPage({ path, roleName }: ExemptStampPageProps) {
  const displayRole = roleName || "Assigned Role";
  const pathTitle = path?.title || "Development Path";

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center p-6 text-center select-none overflow-hidden">
      {/* Background Watermark Crest */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
        <Award className="h-64 w-64 text-beat-maroon" />
      </div>

      {/* Official Circular Seal */}
      <div className="relative flex flex-col items-center justify-center w-56 h-56 rounded-full border-2 border-dashed border-beat-gold/60 p-6 bg-beat-canvas/30 shadow-inner">
        {/* Inner concentric ring */}
        <div className="absolute inset-2.5 rounded-full border border-beat-gold/30 pointer-events-none" />

        <ShieldCheck className="h-8 w-8 text-beat-gold mb-2" />

        <span className="font-mono text-[9px] font-bold tracking-[0.25em] text-beat-gold uppercase">
          Official Status
        </span>

        <h4 className="mt-1 text-2xl font-black tracking-widest text-beat-maroon uppercase">
          EXEMPT
        </h4>

        <div className="my-2 h-0.5 w-12 bg-beat-gold/50" />

        <p className="text-[11px] font-bold text-beat-maroon max-w-[140px] leading-tight">
          {pathTitle}
        </p>

        <p className="mt-2 text-[10px] font-semibold text-beat-muted italic">
          Not required for {displayRole}
        </p>

        <span className="mt-2 text-[8px] font-mono uppercase tracking-wider text-beat-gold/80">
          BEAT · TBG PROTOCOL
        </span>
      </div>

      <p className="mt-6 text-[11px] text-beat-muted max-w-xs leading-relaxed">
        This competency track has been marked as exempt under your customized role training plan.
      </p>
    </div>
  );
}
