"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import type { PathProgressSummary } from "@/lib/db/repositories/trainee";
import { STROBI_MASCOT_MAP } from "@/lib/constants/mascots";
import { developmentPathHref } from "@/lib/paths/navigation";
import { PathBar, StatusIcon, StatusLegend } from "./ProgressPrimitives";
import { moduleHref, ordered, pathNumber, shortDate, STATUS_LABEL } from "./progress";

const STATUS_TEXT = {
  VERIFIED: "text-beat-gold-dark",
  READY_FOR_REVIEW: "text-beat-gold-dark",
  IN_PROGRESS: "text-beat-maroon font-medium",
  LOCKED: "text-beat-maroon/45",
} as const;

export function PathAccordion({ paths, initialOpen }: { paths: PathProgressSummary[]; initialOpen?: string }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(initialOpen ? [initialOpen] : []));
  const toggle = (key: string) => setOpen(previous => {
    const next = new Set(previous);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  return <div className="space-y-3">
    <ol className="divide-y divide-beat-gold/15 overflow-hidden rounded-2xl border border-beat-gold/25 bg-white">
      {paths.map((path, index) => {
        const mascot = STROBI_MASCOT_MAP[path.path];
        const expanded = open.has(path.path);
        const panelId = `path-panel-${path.path}`;
        return <li key={path.path}>
          <h3>
            <button type="button" aria-expanded={expanded} aria-controls={panelId} onClick={() => toggle(path.path)}
              className={`grid w-full grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-3.5 text-left transition-colors hover:bg-beat-canvas/60 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto_auto] sm:px-5 ${expanded ? "bg-[#FCFAF6]" : ""}`}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-beat-canvas sm:h-10 sm:w-10">
                {mascot && <Image src={mascot.imagePath} alt="" width={32} height={32} unoptimized className="h-7 w-7 object-contain mix-blend-multiply sm:h-8 sm:w-8" />}
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-semibold uppercase tracking-[.12em] text-beat-gold-dark">Path {pathNumber(index)}</span>
                <span className="block truncate text-sm font-semibold text-beat-maroon">{path.title}</span>
                <PathBar milestones={path.milestones} className="mt-2 sm:hidden" />
              </span>
              <PathBar milestones={path.milestones} className="hidden sm:flex sm:w-24 md:w-32 xl:w-36" />
              <span className="flex items-center gap-3 pl-1">
                <span className="text-[13px] font-semibold tabular-nums text-beat-maroon"><span className="sr-only">Verified </span>{path.verified}<span className="text-beat-maroon/45">/{path.total}</span></span>
                <ChevronDown aria-hidden="true" className={`h-4 w-4 text-beat-maroon/50 transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`} />
              </span>
            </button>
          </h3>
          <div id={panelId} hidden={!expanded} className="border-t border-beat-gold/15 bg-white">
            {path.milestones.length ? <ul className="divide-y divide-beat-gold/10">
              {ordered(path.milestones).map(milestone => <li key={milestone.id}>
                <Link href={moduleHref(milestone.id)} className="group flex items-center gap-3 px-4 py-2.5 sm:pl-12 md:pl-14 lg:pl-12 xl:pl-14 sm:pr-5">
                  <StatusIcon status={milestone.status} className="h-4 w-4 shrink-0" />
                  <span className="hidden w-16 shrink-0 font-mono text-[11px] text-beat-maroon/50 sm:block">{milestone.code}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-beat-maroon group-hover:underline group-hover:decoration-beat-gold group-hover:underline-offset-2">{milestone.title}</span>
                    <span className="block font-mono text-[10px] text-beat-maroon/45 sm:hidden">{milestone.code}</span>
                  </span>
                  <span className={`shrink-0 text-[11px] ${STATUS_TEXT[milestone.status]}`}>
                    {STATUS_LABEL[milestone.status]}{milestone.status === "VERIFIED" && milestone.verifiedAt ? ` · ${shortDate(milestone.verifiedAt)}` : ""}
                  </span>
                </Link>
              </li>)}
            </ul> : <p className="px-5 py-4 text-[13px] text-beat-maroon/60">Modules will appear here when this path is configured.</p>}
            <div className="flex justify-end border-t border-beat-gold/10 px-4 py-2.5 sm:px-5">
              <Link href={developmentPathHref(path.path)} aria-label={`Open ${mascot?.category ?? path.title}`} className="inline-flex items-center gap-1 text-xs font-semibold text-beat-maroon hover:underline hover:decoration-beat-gold hover:underline-offset-4">
                Open path<ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 text-beat-gold" />
              </Link>
            </div>
          </div>
        </li>;
      })}
    </ol>
    <StatusLegend />
  </div>;
}
