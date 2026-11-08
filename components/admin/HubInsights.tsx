import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { HubInsights as Insights } from "@/lib/dashboard/insights";
import { HubEngagementChart } from "./HubEngagementChart";
import { CohortProgressHeatmap } from "./CohortProgressHeatmap";

export function HubInsights({ data }: { data: Insights }) {
  const summaries = [
    { title: "Registered trainees", value: data.registered, detail: `${data.assigned} with an active training plan`, note: "Manage trainee profiles and keep their learning paths up to date.", href: "/trainer/trainees", action: "Trainee directory" },
    { title: "Training Content", value: data.viewers, detail: `of ${data.registered} trainees have viewed content`, note: `${data.milestones} shared ${data.milestones === 1 ? "milestone" : "milestones"} · ${data.materials} ${data.materials === 1 ? "material" : "materials"}. Counts each trainee’s first module opening.`, href: "/trainer/plans", action: "Explore training content" },
    { title: "Awaiting verification", value: data.pendingReviews, detail: `${data.verified} verified milestones in current plans`, note: data.pendingReviews ? "Review trainee reflections and award their next milestone stamp." : "You’re up to date. New review requests will appear here.", href: "/trainer/queue", action: "Open verifications" },
  ];
  return <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
    <div className="min-w-0 space-y-6">
      <nav aria-label="Trainer insights and tools" className="grid gap-4 sm:grid-cols-3">{summaries.map(item => <section key={item.title} aria-label={item.title} className="flex min-w-0 flex-col rounded-xl border border-beat-border bg-white p-5">
        <h2 className="text-xs font-semibold text-beat-maroon/75">{item.title}</h2>
        <p className="mt-3 text-4xl font-semibold tabular-nums tracking-tight text-beat-maroon">{item.value.toLocaleString("en-PH")}</p>
        <p className="mt-2 text-xs leading-relaxed text-beat-maroon">{item.detail}</p>
        <p className="mb-5 mt-4 text-xs leading-relaxed text-beat-maroon/70">{item.note}</p>
        <Link href={item.href} className="beat-control mt-auto min-h-11 justify-between text-xs">{item.action}<ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-beat-gold" /></Link>
      </section>)}</nav>
      <HubEngagementChart series={data.series} />
      <CohortProgressHeatmap data={data.cohorts} />
    </div>
    <aside aria-label="Training insights" className="min-w-0 rounded-xl border border-beat-border bg-white p-5">
      <h2 className="text-base font-semibold text-beat-maroon">Pillar progress</h2>
      <p className="mt-1 text-xs leading-relaxed text-beat-maroon/70">Verified milestones across current trainee plans.</p>
      <ul className="mt-6 space-y-5">{data.pillars.map(pillar => {
        const percent = pillar.total ? Math.round(pillar.verified / pillar.total * 100) : 0;
        return <li key={pillar.path}>
          <div className="flex items-start justify-between gap-3 text-xs"><h3 className="min-w-0 font-semibold leading-relaxed text-beat-maroon">{pillar.title}</h3><span className="shrink-0 font-semibold tabular-nums text-beat-maroon">{percent}%</span></div>
          <div role="progressbar" aria-label={`${pillar.title} verified milestones`} aria-valuemin={0} aria-valuemax={pillar.total || 1} aria-valuenow={pillar.verified} aria-valuetext={`${pillar.verified} of ${pillar.total} milestones verified`} className="mt-2 h-1.5 overflow-hidden rounded-full bg-beat-gold/15"><div className="h-full rounded-full bg-beat-gold" style={{ width: `${percent}%` }} /></div>
          <p className="mt-2 text-[11px] leading-relaxed text-beat-maroon/70">{pillar.verified}/{pillar.total} verified · {pillar.learners} {pillar.learners === 1 ? "trainee" : "trainees"}</p>
        </li>;
      })}</ul>
      <div className="mt-6 border-t border-beat-border pt-5"><h2 className="text-sm font-semibold text-beat-maroon">Needs attention</h2>
        <Link href="/trainer/queue" className="mt-3 flex min-h-11 items-center justify-between gap-3 rounded-md py-2 text-xs text-beat-maroon hover:underline"><span>{data.pendingReviews} pending {data.pendingReviews === 1 ? "review" : "reviews"}</span><ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-beat-gold" /></Link>
        {data.pendingReviews > 0 && <p className="text-[11px] text-beat-maroon/70">{data.oldestReviewDays ? `Oldest dated request: ${data.oldestReviewDays} days ago` : "Open the queue to review these requests."}</p>}
        <Link href="/trainer/trainees" className="mt-2 flex min-h-11 items-center justify-between gap-3 rounded-md py-2 text-xs text-beat-maroon hover:underline"><span>{data.unassigned} without an active plan</span><ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-beat-gold" /></Link>
      </div>
      <div className="mt-5 border-t border-beat-border pt-5 text-xs text-beat-maroon/70"><p><strong className="text-lg font-semibold tabular-nums text-beat-maroon">{data.completionPercent}%</strong> of assigned milestones verified</p><p className="mt-2 leading-relaxed">Archived progress and revoked stamps are excluded from current completion.</p></div>
    </aside>
  </div>;
}
