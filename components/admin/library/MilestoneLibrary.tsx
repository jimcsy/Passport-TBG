"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Loader2, Plus } from "lucide-react";
import type { MilestoneDefinition } from "@prisma/client";
import { LibraryPlanPicker } from "./LibraryPlanPicker";
import { CreateSharedMilestoneForm } from "./CreateSharedMilestoneForm";
import { BuilderInspector } from "@/components/canvas/BuilderInspector";
import { EditMilestoneModal, type EditableMilestoneTarget } from "@/components/canvas/EditMilestoneModal";
import { DevelopmentPath } from "@/lib/types/models";
import { listMilestoneLibraryAction, updateCustomLibraryMilestoneAction } from "@/lib/actions/plans";
import type { MilestoneLibraryRow } from "@/lib/db/repositories/milestone-library";
import { FOUNDATION_PILLARS } from "@/lib/constants/foundation";

const pillarTitle = (path: string) => FOUNDATION_PILLARS.find(p => p.path === path)?.title || path;

export function MilestoneLibrary() {
  const params = useSearchParams();
  const [desktop, setDesktop] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  useEffect(() => { const media = window.matchMedia("(min-width: 1024px)"); const sync = () => setDesktop(media.matches); sync(); media.addEventListener("change", sync); return () => media.removeEventListener("change", sync); }, []);
  const search = params.get("q") || "";
  const path = params.get("pillar") || "";
  const origin = params.get("origin") || "ALL";
  const selectedId = params.get("milestone");
  const creating = params.get("create") === "1";
  const [createdId, setCreatedId] = useState<string>();
  const [rows, setRows] = useState<MilestoneLibraryRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const request = useRef(0);
  const selectedControl = useRef<HTMLButtonElement | null>(null);
  const searchControl = useRef<HTMLInputElement>(null);
  const previousSelection = useRef(selectedId);
  useEffect(() => {
    if (previousSelection.current && !selectedId) {
      const target = selectedControl.current?.isConnected ? selectedControl.current : searchControl.current;
      target?.focus({ preventScroll: true });
    }
    previousSelection.current = selectedId;
  }, [selectedId]);
  const invalid = search.length > 100 || (!!path && !FOUNDATION_PILLARS.some(p => p.path === path)) || !["ALL", "STANDARD", "CUSTOM"].includes(origin);

  const load = useCallback(async () => {
    const current = ++request.current;
    setLoading(true); setError("");
    try {
      const result = await listMilestoneLibraryAction();
      if (current !== request.current) return;
      if (result.success) setRows(result.data);
      else setError(result.error);
    } catch { if (current === request.current) setError("The milestone library could not be loaded. Please try again."); }
    finally { if (current === request.current) setLoading(false); }
  }, []);
  useEffect(() => { void load(); return () => { request.current++; }; }, [load]);

  // Native view-state history avoids remounting the list or scrolling it to the top.
  function updateView(values: Record<string, string | null>, replace = false) {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(values)) {
      if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
    }
    if (replace) window.history.replaceState(null, "", url.pathname + url.search);
    else window.history.pushState(null, "", url.pathname + url.search);
  }
  function closeSelection() {
    if (savingRef.current) return;
    updateView({ milestone: null, create: null });
    const target = selectedControl.current?.isConnected ? selectedControl.current : searchControl.current;
    target?.focus({ preventScroll: true });
  }
  const onMaterialCountChange = useCallback((count: number) => {
    setRows(previous => previous?.map(row => row.id === selectedId ? { ...row, materialCount: count } : row) || null);
  }, [selectedId]);
  async function saveShared(updated: EditableMilestoneTarget) {
    const result = await updateCustomLibraryMilestoneAction({ id: updated.id }, updated);
    if (!result.success) return { success: false, error: result.error };
    setRows(previous => previous?.map(row => row.id === updated.id ? { ...row, code: updated.code, title: updated.title, description: updated.description, path: updated.path } : row) || null);
    void listMilestoneLibraryAction().then(fresh => { if (fresh.success) setRows(fresh.data); }).catch(() => {});
    return { success: true };
  }
  function created(milestone: MilestoneDefinition) {
    const row: MilestoneLibraryRow = { ...milestone, materialCount: 0, usage: {
      reusablePlanCount: 0, reusablePlans: [], historicalReusablePlanCount: 0, historicalVersionCount: 0,
      privateInstanceCount: 0, unclassifiedPlanCount: 0, activeTraineeCount: 0, materialAffectedActiveTraineeCount: 0,
      metadataAffectedDraftNodeCount: 0, metadataAffectedDraftPlanCount: 0, metadataCodeFallbackDraftNodeCount: 0,
    } };
    setRows(previous => [...(previous || []).filter(item => item.id !== row.id), row]);
    setCreatedId(row.id);
    updateView({ create: null, milestone: row.id }, true);
  }
  const selected = creating ? undefined : rows?.find(row => row.id === selectedId);
  const filtered = (rows || []).filter(row =>
    (!path || row.path === path) && (origin === "ALL" || row.isStandard === (origin === "STANDARD")) &&
    `${row.code} ${row.title}`.toLowerCase().includes(search.trim().toLowerCase()));

  return <section aria-labelledby="milestone-library-heading" className="min-w-0 space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="milestone-library-heading" className="text-lg font-semibold text-beat-maroon">Milestone Library</h2>
      <p className="mt-1 text-sm leading-relaxed text-beat-maroon/75">Find shared milestones, materials counts, and where they are used.</p></div><button type="button" disabled={saving || loading || !!error} onClick={event => { selectedControl.current = event.currentTarget; setCreatedId(undefined); updateView({ create: "1", milestone: null }); }} className="beat-primary min-h-11"><Plus aria-hidden="true" className="h-4 w-4" />Create milestone</button></div>
    <div className="flex flex-col gap-3 md:flex-row">
      <label className="relative min-w-0 flex-1"><span className="sr-only">Search milestone code or title</span><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-beat-maroon/70" />
        <input id="library-search" ref={searchControl} type="search" maxLength={100} value={search} onChange={event => updateView({ q: event.target.value || null }, true)} placeholder="Search code or title" className="min-h-11 w-full rounded-md border border-beat-border bg-white py-2 pl-10 pr-3 text-sm text-beat-maroon placeholder:text-beat-maroon/70" /></label>
      <label className="min-w-0 md:w-56"><span className="sr-only">Filter by pillar</span><select value={path} onChange={event => updateView({ pillar: event.target.value || null })} className="min-h-11 w-full rounded-md border border-beat-border bg-white px-3 text-sm text-beat-maroon"><option value="">All pillars</option>{FOUNDATION_PILLARS.map(p => <option key={p.path} value={p.path}>{p.title}</option>)}</select></label>
      <label className="md:w-40"><span className="sr-only">Filter by origin</span><select value={origin} onChange={event => updateView({ origin: event.target.value === "ALL" ? null : event.target.value })} className="min-h-11 w-full rounded-md border border-beat-border bg-white px-3 text-sm text-beat-maroon"><option value="ALL">All origins</option><option value="STANDARD">BEAT standard</option><option value="CUSTOM">Custom</option></select></label>
    </div>
    {(search || path || origin !== "ALL") && <button type="button" className="beat-control min-h-11" onClick={() => updateView({ q: null, pillar: null, origin: null })}>Clear filters</button>}
    {invalid && <p role="alert" className="text-sm text-beat-maroon">The link contains an unsupported filter. Clear filters to browse the library.</p>}
    {loading ? <p role="status" className="flex items-center gap-2 py-8 text-sm text-beat-maroon"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />Loading milestone library…</p>
      : error ? <div role="alert" className="space-y-3 py-8"><p className="text-sm text-beat-maroon">{error}</p><button type="button" onClick={() => void load()} className="beat-control min-h-11">Retry loading library</button></div>
      : <>
        <p role="status" className="text-xs text-beat-maroon/75">{filtered.length} of {rows?.length || 0} milestones · Plan counts include current reusable master and role variants.</p>
        <div className={`grid min-w-0 items-start gap-6 ${selected || creating ? "lg:grid-cols-[minmax(0,1fr)_20rem]" : ""}`}>
          <div className="min-w-0">
            {filtered.length > 0 ? <div className="border-y border-beat-border bg-white px-4">
              <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1fr)_8rem_5rem_7rem] gap-4 border-b border-beat-border py-3 text-xs font-semibold text-beat-maroon/75 md:grid"><span>Code / title</span><span>Pillar</span><span>Materials</span><span>Reusable plans</span></div>
              <ul aria-label="Shared milestones" className="divide-y divide-beat-border">{filtered.map(row => <li key={row.id} className={`grid min-w-0 grid-cols-2 items-center gap-x-4 gap-y-2 py-3 md:grid-cols-[minmax(0,1fr)_8rem_5rem_7rem] ${row.id === selectedId ? "bg-beat-gold/10" : ""}`}>
                <div className="col-span-2 min-w-0 md:col-span-1"><button disabled={saving} ref={control => { if (control && row.id === selectedId) selectedControl.current = control; }} type="button" aria-pressed={row.id === selectedId} onClick={event => { selectedControl.current = event.currentTarget; updateView({ milestone: row.id, create: null }); }} className="block min-h-11 w-full break-words rounded-sm px-2 text-left text-sm font-semibold text-beat-maroon underline-offset-4 hover:underline [overflow-wrap:anywhere]">
                  <span className="block text-xs font-normal text-beat-maroon/75">{row.code}</span>{row.title}
                </button><span className="px-2 text-xs text-beat-maroon/75">{row.isStandard ? "BEAT standard" : "Custom"}{row.id === selectedId ? " · Selected" : ""}</span></div>
                <p className="col-span-2 break-words px-2 text-xs text-beat-maroon/80 md:col-span-1 md:px-0">{pillarTitle(row.path)}</p>
                <p className="px-2 text-xs text-beat-maroon md:px-0"><strong className="tabular-nums">{row.materialCount}</strong><span className="ml-1 md:sr-only">materials</span></p>
                <p className="px-2 text-xs text-beat-maroon md:px-0"><strong className="tabular-nums">{row.usage.reusablePlanCount}</strong><span className="ml-1 md:sr-only">reusable plans</span></p>
              </li>)}</ul>
            </div> : <div className="space-y-2 border-y border-beat-border py-10 text-sm text-beat-maroon"><h3 className="font-semibold">{rows?.length ? "No matching milestones" : "No milestones in the library"}</h3><p className="text-beat-maroon/75">{rows?.length ? "Try another code, title, pillar, or origin." : "Shared milestones will appear here once they are added to the library."}</p></div>}
          </div>
          <BuilderInspector open={creating || !!selected} desktop={desktop} label="Shared library milestone inspector" id="library-inspector" fallbackFocusId="library-search" onClose={closeSelection}
            className="fixed inset-0 z-50 m-0 h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col overflow-hidden border-0 bg-white p-0 pb-[env(safe-area-inset-bottom)] text-beat-maroon outline-none backdrop:bg-black/50 lg:sticky lg:inset-auto lg:top-4 lg:z-auto lg:h-auto lg:max-h-[calc(100dvh-2rem)] lg:w-full lg:rounded-xl lg:border lg:border-beat-border [&[open]]:flex [&:not([open])]:hidden">
            <CreateSharedMilestoneForm isOpen={creating} initialPath={FOUNDATION_PILLARS.some(p => p.path === path) ? path as DevelopmentPath : DevelopmentPath.ONBOARDING} onClose={closeSelection} onCreated={created} onPendingChange={pending => { savingRef.current = pending; setSaving(pending); }} />
            <EditMilestoneModal actions={selected ? <LibraryPlanPicker key={selected.id} milestoneId={selected.id} /> : undefined} notice={selected && selected.id === createdId ? "Saved to the shared library. Attach materials below or keep this milestone without materials. It has not been added to a plan draft." : undefined} focusMaterials={!!selected && selected.id === createdId} isOpen={!!selected} onClose={closeSelection} presentation="inspector" milestone={selected ? { ...selected, path: selected.path as DevelopmentPath, libraryEdit: true } : null} existingCodes={new Set(rows?.map(row => row.code))} onSave={saveShared} usage={selected?.usage} onPendingChange={pending => { savingRef.current = pending; setSaving(pending); }} onMaterialCountChange={onMaterialCountChange} />
          </BuilderInspector>
        </div>
        {!creating && selectedId && !selected && <div role="status" className="space-y-2 text-sm text-beat-maroon"><p>This milestone is no longer available in the shared library.</p><button type="button" className="beat-control min-h-11" onClick={closeSelection}>Clear selection</button></div>}
      </>}
  </section>;
}
