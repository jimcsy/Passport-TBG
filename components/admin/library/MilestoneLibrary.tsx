"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import { listMilestoneLibraryAction } from "@/lib/actions/plans";
import type { MilestoneLibraryRow } from "@/lib/db/repositories/milestone-library";
import { FOUNDATION_PILLARS } from "@/lib/constants/foundation";

const pillarTitle = (path: string) => FOUNDATION_PILLARS.find(p => p.path === path)?.title || path;

export function MilestoneLibrary() {
  const params = useSearchParams();
  const search = params.get("q") || "";
  const path = params.get("pillar") || "";
  const origin = params.get("origin") || "ALL";
  const selectedId = params.get("milestone");
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
    updateView({ milestone: null });
    const target = selectedControl.current?.isConnected ? selectedControl.current : searchControl.current;
    target?.focus({ preventScroll: true });
  }
  const selected = rows?.find(row => row.id === selectedId);
  const filtered = (rows || []).filter(row =>
    (!path || row.path === path) && (origin === "ALL" || row.isStandard === (origin === "STANDARD")) &&
    `${row.code} ${row.title}`.toLowerCase().includes(search.trim().toLowerCase()));

  return <section aria-labelledby="milestone-library-heading" className="min-w-0 space-y-4">
    <div><h2 id="milestone-library-heading" className="text-lg font-semibold text-beat-maroon">Milestone Library</h2>
      <p className="mt-1 text-sm leading-relaxed text-beat-maroon/75">Find shared milestones, materials counts, and where they are used.</p></div>
    <div className="flex flex-col gap-3 md:flex-row">
      <label className="relative min-w-0 flex-1"><span className="sr-only">Search milestone code or title</span><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-beat-maroon/70" />
        <input ref={searchControl} type="search" maxLength={100} value={search} onChange={event => updateView({ q: event.target.value || null }, true)} placeholder="Search code or title" className="min-h-11 w-full rounded-md border border-beat-border bg-white py-2 pl-10 pr-3 text-sm text-beat-maroon placeholder:text-beat-maroon/70" /></label>
      <label className="min-w-0 md:w-56"><span className="sr-only">Filter by pillar</span><select value={path} onChange={event => updateView({ pillar: event.target.value || null })} className="min-h-11 w-full rounded-md border border-beat-border bg-white px-3 text-sm text-beat-maroon"><option value="">All pillars</option>{FOUNDATION_PILLARS.map(p => <option key={p.path} value={p.path}>{p.title}</option>)}</select></label>
      <label className="md:w-40"><span className="sr-only">Filter by origin</span><select value={origin} onChange={event => updateView({ origin: event.target.value === "ALL" ? null : event.target.value })} className="min-h-11 w-full rounded-md border border-beat-border bg-white px-3 text-sm text-beat-maroon"><option value="ALL">All origins</option><option value="STANDARD">BEAT standard</option><option value="CUSTOM">Custom</option></select></label>
    </div>
    {(search || path || origin !== "ALL") && <button type="button" className="beat-control min-h-11" onClick={() => updateView({ q: null, pillar: null, origin: null })}>Clear filters</button>}
    {invalid && <p role="alert" className="text-sm text-beat-maroon">The link contains an unsupported filter. Clear filters to browse the library.</p>}
    {loading ? <p role="status" className="flex items-center gap-2 py-8 text-sm text-beat-maroon"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />Loading milestone library…</p>
      : error ? <div role="alert" className="space-y-3 py-8"><p className="text-sm text-beat-maroon">{error}</p><button type="button" onClick={() => void load()} className="beat-control min-h-11">Retry loading library</button></div>
      : <>
        <p role="status" className="text-xs text-beat-maroon/75">{filtered.length} of {rows?.length || 0} milestones · Plan counts include current reusable master and role variants.</p>
        <div className={`grid min-w-0 items-start gap-6 ${selected ? "lg:grid-cols-[minmax(0,1fr)_20rem]" : ""}`}>
          <div className="min-w-0">
            {filtered.length > 0 ? <div className="border-y border-beat-border bg-white px-4">
              <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1fr)_8rem_5rem_7rem] gap-4 border-b border-beat-border py-3 text-xs font-semibold text-beat-maroon/75 md:grid"><span>Code / title</span><span>Pillar</span><span>Materials</span><span>Reusable plans</span></div>
              <ul aria-label="Shared milestones" className="divide-y divide-beat-border">{filtered.map(row => <li key={row.id} className={`grid min-w-0 grid-cols-2 items-center gap-x-4 gap-y-2 py-3 md:grid-cols-[minmax(0,1fr)_8rem_5rem_7rem] ${row.id === selectedId ? "bg-beat-gold/10" : ""}`}>
                <div className="col-span-2 min-w-0 md:col-span-1"><button ref={control => { if (control && row.id === selectedId) selectedControl.current = control; }} type="button" aria-pressed={row.id === selectedId} onClick={event => { selectedControl.current = event.currentTarget; updateView({ milestone: row.id }); }} className="block min-h-11 w-full break-words rounded-sm px-2 text-left text-sm font-semibold text-beat-maroon underline-offset-4 hover:underline [overflow-wrap:anywhere]">
                  <span className="block text-xs font-normal text-beat-maroon/75">{row.code}</span>{row.title}
                </button><span className="px-2 text-xs text-beat-maroon/75">{row.isStandard ? "BEAT standard" : "Custom"}{row.id === selectedId ? " · Selected" : ""}</span></div>
                <p className="col-span-2 break-words px-2 text-xs text-beat-maroon/80 md:col-span-1 md:px-0">{pillarTitle(row.path)}</p>
                <p className="px-2 text-xs text-beat-maroon md:px-0"><strong className="tabular-nums">{row.materialCount}</strong><span className="ml-1 md:sr-only">materials</span></p>
                <p className="px-2 text-xs text-beat-maroon md:px-0"><strong className="tabular-nums">{row.usage.reusablePlanCount}</strong><span className="ml-1 md:sr-only">reusable plans</span></p>
              </li>)}</ul>
            </div> : <div className="space-y-2 border-y border-beat-border py-10 text-sm text-beat-maroon"><h3 className="font-semibold">{rows?.length ? "No matching milestones" : "No milestones in the library"}</h3><p className="text-beat-maroon/75">{rows?.length ? "Try another code, title, pillar, or origin." : "Shared milestones will appear here once they are added to the library."}</p></div>}
          </div>
          {selected && <LibrarySelection row={selected} onClose={closeSelection} />}
        </div>
        {selectedId && !selected && <div role="status" className="space-y-2 text-sm text-beat-maroon"><p>This milestone is no longer available in the shared library.</p><button type="button" className="beat-control min-h-11" onClick={closeSelection}>Clear selection</button></div>}
      </>}
  </section>;
}

