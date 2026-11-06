"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, MoreHorizontal, Plus, Search, Trash2, Users } from "lucide-react";
import { deleteVariant } from "@/lib/actions/learning-paths";
import { VariantEditor, type EditableVariant } from "./VariantEditor";

type CatalogVariant = EditableVariant & {
  status: string;
  versionNumber: number;
  enrolledTraineeCount: number;
};

function VariantRow({ variant, deleting, onDelete, onSaved }: {
  variant: CatalogVariant;
  deleting: boolean;
  onDelete: () => void;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const editButton = useRef<HTMLButtonElement>(null);
  const actions = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (actions.current && !actions.current.contains(event.target as Node)) actions.current.open = false;
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);

  return <li className="border-b border-beat-border last:border-b-0">
    <article aria-label={variant.title} className="py-4">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-3 lg:grid-cols-[minmax(0,1fr)_7rem_7rem_16rem]">
        <div className="col-span-2 min-w-0 lg:col-span-1">
          <h3 className="break-words text-sm font-semibold text-beat-maroon">
            <Link href={`/trainer/plans/${variant.planId}/builder`} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline md:min-h-0">{variant.title}</Link>
          </h3>
          <p className="mt-1 break-words text-xs leading-relaxed text-beat-maroon/75">{variant.targetDepartment || "Department not tagged"} · {variant.targetPosition || "Position not tagged"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:block">
          <span className={`font-semibold ${variant.status === "PUBLISHED" ? "text-beat-maroon" : "text-beat-maroon/75"}`}>{variant.status === "PUBLISHED" ? "Published" : variant.status === "DRAFT" ? "Draft" : variant.status.toLowerCase().replaceAll("_", " ")} · v{variant.versionNumber}</span>
          <p className="text-beat-maroon/75 md:mt-1">{variant.nodes.length} milestones</p>
        </div>
        <p className="flex items-center justify-self-end gap-2 text-xs text-beat-maroon/80 lg:justify-self-start"><Users aria-hidden="true" className="h-4 w-4 shrink-0 text-beat-gold" /><span><strong className="tabular-nums text-beat-maroon">{variant.enrolledTraineeCount}</strong> enrolled <span className="lg:sr-only">{variant.enrolledTraineeCount === 1 ? "trainee" : "trainees"}</span></span></p>
        <div className="col-span-2 flex flex-wrap items-center gap-2 lg:col-span-1 lg:justify-end">
          <Link className="beat-control" href={`/trainer/plans/${variant.planId}/builder`}>Edit plan<ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" /></Link>
          <button ref={editButton} type="button" aria-expanded={editing} aria-controls={`variant-details-${variant.id}`} onClick={() => setEditing(true)} className="min-h-11 rounded-md px-3 text-xs font-semibold text-beat-maroon underline-offset-4 hover:bg-beat-canvas hover:underline">Edit details</button>
          <details ref={actions} className="relative ml-auto md:ml-0" onKeyDown={event => {
            if (event.key === "Escape") {
              event.preventDefault();
              if (actions.current) { actions.current.open = false; actions.current.querySelector("summary")?.focus(); }
            }
          }}>
            <summary aria-label={`More actions for ${variant.title}`} className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-md text-beat-maroon hover:bg-beat-canvas [&::-webkit-details-marker]:hidden"><MoreHorizontal aria-hidden="true" className="h-5 w-5" /></summary>
            <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-beat-border bg-white p-1">
              <button type="button" disabled={deleting} className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left text-sm text-beat-maroon hover:bg-beat-canvas disabled:opacity-50" onClick={() => { if (actions.current) actions.current.open = false; onDelete(); }}><Trash2 aria-hidden="true" className="h-4 w-4" />{deleting ? "Deleting…" : "Delete variant"}</button>
            </div>
          </details>
        </div>
      </div>
      {editing && <div id={`variant-details-${variant.id}`} className="mt-4 bg-beat-canvas p-4 md:p-5">
        <VariantEditor variant={variant} inline onClose={() => { setEditing(false); editButton.current?.focus(); }} onSaved={onSaved} />
      </div>}
    </article>
  </li>;
}

export function TrainingPlanCatalog({ master, variants, initiallyOpen }: {
  master: { title: string; planId: string; nodeCount: number };
  variants: CatalogVariant[];
  initiallyOpen?: boolean;
}) {
  const router = useRouter();
  const createRequested = useSearchParams().get("create") === "1";
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState<string>();
  const [creating, setCreating] = useState(!!initiallyOpen);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const createButton = useRef<HTMLButtonElement>(null);
  // The mobile shortcut can change only the query string on this same route.
  // React preserves this component, so the initial state alone is insufficient.
  useEffect(() => { if (createRequested) setCreating(true); }, [createRequested]);
  const search = query.trim().toLowerCase();
  const filtered = variants.filter(variant => (!status || variant.status === status) && [variant.title, variant.targetDepartment, variant.targetPosition].some(value => value?.toLowerCase().includes(search)));

  async function remove(variant: EditableVariant) {
    if (!window.confirm(`Delete “${variant.title}” from the catalog? Existing trainee instances, progress and stamps will be preserved.`)) return;
    setDeleting(variant.id); setError(""); setNotice("");
    try {
      const result = await deleteVariant(variant.id);
      if (!result.success) setError(result.error || "Unable to delete variant.");
      else { setNotice(`“${variant.title}” deleted from the catalog.`); router.refresh(); }
    } catch { setError("Unable to delete variant. Please try again."); }
    finally { setDeleting(undefined); }
  }

  return <div className="space-y-7">
    <section aria-label="Master training plan" className="flex flex-wrap items-center justify-between gap-4 border-b border-beat-border pb-6">
      <div className="min-w-0 max-w-3xl">
        <h2 className="break-words text-base font-semibold text-beat-maroon">{master.title}</h2>
        <p className="mt-2 text-sm text-beat-maroon/75">Master template · 5 pillars · {master.nodeCount} milestones</p>
        <p className="mt-1 text-xs leading-relaxed text-beat-maroon/75">Every new trainee starts with an individual copy of this foundation.</p>
      </div>
      <Link className="beat-control shrink-0" href={`/trainer/plans/${master.planId}/builder`}>Edit master<ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" /></Link>
    </section>

    <section aria-labelledby="role-variants-title" className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="role-variants-title" className="text-base font-semibold text-beat-maroon">Role variants <span className="ml-1 text-sm font-normal tabular-nums text-beat-maroon/75">({variants.length})</span></h2>
        <button ref={createButton} type="button" className="beat-primary" aria-expanded={creating} aria-controls="create-role-variant" onClick={() => setCreating(true)}><Plus aria-hidden="true" className="h-4 w-4" />Create role variant</button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-beat-maroon/75">Individual paths are managed in <Link href="/trainer/trainees" className="inline-flex min-h-11 items-center font-semibold text-beat-maroon underline decoration-beat-gold underline-offset-4">trainee profiles</Link>, outside this reusable catalog.</p>
      {creating && <div id="create-role-variant" className="mt-4 border-y border-beat-border bg-white p-4 md:p-5"><VariantEditor inline initiallyOpen={createRequested || initiallyOpen} onClose={() => { setCreating(false); createButton.current?.focus(); }} onSaved={() => setNotice("Role variant created. Open Edit plan to customize its milestones.")} /></div>}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1"><span className="sr-only">Search role variants</span><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-beat-maroon/70" /><input type="search" value={query} onChange={event => { setQuery(event.target.value); setNotice(""); }} placeholder="Search by title, department or position" className="min-h-11 w-full rounded-md border border-beat-border bg-white py-2 pl-10 pr-3 text-sm text-beat-maroon placeholder:text-beat-maroon/70" /></label>
        <label><span className="sr-only">Filter variants by status</span><select value={status} onChange={event => { setStatus(event.target.value); setNotice(""); }} className="min-h-11 w-full rounded-md border border-beat-border bg-white px-3 py-2 text-sm text-beat-maroon sm:w-40"><option value="">All statuses</option>{Array.from(new Set(variants.map(variant => variant.status))).map(value => <option key={value} value={value}>{value === "PUBLISHED" ? "Published" : value === "DRAFT" ? "Draft" : value.toLowerCase().replaceAll("_", " ")}</option>)}</select></label>
      </div>
      <p role="status" className="mt-3 text-xs text-beat-maroon/75">{notice || (query || status ? `${filtered.length} of ${variants.length} variants` : "Reusable tracks for different roles. Each trainee keeps their own assigned path.")}</p>
      {error && <p role="alert" className="mt-3 text-sm text-beat-maroon">{error}</p>}

      <div className="mt-4 border-y border-beat-border bg-white px-4 md:px-5">
        <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1fr)_7rem_7rem_16rem] items-center gap-x-5 border-b border-beat-border py-3 text-xs font-semibold text-beat-maroon/75 lg:grid"><span>Variant / department &amp; position</span><span>Version</span><span>Trainees</span><span className="text-right">Actions</span></div>
        <ul aria-label="Role variants" className="min-w-0">{filtered.map(variant => <VariantRow key={variant.id} variant={variant} deleting={!!deleting} onDelete={() => remove(variant)} onSaved={() => setNotice("Variant saved. Milestone changes remain a draft until published in the Path Builder.")} />)}</ul>
        {filtered.length === 0 && <div className="py-10 text-center"><p className="text-sm font-semibold text-beat-maroon">{variants.length ? "No matching variants" : "Create your first role variant"}</p><p className="mt-2 text-sm text-beat-maroon/75">{variants.length ? "Try another title, department or position." : "Start with the five-pillar foundation, then customize the milestones for a role."}</p>{variants.length > 0 && <button type="button" className="beat-control mt-4" onClick={() => { setQuery(""); setStatus(""); }}>Clear filters</button>}</div>}
      </div>
    </section>
  </div>;
}
