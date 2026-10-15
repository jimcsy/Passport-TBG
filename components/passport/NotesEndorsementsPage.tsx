"use client";

import { Award, Archive, CheckCircle2, FileText } from "lucide-react";
import type { EnrichedMilestone } from "@/lib/db/repositories/trainee";

interface NotesEndorsementsPageProps {
  archivedMilestones?: EnrichedMilestone[];
  pageNumber?: number;
}

export function NotesEndorsementsPage({
  archivedMilestones = [],
  pageNumber,
}: NotesEndorsementsPageProps) {
  const hasArchived = archivedMilestones.length > 0;

  return (
    <div className="flex flex-1 flex-col p-2 text-beat-maroon">
      {/* Header */}
      <div className="border-b border-beat-gold/40 pb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-beat-gold" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-beat-gold">
            Official Endorsements
          </p>
        </div>
        <h3 className="mt-1 text-base font-semibold text-beat-maroon">
          Notes & Transferred Seals
        </h3>
      </div>

      {hasArchived ? (
        <div className="flex-1 pt-3 space-y-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-beat-maroon">
            <span className="flex items-center gap-1.5">
              <Archive className="h-3.5 w-3.5 text-beat-gold" />
              Preserved Competencies
            </span>
            <span className="font-mono text-[10px] text-beat-gold">
              {archivedMilestones.length} record{archivedMilestones.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {archivedMilestones.map((m) => (
              <div
                key={m.id}
                className="rounded-xl border border-beat-gold/30 bg-beat-canvas/40 p-2.5 text-left text-xs space-y-1 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-beat-gold bg-beat-maroon/5 px-1.5 py-0.2 rounded border border-beat-border">
                    {m.code}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-beat-maroon/10 px-2 py-0.5 text-[9px] font-semibold text-beat-maroon">
                    <CheckCircle2 className="h-2.5 w-2.5 text-beat-gold" />
                    Preserved Stamp
                  </span>
                </div>

                <p className="font-bold text-beat-maroon text-[11px] leading-tight">
                  {m.title}
                </p>

                {m.trainerName && (
                  <p className="text-[10px] text-beat-muted flex items-center justify-between pt-0.5">
                    <span>Verified by: {m.trainerName}</span>
                    {m.verifiedAt && (
                      <span className="font-mono">
                        {new Date(m.verifiedAt).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                )}
              </div>
            ))}
          </div>

          <p className="text-[10px] text-beat-muted italic text-center pt-2">
            These competencies were verified and preserved during role training plan version updates.
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-between pt-4">
          <div className="space-y-4">
            <p className="text-xs text-beat-muted leading-relaxed">
              This official endorsement spread is reserved for trainer commendations, special branch
              assignments, and cohort certifications.
            </p>

            {/* Ruled memo lines */}
            <div className="space-y-5 pt-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-px w-full border-b border-dashed border-beat-gold/30"
                />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-beat-gold/40 p-3 text-center bg-beat-canvas/20">
            <span className="text-[9px] font-mono uppercase tracking-widest text-beat-gold">
              BEAT Quality & Development Standard
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