function LibrarySelection({ row, onClose }: { row: MilestoneLibraryRow; onClose: () => void }) {
  const panel = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const close = useRef(onClose); close.current = onClose;
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const sync = () => setMobile(media.matches); sync(); media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    if (!mobile) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus({ preventScroll: true });
    return () => { document.body.style.overflow = previous; };
  }, [mobile]);
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); close.current(); }
      if (event.key === "Tab" && mobile) {
        const elements = panel.current?.querySelectorAll<HTMLElement>('button, a[href]');
        if (!elements?.length) return;
        const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener("keydown", keydown); return () => document.removeEventListener("keydown", keydown);
  }, [mobile]);
  return <aside ref={panel} role={mobile ? "dialog" : undefined} aria-modal={mobile ? true : undefined} aria-labelledby="selected-milestone-title" className="fixed inset-0 z-50 overflow-y-auto bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-beat-maroon lg:sticky lg:inset-auto lg:top-4 lg:z-auto lg:max-h-[calc(100dvh-2rem)] lg:rounded-xl lg:border lg:border-beat-border">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-xs text-beat-maroon/75">{row.code} · {row.isStandard ? "BEAT standard" : "Custom"}</p><h3 id="selected-milestone-title" className="mt-2 break-words text-base font-semibold [overflow-wrap:anywhere]">{row.title}</h3></div><button ref={closeButton} type="button" aria-label="Close milestone details" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-beat-canvas"><X aria-hidden="true" className="h-5 w-5" /></button></div>
    <div className="mt-5 space-y-5 text-sm">
      <section className="space-y-2"><h4 className="font-semibold">Details</h4><p>{pillarTitle(row.path)}</p><p className="whitespace-pre-wrap break-words leading-relaxed [overflow-wrap:anywhere]">{row.description}</p></section>
      <section className="space-y-2 border-t border-beat-border pt-4"><h4 className="font-semibold">Materials</h4><p>{row.materialCount} attached {row.materialCount === 1 ? "material" : "materials"}</p><p className="text-xs leading-relaxed text-beat-maroon/75">Shared materials apply to linked milestones, including published and historical versions.</p></section>
      <section className="space-y-2 border-t border-beat-border pt-4"><h4 className="font-semibold">Used in plans</h4><p>{row.usage.reusablePlanCount} current reusable {row.usage.reusablePlanCount === 1 ? "plan" : "plans"}</p>
        <ul className="space-y-1">{row.usage.reusablePlans.map(plan => <li key={plan.planId}><Link href={`/trainer/plans/${plan.planId}/builder`} className="inline-flex min-h-11 items-center break-words font-medium underline decoration-beat-gold underline-offset-4 [overflow-wrap:anywhere]">{plan.title}</Link><p className="text-xs text-beat-maroon/75">{[plan.draft && "Draft", plan.published && "Published"].filter(Boolean).join(" · ")}</p></li>)}</ul>
        <p className="text-xs leading-relaxed text-beat-maroon/75">{row.usage.historicalReusablePlanCount} reusable plans in history · {row.usage.historicalVersionCount} historical versions · {row.usage.privateInstanceCount} private instances · {row.usage.unclassifiedPlanCount} legacy plans. Counts can overlap.</p>
        <p>{row.usage.materialAffectedActiveTraineeCount} active trainees with shared-material access</p>
      </section>
    </div>
  </aside>;
}
