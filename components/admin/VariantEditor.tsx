"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createVariant, promoteInstanceToVariant, saveVariant, updateVariantMetadata } from "@/lib/actions/learning-paths";
import { TBG_DEPARTMENTS, positionsForDepartment } from "@/lib/constants/tbg-org";
import { FOUNDATION_PILLARS } from "@/lib/constants/foundation";
import type { PlanNodeInput, PlanEdgeInput } from "@/lib/validations/plans";
import type { PathTitles } from "@/lib/plans/paths";

export interface EditableVariant {
  id: string; planId: string; title: string; targetDepartment: string | null; targetPosition: string | null;
  nodes: PlanNodeInput[]; edges: PlanEdgeInput[]; pathTitles: PathTitles;
}
export function VariantEditor({ variant, instanceId, defaultDepartment = "", defaultPosition = "", initiallyOpen = false }: {
  variant?: EditableVariant; instanceId?: string; defaultDepartment?: string; defaultPosition?: string; initiallyOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initiallyOpen);
  const [title, setTitle] = useState(variant?.title || "");
  const [department, setDepartment] = useState(variant?.targetDepartment || defaultDepartment);
  const [position, setPosition] = useState(variant?.targetPosition || defaultPosition);
  const [nodes, setNodes] = useState(variant?.nodes || []);
  const [graphDirty, setGraphDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const label = instanceId ? "Promote to Reusable Variant" : variant ? "Edit Variant" : "+ Create Role Variant";
  useEffect(() => {
    if (initiallyOpen) {
      const url = new URL(window.location.href); url.searchParams.delete("create"); window.history.replaceState(null, "", url.pathname + url.search);
    }
  }, [initiallyOpen]);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: KeyboardEvent) => { if (event.key === "Escape" && !pending) setOpen(false); };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [open, pending]);
  function begin() {
    setTitle(variant?.title || ""); setDepartment(variant?.targetDepartment || defaultDepartment); setPosition(variant?.targetPosition || defaultPosition);
    setNodes(variant?.nodes || []); setGraphDirty(false); setError(""); setOpen(true);
  }
  function move(index: number, delta: number) {
    const group = nodes.map((node, i) => ({ node, i })).filter(item => item.node.path === nodes[index].path).sort((a, b) => a.node.orderIndex - b.node.orderIndex);
    const from = group.findIndex(item => item.i === index), to = from + delta;
    if (to < 0 || to >= group.length) return;
    [group[from], group[to]] = [group[to], group[from]];
    const order = new Map(group.map((item, i) => [item.i, i + 1]));
    setNodes(nodes.map((node, i) => order.has(i) ? { ...node, orderIndex: order.get(i)! } : node)); setGraphDirty(true);
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    try {
      const metadata = { title, targetDepartment: department, targetPosition: position };
      const res = instanceId ? await promoteInstanceToVariant({ instanceId, variantTitle: title, department, position }) : variant
        ? graphDirty ? await saveVariant({ ...metadata, variantId: variant.id, graph: {
          nodes, edges: variant.edges.filter(edge => nodes.some(node => node.id === edge.sourceNodeId) && nodes.some(node => node.id === edge.targetNodeId)), pathTitles: variant.pathTitles,
        } }) : await updateVariantMetadata({ ...metadata, variantId: variant.id })
        : await createVariant(metadata);
      if (!res.success) setError(res.error || "Unable to save variant.");
      else { setOpen(false); router.refresh(); }
    } catch { setError("Unable to save variant. Please try again."); }
    finally { setPending(false); }
  }
  return <>
    <button type="button" className="beat-control" onClick={begin}>{label}</button>
    {open && <div className="portal-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={label}>
      <form onSubmit={submit} className="portal-modal-panel max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-xl border border-beat-border bg-white p-5 text-beat-maroon">
        <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">{label}</h2><button type="button" disabled={pending} className="beat-control" onClick={() => setOpen(false)}>Close</button></div>
        <p className="my-3 text-sm text-beat-muted">{instanceId ? "Copy the trainee’s active published path into a reusable draft. Their progress and stamps stay on their instance." : variant ? "Metadata changes appear in the catalog immediately. Node changes are saved as a draft; publish them in the Path Builder." : "Start a new role track with the five-pillar foundation, then customize its nodes."}</p>
        {error && <p role="alert" className="my-3 text-sm text-beat-maroon">{error}</p>}
        <fieldset disabled={pending} className="space-y-4">
          <label className="block text-sm font-semibold">Variant Title<input aria-label="Variant Title" required minLength={3} maxLength={100} value={title} onChange={e => setTitle(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-beat-border p-3" /></label>
          <label className="block text-sm font-semibold">Target Department<select aria-label="Target Department" required value={department} onChange={e => { setDepartment(e.target.value); setPosition(""); }} className="mt-1 min-h-11 w-full rounded-lg border border-beat-border p-3"><option value="">Select department</option>{TBG_DEPARTMENTS.map(value => <option key={value}>{value}</option>)}</select></label>
          <label className="block text-sm font-semibold">Target Position<select aria-label="Target Position" required disabled={!positionsForDepartment(department).length} value={position} onChange={e => setPosition(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-beat-border p-3 disabled:opacity-50"><option value="">Select position</option>{positionsForDepartment(department).map(value => <option key={value}>{value}</option>)}</select></label>
          {variant && <details className="rounded-lg border border-beat-border p-3"><summary className="min-h-11 cursor-pointer font-semibold">Edit milestone nodes ({nodes.length})</summary>
            {FOUNDATION_PILLARS.map(pillar => <section key={pillar.path} className="mt-4 space-y-2" aria-label={pillar.title}>
              <h3 className="font-semibold">{variant.pathTitles[pillar.path] || pillar.title}</h3>
              {nodes.map((node, index) => ({ node, index })).filter(({ node }) => node.path === pillar.path).sort((a, b) => a.node.orderIndex - b.node.orderIndex).map(({ node, index }, order) => <div key={node.id || index} className="rounded-lg border border-beat-border p-2">
                <p className="text-xs">{order + 1}. {node.code}</p>
                <label className="block text-xs">Milestone title<input required minLength={2} maxLength={150} value={node.title} onChange={e => { setNodes(nodes.map((item, i) => i === index ? { ...item, title: e.target.value } : item)); setGraphDirty(true); }} className="my-1 min-h-11 w-full rounded border border-beat-border p-2" /></label>
                <div className="flex flex-wrap gap-2"><button type="button" className="beat-control" aria-label={`Move ${node.code} up`} onClick={() => move(index, -1)}>Move up</button><button type="button" className="beat-control" aria-label={`Move ${node.code} down`} onClick={() => move(index, 1)}>Move down</button><button type="button" className="beat-control" aria-label={`Remove ${node.code}`} onClick={() => { setNodes(nodes.filter((_, i) => i !== index)); setGraphDirty(true); }}>Remove</button></div>
              </div>)}
              <button type="button" className="beat-control" onClick={() => { setNodes([...nodes, { code: `ROLE-${Date.now().toString(36).toUpperCase()}`, title: "New role milestone", description: "Position-specific training milestone.", path: pillar.path, orderIndex: Math.max(0, ...nodes.filter(n => n.path === pillar.path).map(n => n.orderIndex)) + 1, posX: 0, posY: 0, isCustom: true }]); setGraphDirty(true); }}>Add milestone to {pillar.title}</button>
            </section>)}
          </details>}
          <div className="flex flex-wrap justify-end gap-3 border-t border-beat-border pt-4">{variant && <Link className="beat-control" href={`/trainer/plans/${variant.planId}/builder`}>Open full Path Builder</Link>}<button type="submit" disabled={pending} className="beat-primary">{pending ? "Saving…" : instanceId ? "Create Reusable Variant" : variant ? "Save Variant" : "Create Variant"}</button></div>
        </fieldset>
      </form>
    </div>}
  </>;
}
