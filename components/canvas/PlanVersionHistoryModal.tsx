"use client";

import { X, History, Calendar, User, Users, CheckCircle2, Clock } from "lucide-react";

export interface PlanVersionSummary {
  id: string;
  versionNumber: number;
  status: string;
  changelog: string | null;
  publishedAt: Date | string | null;
  publishedBy?: {
    fullName: string;
  } | null;
  _count?: {
    assignments: number;
  };
}

interface PlanVersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  planTitle: string;
  currentVersionNumber: number;
  versions: PlanVersionSummary[];
}

export function PlanVersionHistoryModal({
  isOpen,
  onClose,
  planTitle,
  currentVersionNumber,
  versions,
}: PlanVersionHistoryModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg border border-beat-gold/30 animate-in zoom-in-95 text-beat-maroon max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-beat-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-beat-maroon text-beat-gold shadow-sm">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-beat-maroon">Version History</h3>
              <p className="text-xs text-beat-muted truncate max-w-xs">{planTitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-beat-maroon/60 hover:bg-beat-canvas hover:text-beat-maroon transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Versions Timeline List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {versions.length === 0 ? (
            <div className="py-8 text-center text-xs text-beat-muted">
              No version history records found.
            </div>
          ) : (
            versions.map((ver) => {
              const isCurrent = ver.versionNumber === currentVersionNumber;
              const isPublished = ver.status === "PUBLISHED";
              const isDraft = ver.status === "DRAFT";

              return (
                <div
                  key={ver.id}
                  className={`relative rounded-lg border p-4 transition-all ${
                    isCurrent
                      ? "border-beat-gold bg-beat-gold/5 shadow-xs"
                      : "border-beat-border bg-beat-canvas/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-beat-maroon text-beat-gold">
                        v{ver.versionNumber}
                      </span>

                      {isCurrent && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-beat-gold text-beat-maroon">
                          Viewing Current
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        isPublished
                          ? "bg-beat-gold/10 text-beat-maroon border-beat-gold/30"
                          : isDraft
                          ? "bg-beat-gold/10 text-beat-maroon border-beat-gold/30"
                          : "bg-slate-100 text-slate-700 border-slate-300"
                      }`}
                    >
                      {ver.status}
                    </span>
                  </div>

                  <p className="text-xs text-beat-maroon font-medium leading-relaxed">
                    {ver.changelog || `Version ${ver.versionNumber} release snapshot.`}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-beat-border flex flex-wrap items-center justify-between gap-2 text-[10px] text-beat-muted">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3 w-3 text-beat-maroon/60" />
                      <span>{ver.publishedBy?.fullName || "Trainer Admin"}</span>
                    </div>

                    {ver._count && (
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3 w-3 text-beat-maroon/60" />
                        <span>{ver._count.assignments} trainees</span>
                      </div>
                    )}

                    {ver.publishedAt && (
                      <div className="flex items-center gap-1.5 font-mono">
                        <Clock className="h-3 w-3 text-beat-maroon/60" />
                        <span>{new Date(ver.publishedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-beat-border flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-beat-border px-4 py-2 text-xs font-bold text-beat-maroon hover:bg-beat-canvas transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
