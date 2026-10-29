import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Clock } from "lucide-react";
import type { EnrichedMilestone } from "@/lib/db/repositories/trainee";

export function PathModules({ milestones }: { milestones: EnrichedMilestone[] }) {
  return (
        <div className="grid gap-4 md:grid-cols-3">
          {milestones.map(m => {
            const completed = m.status === "VERIFIED";
            const review = m.status === "READY_FOR_REVIEW";
            const locked = m.status === "LOCKED";
            const status = completed ? "Completed" : review ? "In Review" : locked ? "Not Started" : "In Progress";
            return <article key={m.id} className="flex min-w-0 flex-col break-words rounded-lg border border-beat-gold/20 bg-white p-5">
              <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-bold tracking-wide text-beat-maroon/60">{m.code}</span><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${completed ? "bg-beat-maroon text-beat-gold" : "bg-beat-gold/15 text-beat-maroon"}`}>{completed ? <CheckCircle2 className="h-3 w-3" /> : review ? <Clock className="h-3 w-3" /> : null}{status}</span></div>
              <h3 className="mt-4 font-bold text-beat-maroon">{m.title}</h3><p className="mt-2 flex-1 text-xs leading-relaxed text-beat-maroon/70">{m.description}</p>
              <Link href={`/trainee/dashboard/modules/${m.id}`} className="mt-5 inline-flex items-center gap-1 self-start text-xs font-bold text-beat-maroon underline decoration-beat-gold decoration-2 underline-offset-4">{completed ? "View approval" : review ? "View review status" : locked ? "View requirements" : "Continue module"}<ArrowUpRight className="h-3 w-3 text-beat-gold" /></Link>
            </article>;
          })}
          {!milestones.length && <p className="rounded-xl border border-dashed border-beat-gold/40 p-5 text-sm text-beat-maroon">Modules will appear here when this path is configured.</p>}
        </div>
  );
}
