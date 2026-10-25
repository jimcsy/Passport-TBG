"use client";

import { useEffect, useRef } from "react";
import { X, Plus } from "lucide-react";

export interface PlanVersionSummary {
  id: string;
  versionNumber: number;
  pathTitles?: import("@/lib/plans/paths").PathTitles;
  status: string;
  changelog: string | null;
  publishedAt: Date | string | null;
  publishedBy?: {
    fullName: string;
  } | null;
  _count?: {
    assignments: number;
  };
  nodes?: Array<{
    id: string;
    code: string;
    title: string;
    description: string;
    path: string;
    orderIndex: number;
    posX: number;
    posY: number;
    materialCount?: number;
    stampDesign?: string;
    isCustom: boolean;
    libraryMilestoneId: string | null;
  }>;
  edges?: Array<{
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    edgeType: string;
  }>;
}

interface PlanVersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  planTitle: string;
  currentVersionNumber: number;
  versions: PlanVersionSummary[];
  onSelectVersion?: (versionNumber: number) => void;
  onCreateDraft?: () => void;
  nextDraftVersionNumber?: number;
}

export function PlanVersionHistoryModal({
  isOpen,
  onClose,
  planTitle,
  currentVersionNumber,
  versions,
  onSelectVersion,
  onCreateDraft,
  nextDraftVersionNumber,
}: PlanVersionHistoryModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (isOpen && !element.open) element.showModal();
    if (!isOpen && element.open) element.close();
    return () => element.close();
  }, [isOpen]);

  return (
    <dialog ref={dialog} aria-labelledby="plan-version-history-title"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
      className="portal-native-dialog w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-xl border border-beat-border bg-white p-0 text-beat-maroon shadow-lg backdrop:bg-beat-maroon/40 backdrop:backdrop-blur-sm">
      <div className="flex max-h-[85dvh] flex-col">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-beat-border px-6 py-5">
          <div className="min-w-0"><h2 id="plan-version-history-title" className="text-base font-semibold">Version history</h2><p className="mt-1 truncate text-xs text-beat-maroon/60">{planTitle}</p></div>
          <button type="button" onClick={onClose} aria-label="Close version history" className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-beat-maroon/60 hover:bg-beat-canvas"><X aria-hidden="true" className="h-4 w-4" /></button>
        </header>
        <p className="shrink-0 border-b border-beat-border bg-beat-canvas/50 px-6 py-3 text-xs leading-relaxed text-beat-maroon/60">Draft changes stay separate from published training. Choose a version to inspect its milestones.</p>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {versions.length === 0 ? <p className="px-6 py-10 text-center text-sm text-beat-maroon/60">No versions yet.</p> : (
            <ol className="divide-y divide-beat-border">
              {versions.map(ver => {
                const isCurrent = ver.versionNumber === currentVersionNumber;
                const isPublished = ver.status === "PUBLISHED";
                const isDraft = ver.status === "DRAFT";
                const status = isPublished ? "Published" : isDraft ? "Draft" : ver.status.charAt(0) + ver.status.slice(1).toLowerCase();
                return <li key={ver.id} className={`border-l-2 px-6 py-4 ${isCurrent ? "border-l-beat-gold bg-beat-canvas/60" : "border-l-transparent"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2"><span className="text-sm font-semibold">Version {ver.versionNumber}</span><span className="rounded border border-beat-border bg-white px-2 py-0.5 text-[11px] text-beat-maroon/70">{status}</span></div>
                    {isCurrent && <span className="text-xs text-beat-maroon/60">Viewing</span>}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-beat-maroon/70">{ver.changelog || "No change notes."}</p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-beat-maroon/60">
                    <span>{ver.publishedBy?.fullName || "Author not recorded"}</span>
                    <span>{isDraft ? "Not assigned to trainees" : `${ver._count?.assignments ?? 0} ${isPublished ? "active" : "historical"} trainees`}</span>
                    {ver.publishedAt && <time dateTime={new Date(ver.publishedAt).toISOString()}>{new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" }).format(new Date(ver.publishedAt))}</time>}
                  </div>
                  {onSelectVersion && !isCurrent && <button type="button" onClick={() => { onSelectVersion(ver.versionNumber); onClose(); }} className="beat-control mt-3">Open version {ver.versionNumber}</button>}
                </li>;
              })}
            </ol>
          )}
        </div>
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-beat-border px-6 py-4">
          {onCreateDraft ? <button type="button" onClick={() => { onCreateDraft(); onClose(); }} className="beat-primary"><Plus aria-hidden="true" className="h-3.5 w-3.5" />New draft{nextDraftVersionNumber ? ` v${nextDraftVersionNumber}` : ""}</button> : <span />}
          <button type="button" onClick={onClose} className="beat-control">Close</button>
        </footer>
      </div>
    </dialog>
  );
}
