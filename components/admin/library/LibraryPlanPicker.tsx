"use client";
import Link from "next/link";
import { useState } from "react";
import { getReusablePlanOptionsAction } from "@/lib/actions/plans";

type PlanOption = Extract<Awaited<ReturnType<typeof getReusablePlanOptionsAction>>, { success: true }>["data"][number];
export function LibraryPlanPicker({ milestoneId }: { milestoneId: string }) {
  const [open, setOpen] = useState(false);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function load() {
    setOpen(true); setLoading(true); setError("");
    try { const result = await getReusablePlanOptionsAction(); if (result.success) setPlans(result.data); else setError(result.error); }
    catch { setError("Could not load available plans. Please retry."); }
    finally { setLoading(false); }
  }
  return <section aria-label="Add milestone to a plan" className="space-y-3 border-t border-beat-border pt-4 text-sm">
    <h4 className="font-semibold">Add to a plan</h4>
    {!open ? <button type="button" className="beat-control min-h-11" onClick={() => void load()}>Add to plan</button> : loading ? <p role="status">Loading available plans…</p> : error ? <div role="alert"><p>{error}</p><button type="button" className="beat-control mt-2 min-h-11" onClick={() => void load()}>Retry plans</button></div> : plans.length ? <>
      <label className="block space-y-1 text-xs font-semibold">Training plan<select value={selected} onChange={event => setSelected(event.target.value)} className="min-h-11 w-full rounded-md border border-beat-border bg-white px-2 text-sm"><option value="">Choose a master or role variant</option>{plans.map(plan => <option key={plan.planId} value={plan.planId}>{plan.title} · {plan.hasDraft ? "Draft available" : "Published"}</option>)}</select></label>
      <p className="text-xs leading-relaxed text-beat-maroon/75">Open the editor, create or open its working draft, then choose Add to this draft. Opening a plan does not add this milestone or publish changes.</p>
      {selected && <Link href={`/trainer/plans/${encodeURIComponent(selected)}/builder?addMilestone=${encodeURIComponent(milestoneId)}`} className="beat-primary min-h-11">Open plan to add</Link>}
    </> : <p>No available reusable plans. Create a role variant from Training Plans first.</p>}
  </section>;
}
