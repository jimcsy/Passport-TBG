import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { STROBI_MASCOT_MAP } from "@/lib/constants/mascots";
import { PathBar } from "./ProgressPrimitives";
import { moduleHref, pathNumber, STATUS_LABEL, type LocatedMilestone } from "./progress";

const ACTION = { IN_PROGRESS: "Resume module", LOCKED: "Start module", READY_FOR_REVIEW: "View review status", VERIFIED: "View approval" } as const;

export function ContinueLearning({ current, others, totalModules, complete }: {
  current?: LocatedMilestone;
  others: LocatedMilestone[];
  totalModules: number;
  complete: boolean;
}) {
  if (!current) {
    if (!complete) return null;
    return <section aria-labelledby="continue-title" className="space-y-3">
      <h2 id="continue-title" className="text-[13px] font-semibold text-beat-maroon/70">Pick up where you left off</h2>
      <div className="flex items-center gap-4 rounded-2xl border border-beat-gold/25 bg-white p-5">
        <Sparkles aria-hidden="true" className="h-6 w-6 shrink-0 text-beat-gold" />
        <div><p className="font-semibold text-beat-maroon">All caught up</p><p className="mt-0.5 text-sm text-beat-maroon/65">Every module in your track is verified.</p></div>
      </div>
    </section>;
  }
  const { milestone, path, pathIndex } = current;
  const mascot = STROBI_MASCOT_MAP[path.path];

  return <section aria-labelledby="continue-title" className="space-y-3">
    <h2 id="continue-title" className="text-[13px] font-semibold text-beat-maroon/70">Pick up where you left off</h2>
    <div className="overflow-hidden rounded-2xl border border-beat-gold/25 bg-white flex flex-col xl:grid xl:grid-cols-[minmax(0,1fr)_14.5rem] 2xl:grid-cols-[minmax(0,1fr)_15rem]">
      <article className="p-5 sm:p-6">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-beat-maroon/60">
          {mascot && <Image src={mascot.imagePath} alt="" width={20} height={20} unoptimized className="h-5 w-5 object-contain mix-blend-multiply" />}
          <span>Path {pathNumber(pathIndex)} · {path.title}</span>
          <span className="rounded bg-beat-maroon/[.06] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-beat-maroon/75">{milestone.code}</span>
        </p>
        <h3 className="mt-3 text-xl font-bold leading-snug tracking-tight text-beat-maroon">{milestone.title}</h3>
        {milestone.description && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-beat-maroon/70">{milestone.description}</p>}
        <div className="mt-5 flex items-center gap-3">
          <PathBar milestones={path.milestones} className="w-28 sm:w-36" />
          <span className="text-xs text-beat-maroon/60">{path.verified} of {path.total} verified in this path</span>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href={moduleHref(milestone.id)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-beat-maroon px-4 text-[13px] font-semibold text-white transition-colors hover:bg-beat-maroon-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-beat-gold">
            <Play aria-hidden="true" className="h-3.5 w-3.5 fill-beat-gold text-beat-gold" />{ACTION[milestone.status]}
          </Link>
          <span className="text-xs text-beat-maroon/55">Status · {STATUS_LABEL[milestone.status]}</span>
        </div>
      </article>

      <aside aria-label="Also in progress" className="flex flex-col border-t border-beat-gold/20 bg-[#FCFAF6] p-5 xl:border-l xl:border-t-0">
        <p className="text-[11px] font-semibold text-beat-maroon/60">Also in progress</p>
        {others.length ? <ul className="mt-3 divide-y divide-beat-gold/15 sm:grid sm:grid-cols-2 sm:gap-3 sm:divide-y-0 xl:block xl:space-y-0 xl:divide-y xl:divide-beat-gold/15">
          {others.map(item => <li key={item.milestone.id} className="py-2.5 first:pt-0 sm:py-0 sm:rounded-xl sm:border sm:border-beat-gold/20 sm:bg-white sm:p-3 xl:rounded-none xl:border-0 xl:bg-transparent xl:p-0 xl:py-3">
            <Link href={moduleHref(item.milestone.id)} className="group block">
              <span className="font-mono text-[10px] font-semibold text-beat-maroon/50">{item.milestone.code}</span>
              <span className="mt-0.5 line-clamp-2 block text-[13px] font-semibold leading-snug text-beat-maroon group-hover:underline group-hover:decoration-beat-gold group-hover:underline-offset-2">{item.milestone.title}</span>
              <span className="mt-2 flex items-center gap-2"><PathBar milestones={item.path.milestones} className="flex-1" /><span className="text-[11px] tabular-nums text-beat-maroon/55">{item.path.verified}/{item.path.total}</span></span>
            </Link>
          </li>)}
        </ul> : <p className="mt-3 text-xs leading-relaxed text-beat-maroon/55">Nothing else in progress. Focus on this one.</p>}
        <Link href="#development-paths" className="mt-auto inline-flex items-center gap-1 pt-4 text-xs font-semibold text-beat-maroon hover:underline hover:decoration-beat-gold hover:underline-offset-4">
          View all {totalModules} modules<ArrowRight aria-hidden="true" className="h-3.5 w-3.5 text-beat-gold" />
        </Link>
      </aside>
    </div>
  </section>;
}
