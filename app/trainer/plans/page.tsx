import Link from "next/link";
import { listTrainingPlans } from "@/lib/db/repositories/plans";
import { CreatePlanModal } from "@/components/admin/CreatePlanModal";
import { ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TrainingPlansPage() {
  const plans = await listTrainingPlans();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-beat-border pb-5">
        <div><h1 className="text-2xl font-semibold tracking-tight text-beat-maroon">Training plans</h1><p className="mt-2 text-sm text-beat-maroon/60">Build role-based plans and manage their draft and published versions.</p></div>
        <CreatePlanModal />
      </header>
      {plans.length === 0 ? (
        <div className="rounded-lg border border-beat-border bg-white px-6 py-12 text-center"><h2 className="text-base font-semibold text-beat-maroon">No training plans yet</h2><p className="mt-2 text-sm text-beat-maroon/60">Create a plan to start adding milestones.</p></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map(plan => <article key={plan.id} className="flex min-w-0 flex-col rounded-lg border border-beat-border bg-white p-5 text-beat-maroon">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-beat-maroon/60">
              <span className="capitalize">{plan.roleIdentifier.replace(/_/g, " ").toLowerCase()}</span>
              {plan.isDefault && <span className="rounded border border-beat-border px-2 py-0.5 text-[11px]">Default</span>}
            </div>
            <h2 className="mt-4 line-clamp-2 text-base font-semibold">{plan.title}</h2>
            <p className="mt-1 text-xs text-beat-maroon/60">{plan.restaurantBrand || "All brands"}</p>
            {plan.description && <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-beat-maroon/70">{plan.description}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-beat-maroon/70">
              {plan.publishedVersionNumber ? <span className="rounded border border-beat-border bg-beat-canvas px-2 py-1">Published v{plan.publishedVersionNumber}</span> : !plan.hasDraft ? <span className="rounded border border-beat-border px-2 py-1">v{plan.latestVersionNumber} · {plan.status.charAt(0) + plan.status.slice(1).toLowerCase()}</span> : null}
              {plan.hasDraft && <span className="rounded border border-beat-gold/30 bg-beat-gold/5 px-2 py-1">Draft v{plan.draftVersionNumber}</span>}
            </div>
            <dl className="mt-auto grid grid-cols-2 gap-4 border-b border-beat-border py-5 text-xs">
              <div><dt className="text-beat-maroon/60">Milestones</dt><dd className="mt-1 font-medium">{plan.nodeCount}</dd></div>
              <div><dt className="text-beat-maroon/60">Enrolled trainees</dt><dd className="mt-1 font-medium">{plan.assignedTraineesCount}</dd></div>
            </dl>
            <footer className="mt-4 flex items-center justify-between gap-3"><span className="min-w-0 truncate text-[11px] text-beat-maroon/60" title={plan.createdByName}>{plan.createdByName}</span><Link href={`/trainer/plans/${plan.id}/builder`} className="beat-control shrink-0" aria-label={`Open ${plan.title}`}>Open plan<ArrowRight aria-hidden="true" className="h-3.5 w-3.5" /></Link></footer>
          </article>)}
        </div>
      )}
    </div>
  );
}
