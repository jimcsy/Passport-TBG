"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteVariant } from "@/lib/actions/learning-paths";
import { VariantEditor, type EditableVariant } from "./VariantEditor";

export function TrainingPlanCatalog({ master, variants, initiallyOpen }: {
  master: { title: string; planId: string; nodeCount: number };
  variants: (EditableVariant & { status: string; versionNumber: number; enrolledTraineeCount: number })[]; initiallyOpen?: boolean;
}) {
  const router = useRouter(); const [error, setError] = useState(""); const [deleting, setDeleting] = useState<string>();
  async function remove(variant: EditableVariant) {
    if (!window.confirm(`Delete “${variant.title}” from the catalog? Existing trainee instances, progress and stamps will be preserved.`)) return;
    setDeleting(variant.id); setError("");
    try { const result = await deleteVariant(variant.id); if (!result.success) setError(result.error || "Unable to delete variant."); else router.refresh(); }
    catch { setError("Unable to delete variant. Please try again."); } finally { setDeleting(undefined); }
  }
  return <article aria-label="Master training plan" className="rounded-xl border border-beat-border bg-white p-4 md:p-6">
    <p className="text-xs font-bold uppercase text-beat-gold">Master template · Universal foundation</p>
    <h2 className="mt-2 text-lg font-bold text-beat-maroon">{master.title}</h2>
    <p className="my-3 text-sm text-beat-muted">Five core pillars · {master.nodeCount} milestones. Every new trainee begins with a private foundation instance.</p>
    <div className="flex flex-wrap gap-3"><Link className="beat-control" href={`/trainer/plans/${master.planId}/builder`}>Edit Master Nodes</Link><VariantEditor initiallyOpen={initiallyOpen} /></div>
    {error && <p role="alert" className="mt-3 text-sm text-beat-maroon">{error}</p>}
    <details open className="mt-5 border-t border-beat-border pt-4"><summary className="min-h-11 cursor-pointer font-semibold text-beat-maroon">Role Variants ({variants.length})</summary>
      <div className="mt-3 space-y-3">{variants.length === 0 && <p className="text-sm text-beat-muted">No role variants yet. Create one to customize a reusable foundation track.</p>}
        {variants.map(variant => <section key={variant.id} aria-label={variant.title} className="rounded-lg border border-beat-border bg-beat-canvas p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-beat-maroon">{variant.title}</h3><span className="rounded-full border border-beat-gold/30 bg-white px-3 py-1 text-xs font-semibold text-beat-maroon">{variant.enrolledTraineeCount} enrolled {variant.enrolledTraineeCount === 1 ? "trainee" : "trainees"}</span></div><p className="mt-1 text-xs text-beat-muted">{variant.targetDepartment || "Department not tagged"} · {variant.targetPosition || "Position not tagged"}</p>
          <p className="my-3 text-xs text-beat-muted">{variant.status} · v{variant.versionNumber} · {variant.nodes.length} milestones</p>
          <div className="flex flex-wrap gap-2"><VariantEditor variant={variant} /><Link className="beat-control" href={`/trainer/plans/${variant.planId}/builder`}>Edit Nodes</Link><button type="button" disabled={!!deleting} className="beat-control" onClick={() => remove(variant)}>{deleting === variant.id ? "Deleting…" : "Delete Variant"}</button></div>
        </section>)}
      </div>
    </details>
  </article>;
}
