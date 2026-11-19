"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useStrobiMilestones } from "./strobi/StrobiChatHost";
import { DEVELOPMENT_PATHS } from "@/lib/types/models";

const STATUS_LABEL: Record<string, string> = {
  VERIFIED: "Verified", READY_FOR_REVIEW: "In review", IN_PROGRESS: "In progress", LOCKED: "Not started",
};

/** Client-side search across the trainee's already-loaded assigned milestones. */
export function ModuleSearch() {
  const router = useRouter();
  const milestones = useStrobiMilestones();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const term = query.trim().toLowerCase();
  const results = useMemo(() => !term ? [] : milestones
    .filter(item => !item.isArchived && item.status !== "ARCHIVED")
    .filter(item => item.title.toLowerCase().includes(term) || DEVELOPMENT_PATHS[item.pillar]?.title.toLowerCase().includes(term))
    .slice(0, 7), [milestones, term]);

  useEffect(() => { setActive(0); }, [term]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  function go(id: string) {
    setOpen(false); setQuery("");
    router.push(`/trainee/dashboard/modules/${id}`);
  }

  const expanded = open && term.length > 0;
  return <div ref={root} className="relative max-w-md">
    <label className="relative block">
      <span className="sr-only">Search modules</span>
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-beat-maroon/40" />
      <input type="search" role="combobox" aria-expanded={expanded} aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={expanded && results[active] ? `${listId}-${active}` : undefined}
        value={query} placeholder="Search modules or paths"
        onChange={event => { setQuery(event.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={event => {
          if (event.key === "Escape") { setOpen(false); return; }
          if (!results.length) return;
          if (event.key === "ArrowDown") { event.preventDefault(); setActive(value => (value + 1) % results.length); }
          if (event.key === "ArrowUp") { event.preventDefault(); setActive(value => (value - 1 + results.length) % results.length); }
          if (event.key === "Enter") { event.preventDefault(); go(results[active].id); }
        }}
        className="h-9 w-full rounded-lg border border-beat-gold/25 bg-beat-canvas/70 pl-9 pr-3 text-[13px] text-beat-maroon placeholder:text-beat-maroon/40 transition-colors focus:border-beat-gold focus:bg-white focus:outline-none focus:ring-2 focus:ring-beat-gold/20" />
    </label>
    {expanded && <ul id={listId} role="listbox" aria-label="Matching modules" className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-lg border border-beat-gold/25 bg-white py-1 shadow-lg">
      {results.map((item, index) => <li key={item.id} id={`${listId}-${index}`} role="option" aria-selected={index === active}
        onPointerEnter={() => setActive(index)} onPointerDown={event => { event.preventDefault(); go(item.id); }}
        className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-[13px] ${index === active ? "bg-beat-gold/10" : ""}`}>
        <span className="min-w-0"><span className="block truncate font-medium text-beat-maroon">{item.title}</span><span className="block truncate text-[11px] text-beat-maroon/55">{DEVELOPMENT_PATHS[item.pillar]?.title}</span></span>
        <span className="shrink-0 text-[11px] text-beat-maroon/55">{STATUS_LABEL[item.status] ?? ""}</span>
      </li>)}
      {!results.length && <li className="px-3 py-2.5 text-[13px] text-beat-maroon/60">No modules match “{query.trim()}”.</li>}
    </ul>}
  </div>;
}
