import Link from "next/link";
import type { MilestoneLibraryRow } from "@/lib/db/repositories/milestone-library";

export function MilestoneUsage({ usage }: { usage: MilestoneLibraryRow["usage"] }) {
  return <section aria-label="Used in plans" className="space-y-2 border-t border-beat-border pt-4 text-sm text-beat-maroon">
    <h4 className="font-semibold">Used in plans</h4>
    <p>{usage.reusablePlanCount} current reusable {usage.reusablePlanCount === 1 ? "plan" : "plans"}</p>
    <ul className="space-y-1">{usage.reusablePlans.map(plan => <li key={plan.planId}><Link href={`/trainer/plans/${plan.planId}/builder`} className="inline-flex min-h-11 items-center break-words font-medium underline decoration-beat-gold underline-offset-4 [overflow-wrap:anywhere]">{plan.title}</Link><p className="text-xs text-beat-maroon/75">{[plan.draft && "Draft", plan.published && "Published"].filter(Boolean).join(" · ")}</p></li>)}</ul>
    <p className="text-xs leading-relaxed text-beat-maroon/75">{usage.historicalReusablePlanCount} reusable plans in history · {usage.historicalVersionCount} historical versions · {usage.privateInstanceCount} private instances · {usage.unclassifiedPlanCount} legacy plans. Counts can overlap.</p>
    <p>{usage.materialAffectedActiveTraineeCount} active trainees with shared-material access</p>
  </section>;
}
