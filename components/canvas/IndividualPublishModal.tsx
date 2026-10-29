"use client";
import { useEffect, useState } from "react";
import { confirmIndividualPublishAction, individualPublishContextAction, previewIndividualPublishAction } from "@/lib/actions/individual-publish";
import type { EditableGraph } from "@/lib/plans/merge";
import type { IndividualPublishInput, IndividualPublishPreview } from "@/lib/validations/individual-publish";
import { positionsForDepartment, TBG_DEPARTMENTS } from "@/lib/constants/tbg-org";

type Context = Extract<Awaited<ReturnType<typeof individualPublishContextAction>>, { success: true }>["data"];
export function IndividualPublishModal({ isOpen, planId, graph, onClose, onPublished }: {
  isOpen: boolean; planId: string; graph: EditableGraph; onClose: () => void; onPublished: (count: number) => void;
}) {
  const [context, setContext] = useState<Context>();
  const [scope, setScope] = useState<IndividualPublishInput["scope"]>("individual");
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState(""); const [department, setDepartment] = useState(""); const [position, setPosition] = useState(""); const [changelog, setChangelog] = useState("");
  const [preview, setPreview] = useState<IndividualPublishPreview>(); const [pending, setPending] = useState(false); const [error, setError] = useState("");
  useEffect(() => {
    if (!isOpen) return;
    let canceled = false; setContext(undefined); setScope("individual"); setPreview(undefined); setError(""); setChangelog("");
    individualPublishContextAction(planId).then(result => {
      if (canceled) return;
      if (!result.success) setError(result.error);
      else { setContext(result.data); setSelected([result.data.traineeId]); setTitle(`${result.data.variantTitle} — ${result.data.traineeName}`.slice(0, 100)); setDepartment(result.data.department); setPosition(result.data.position); }
    }).catch(() => { if (!canceled) setError("Unable to load enrolled trainees. Close and try again."); });
    return () => { canceled = true; };
  }, [isOpen, planId]);
  useEffect(() => { setPreview(undefined); }, [graph]);
  useEffect(() => {
    if (!isOpen) return;
    const close = (e: KeyboardEvent) => { if (e.key === "Escape" && !pending) onClose(); };
    document.addEventListener("keydown", close); return () => document.removeEventListener("keydown", close);
  }, [isOpen, pending, onClose]);
  if (!isOpen) return null;
  const input: IndividualPublishInput = { planId, graph, scope, selectedTraineeIds: selected, variantTitle: title, department, position, changelog };
  async function review(event: React.FormEvent) {
    event.preventDefault(); setError(""); setPending(true);
    try { const result = await previewIndividualPublishAction(input); if (result.success) setPreview(result.data); else setError(result.error); }
    catch { setError("Unable to preview changes. Please try again."); } finally { setPending(false); }
  }
  async function confirm() {
    if (!preview) return; setPending(true); setError("");
    try { const result = await confirmIndividualPublishAction(input, preview.token); if (result.success) onPublished(result.data.updatedTraineeCount); else { setError(result.error); setPreview(undefined); } }
    catch { setError("Unable to publish changes. Refresh the preview and try again."); setPreview(undefined); } finally { setPending(false); }
  }
  return <div className="portal-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div role="dialog" aria-modal="true" aria-label="Choose who receives path changes" className="portal-modal-panel max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-xl border border-beat-border bg-white p-5 text-beat-maroon">
      <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">Who should receive these changes?</h2><button type="button" className="beat-control" disabled={pending} onClick={onClose}>Cancel</button></div>
      {context && <p className="my-3 text-sm">Editing {context.traineeName}. {context.sharedAvailable ? `“${context.variantTitle}” has ${context.enrolledCount} enrolled ${context.enrolledCount === 1 ? "trainee" : "trainees"}.` : "This path has no available shared role variant."}</p>}
      {error && <p role="alert" className="my-3 rounded border border-beat-border p-3 text-sm">{error}</p>}
      {!context && !error && <p role="status" className="my-4 text-sm">Loading path and enrolled trainees…</p>}
      {context && !preview && <form onSubmit={review} className="space-y-4">
        <fieldset disabled={pending} className="space-y-3">
          <legend className="sr-only">Publish scope</legend>
          {([['individual', 'Only this trainee', 'Keep the shared variant and all other trainees unchanged.'], ['new_variant', 'Create a new reusable variant', 'Publish a separate role variant and link this trainee to it.'], ['shared_variant', 'Update the shared variant', 'Publish the shared definition and update only the trainees you select.']] as const).map(([value, label, description]) => <label key={value} className="flex min-h-11 gap-3 rounded-lg border border-beat-border p-3 text-sm"><input type="radio" name="publishScope" value={value} checked={scope === value} disabled={pending || (value === 'shared_variant' && !context.sharedAvailable)} onChange={() => setScope(value)} /><span><strong>{label}</strong><span className="mt-1 block text-xs text-beat-muted">{description}</span></span></label>)}
          {scope === "new_variant" && <div className="space-y-3">
            <label className="block text-sm">Variant Title<input aria-label="Variant Title" required minLength={3} maxLength={100} value={title} onChange={e => setTitle(e.target.value)} className="mt-1 min-h-11 w-full rounded border border-beat-border p-3" /></label>
            <label className="block text-sm">Department<select aria-label="Variant Department" required value={department} onChange={e => { setDepartment(e.target.value); setPosition(""); }} className="mt-1 min-h-11 w-full rounded border border-beat-border p-3"><option value="">Select department</option>{TBG_DEPARTMENTS.map(value => <option key={value}>{value}</option>)}</select></label>
            <label className="block text-sm">Position<select aria-label="Variant Position" required disabled={!positionsForDepartment(department).length} value={position} onChange={e => setPosition(e.target.value)} className="mt-1 min-h-11 w-full rounded border border-beat-border p-3"><option value="">Select position</option>{positionsForDepartment(department).map(value => <option key={value}>{value}</option>)}</select></label>
          </div>}
          {scope === "shared_variant" && <section aria-label="Select affected trainees" className="space-y-2 rounded-lg border border-beat-border p-3"><h3 className="text-sm font-semibold">Select trainees to update ({selected.length})</h3><p className="text-xs text-beat-muted">Only this trainee is selected initially. Individual customizations are retained when shared changes conflict.</p>{context.enrolledTrainees.map(trainee => <label key={trainee.id} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={selected.includes(trainee.id)} disabled={pending || trainee.id === context.traineeId} onChange={e => setSelected(previous => e.target.checked ? [...previous, trainee.id] : previous.filter(id => id !== trainee.id))} />{trainee.name}{trainee.id === context.traineeId ? " (this trainee — always included)" : ""}</label>)}</section>}
          <label className="block text-sm">Change notes<textarea aria-label="Change notes" maxLength={500} value={changelog} onChange={e => setChangelog(e.target.value)} className="mt-1 w-full rounded border border-beat-border p-3" /></label>
          <button type="submit" disabled={pending} className="beat-primary">{pending ? "Preparing preview…" : "Review impact"}</button>
        </fieldset>
      </form>}
      {preview && <section aria-label="Publish impact preview" className="mt-4 space-y-4">
        <h3 className="font-bold">Review before publishing</h3><p className="text-sm font-semibold">{scope === "individual" ? `Only ${context?.traineeName}` : scope === "new_variant" ? `Publish “${title}” for ${context?.traineeName}` : `Update “${context?.variantTitle}” for the listed trainees`}</p>{scope === "new_variant" && <p className="text-xs text-beat-muted">{department} · {position}</p>}<p className="text-sm">{preview.impacts.length} {preview.impacts.length === 1 ? "trainee" : "trainees"} will receive changes. Progress and awarded stamps are preserved; removed milestones are archived.</p>
        {preview.variantSummary && <div className="rounded border border-beat-border p-3 text-sm"><h4 className="font-semibold">Shared variant update</h4><p>Added: {preview.variantSummary.added.join(', ') || 'None'} · Removed: {preview.variantSummary.removed.join(', ') || 'None'} · Updated: {preview.variantSummary.updated.join(', ') || 'None'}</p><p>Paths: {preview.variantSummary.renamedPaths.join(', ') || 'Unchanged'} · Connections: +{preview.variantSummary.edgesAdded} / −{preview.variantSummary.edgesRemoved}</p>{preview.variantConflicts.map((item, index) => <p key={index} className="mt-1 text-xs">Shared definition retained: {item}</p>)}</div>}
        {preview.impacts.map(impact => <article key={impact.traineeId} className="rounded border border-beat-border p-3 text-sm"><h4 className="font-semibold">{impact.name}</h4><p>Added: {impact.added.join(', ') || 'None'}</p><p>Removed: {impact.removed.join(', ') || 'None'} ({impact.archivedProgress} progress records archived)</p><p>Updated: {impact.updated.join(', ') || 'None'} · Reordered: {impact.reordered.join(', ') || 'None'}</p><p>Paths: {impact.renamedPaths.join(', ') || 'Unchanged'} · Connections: +{impact.edgesAdded} / −{impact.edgesRemoved}</p>{impact.conflicts.length > 0 && <div className="mt-2"><p className="font-semibold">Individual customizations retained</p>{impact.conflicts.map((conflict, index) => <p key={index} className="text-xs">{conflict}</p>)}</div>}</article>)}
        <div className="flex flex-wrap gap-3"><button type="button" disabled={pending} className="beat-control" onClick={() => setPreview(undefined)}>Back to scope</button><button type="button" disabled={pending} className="beat-primary" onClick={confirm}>{pending ? "Publishing…" : "Confirm and publish"}</button></div>
      </section>}
    </div>
  </div>;
}
