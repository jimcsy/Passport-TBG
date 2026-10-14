"use client";

import { useState } from "react";
import {
  X,
  Send,
  AlertTriangle,
  CheckCircle2,
  Users,
  ShieldCheck,
  MessagesSquare,
  UtensilsCrossed,
  HeartHandshake,
  Award,
} from "lucide-react";
import { DevelopmentPath, DEVELOPMENT_PATHS } from "@/lib/types/models";

const PATH_ICONS: Record<DevelopmentPath, React.ComponentType<{ className?: string }>> = {
  [DevelopmentPath.ONBOARDING]: ShieldCheck,
  [DevelopmentPath.COMMUNICATION]: MessagesSquare,
  [DevelopmentPath.TECHNICAL]: UtensilsCrossed,
  [DevelopmentPath.CULTURE]: HeartHandshake,
  [DevelopmentPath.LEADERSHIP]: Award,
};

interface PublishPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  planTitle: string;
  roleIdentifier: string;
  restaurantBrand: string | null;
  versionNumber: number;
  nodeCounts: Record<string, number>;
  totalMilestones: number;
  activeTraineeCount: number;
  isPublishing: boolean;
  onConfirmPublish: (data: { syncTrainees: boolean; changelog: string }) => Promise<void>;
}

export function PublishPlanModal({
  isOpen,
  onClose,
  planTitle,
  roleIdentifier,
  restaurantBrand,
  versionNumber,
  nodeCounts,
  totalMilestones,
  activeTraineeCount,
  isPublishing,
  onConfirmPublish,
}: PublishPlanModalProps) {
  const [syncTrainees, setSyncTrainees] = useState(activeTraineeCount > 0);
  const [changelog, setChangelog] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirmPublish({
      syncTrainees,
      changelog: changelog.trim() || `Published version ${versionNumber}`,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-beat-gold/30 animate-in zoom-in-95 text-beat-maroon max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-beat-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-beat-maroon text-beat-gold shadow-md">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-beat-maroon">
                Publish Training Plan Version {versionNumber}
              </h3>
              <p className="text-xs text-beat-muted">
                Create an immutable production version of this curriculum.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isPublishing}
            className="rounded-full p-2 text-beat-maroon/60 hover:bg-beat-canvas hover:text-beat-maroon transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Metadata Banner */}
          <div className="p-3.5 rounded-2xl bg-beat-canvas border border-beat-border space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-beat-maroon">{planTitle}</span>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-beat-maroon/10 text-beat-maroon border border-beat-maroon/20">
                {roleIdentifier}
              </span>
            </div>
            <div className="text-[11px] text-beat-muted flex items-center justify-between">
              <span>Brand: {restaurantBrand || "All Bistro Group Brands"}</span>
              <span className="font-bold text-beat-gold">
                Total: {totalMilestones} competencies
              </span>
            </div>
          </div>

          {/* Track Breakdown Pills */}
          <div>
            <label className="block text-[11px] font-bold text-beat-muted uppercase tracking-wider mb-2">
              Competencies per Track
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.values(DevelopmentPath).map((path) => {
                const count = nodeCounts[path] || 0;
                const Icon = PATH_ICONS[path];
                const title = DEVELOPMENT_PATHS[path]?.title || path;

                return (
                  <div
                    key={path}
                    className="flex items-center gap-2 p-2 rounded-xl border border-beat-border bg-white text-xs"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-beat-gold" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-beat-muted truncate">{title}</div>
                      <div className="font-bold text-beat-maroon">
                        {count} {count === 1 ? "node" : "nodes"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Changelog Input */}
          <div>
            <label htmlFor="changelog" className="block text-xs font-bold text-beat-maroon mb-1">
              Version Changelog / Notes
            </label>
            <textarea
              id="changelog"
              rows={2}
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              placeholder="e.g. Added specialty coffee bar workflow; updated food safety standards."
              className="w-full rounded-xl border border-beat-border bg-beat-canvas p-3 text-xs text-beat-maroon placeholder:text-beat-maroon/40 focus:border-beat-gold focus:outline-hidden"
            />
          </div>

          {/* Sync Active Trainees Section */}
          <div className="rounded-2xl border border-beat-border p-4 bg-beat-canvas/30 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-beat-maroon" />
                  <label htmlFor="syncToggle" className="text-xs font-bold text-beat-maroon cursor-pointer">
                    Sync Active Trainees
                  </label>
                </div>
                <p className="text-[11px] text-beat-muted">
                  {activeTraineeCount > 0
                    ? `${activeTraineeCount} trainees currently enrolled in this plan will be upgraded.`
                    : "No trainees currently enrolled. Future assignees will receive this version."}
                </p>
              </div>

              {activeTraineeCount > 0 && (
                <input
                  id="syncToggle"
                  type="checkbox"
                  checked={syncTrainees}
                  onChange={(e) => setSyncTrainees(e.target.checked)}
                  className="h-5 w-5 rounded-md accent-beat-maroon cursor-pointer"
                />
              )}
            </div>

            {syncTrainees && activeTraineeCount > 0 && (
              <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 p-3 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <span className="font-bold">Safe Reconcile Active: </span>
                  Verified and pending milestones will be preserved without data loss. Removed
                  milestones will be archived, and new competencies will be injected into trainees&apos;
                  digital passports.
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-beat-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isPublishing}
              className="rounded-xl border border-beat-border px-4 py-2.5 text-xs font-bold text-beat-muted hover:bg-beat-canvas transition-colors cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPublishing}
              className="flex items-center gap-1.5 rounded-xl bg-beat-maroon px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-beat-maroon-dark transition-all disabled:opacity-50 cursor-pointer"
            >
              {isPublishing ? (
                <span>Publishing & Reconciling...</span>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-beat-gold" />
                  <span>Publish Version {versionNumber}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
