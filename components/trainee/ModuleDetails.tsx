"use client";

import { MaterialListPanel } from "@/components/admin/MaterialListPanel";
import type { EnrichedMilestone } from "@/lib/db/repositories/trainee";
import { MilestoneCard } from "@/components/passport/MilestoneCard";
import { ModuleReviewPanel } from "./ModuleReviewPanel";

export function ModuleDetails({ milestone }: { milestone: EnrichedMilestone }) {
  return <>
    <MilestoneCard milestone={milestone} />
    {milestone.libraryMilestoneId ? <MaterialListPanel milestoneId={milestone.libraryMilestoneId} milestoneCode={milestone.code} /> : <section aria-label="Course materials" className="rounded-xl border border-beat-border bg-white p-5 text-beat-maroon"><h2 className="font-bold">Course materials (0)</h2><p className="mt-2 text-sm">No materials attached yet.</p></section>}
    <ModuleReviewPanel key={milestone.id} milestone={milestone} />
  </>;
}
