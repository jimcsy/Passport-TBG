import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Clock } from "lucide-react";
import type { EnrichedMilestone } from "@/lib/db/repositories/trainee";

export function PathModules({ milestones }: { milestones: EnrichedMilestone[] }) {
  return (
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {milestones.map(m => {
            const completed = m.status === "VERIFIED";
            const review = m.status === "READY_FOR_REVIEW";
            const locked = m.status === "LOCKED";
            const status = completed ? "Completed" : review ? "In Review" : locked ? "Not Started" : "In Progress";
            return <article key={m.id} className="flex min-w-0 flex-col break-words rounded-xl border border-beat-gold/25 bg-white p-4 sm:p-5 shadow-2xs transition-colors hover:border-beat-gold/45">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold text-beat-maroon/70">{m.code}</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${completed ? "bg-beat-maroon text-beat-gold" : "bg-beat-gold/15 text-beat-maroon"}`}>
                  {completed ? <CheckCircle2 className="h-3 w-3" /> : review ? <Clock className="h-3 w-3" /> : null}
                  {status}
                </span>
              </div>
              <h3 className="mt-3 text-base font-bold text-beat-maroon leading-snug">{m.title}</h3>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-beat-maroon/70">{m.description}</p>
              <Link href={`/trainee/dashboard/modules/${m.id}`} className="mt-4 inline-flex min-h-10 w-full sm:w-auto items-center justify-center gap-1.5 self-start rounded-lg border border-beat-gold/30 bg-beat-canvas/60 px-4 text-xs font-bold text-beat-maroon transition-colors hover:bg-beat-gold/15 active:scale-[0.98]">
                {completed ? "View approval" : review ? "View review status" : locked ? "View requirements" : "Continue module"}
                <ArrowUpRight className="h-3 w-3 text-beat-gold" />
              </Link>
            </article>;
          })}
          {!milestones.length && <p className="rounded-xl border border-dashed border-beat-gold/40 p-5 text-sm text-beat-maroon">Modules will appear here when this path is configured.</p>}
        </div>
  );
}
