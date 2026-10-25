"use client";

import { useState } from "react";
import { X, GitBranch, CheckCircle2, AlertTriangle, Users } from "lucide-react";
import { bulkAssignPlanAction } from "@/lib/actions/plans";
import { useRouter } from "next/navigation";

export interface AvailablePlanOption {
  id: string;
  title: string;
  roleIdentifier: string;
  restaurantBrand: string | null;
  isDefault: boolean;
  latestVersionId: string;
  versionNumber: number;
  milestoneCount: number;
}

interface AssignPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  traineeIds: string[];
  traineeNames: string[];
  plans: AvailablePlanOption[];
  onSuccess?: () => void;
}

export function AssignPlanModal({
  isOpen,
  onClose,
  traineeIds,
  traineeNames,
  plans,
  onSuccess,
}: AssignPlanModalProps) {
  const router = useRouter();
  const [selectedPlanVersionId, setSelectedPlanVersionId] = useState(
    plans[0]?.latestVersionId || ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanVersionId) {
      setErrorMessage("Please select a training plan to assign.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await bulkAssignPlanAction(traineeIds, selectedPlanVersionId);
    setIsSubmitting(false);

    if (res.success) {
      onSuccess?.();
      onClose();
      router.refresh();
    } else {
      setErrorMessage(res.error || "Failed to assign plan to selected trainees.");
    }
  };

  const selectedPlan = plans.find((p) => p.latestVersionId === selectedPlanVersionId);

  return (
    <div
      className="portal-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        role="dialog" aria-modal="true" aria-label="Assign training plan" className="portal-modal-panel w-full max-w-lg rounded-xl bg-white p-6 shadow-lg border border-beat-gold/30 animate-in zoom-in-95 text-beat-maroon max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-beat-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-beat-maroon text-beat-gold shadow-sm">
              <GitBranch className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-beat-maroon">
                {traineeIds.length === 1 ? "Assign Training Plan" : "Bulk Assign Plan"}
              </h3>
              <p className="text-xs text-beat-muted">
                {traineeIds.length} {traineeIds.length === 1 ? "trainee" : "trainees"} selected
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full p-2 text-beat-maroon/60 hover:bg-beat-canvas hover:text-beat-maroon transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleAssign} className="mt-5 space-y-4">
          {errorMessage && (
            <div className="rounded-xl border border-beat-maroon/25 bg-beat-maroon/5 p-3 text-xs text-beat-maroon">
              {errorMessage}
            </div>
          )}

          {/* Trainee Names Summary */}
          <div className="p-3.5 rounded-lg bg-beat-canvas border border-beat-border space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-beat-maroon">
              <Users className="h-3.5 w-3.5 text-beat-gold" />
              <span>Target Trainees:</span>
            </div>
            <p className="text-xs text-beat-muted line-clamp-2">
              {traineeNames.slice(0, 5).join(", ")}
              {traineeNames.length > 5 && ` and ${traineeNames.length - 5} others`}
            </p>
          </div>

          {/* Plan Selector */}
          <div>
            <label
              htmlFor="selectPlan"
              className="block text-xs font-bold text-beat-maroon mb-1"
            >
              Select Published Plan <span className="text-beat-maroon">*</span>
            </label>
            <select
              id="selectPlan"
              value={selectedPlanVersionId}
              onChange={(e) => setSelectedPlanVersionId(e.target.value)}
              className="w-full rounded-xl border border-beat-border bg-beat-canvas px-4 py-3 text-xs font-semibold text-beat-maroon outline-none focus:border-beat-gold focus:ring-1 focus:ring-beat-gold cursor-pointer"
            >
              {plans.map((p) => (
                <option key={p.latestVersionId} value={p.latestVersionId}>
                  {p.title} (v{p.versionNumber} · {p.roleIdentifier} · {p.milestoneCount} milestones)
                  {p.isDefault ? " [Default]" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Plan Details */}
          {selectedPlan && (
            <div className="rounded-lg border border-beat-border p-3.5 bg-beat-canvas/40 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-bold text-beat-maroon">
                <span>{selectedPlan.title}</span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-beat-maroon/10 text-beat-maroon">
                  {selectedPlan.roleIdentifier}
                </span>
              </div>
              <div className="text-[11px] text-beat-muted flex items-center justify-between">
                <span>Version {selectedPlan.versionNumber}</span>
                <span className="font-bold text-beat-gold">
                  {selectedPlan.milestoneCount} competencies
                </span>
              </div>
            </div>
          )}

          {/* Safe Reconcile Notice */}
          <div className="flex items-start gap-2.5 rounded-xl bg-beat-gold/10 p-3 border border-beat-gold/30 text-beat-maroon text-[11px] leading-relaxed">
            <AlertTriangle className="h-4 w-4 shrink-0 text-beat-maroon mt-0.5" />
            <div>
              <span className="font-bold">Safe Reconcile Active: </span>
              If trainees have verified progress on matching competencies, their stamps will be
              preserved without data loss. Newly required competencies will be added to their
              digital passports.
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-beat-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-beat-border px-4 py-2.5 text-xs font-bold text-beat-muted hover:bg-beat-canvas transition-colors cursor-pointer disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || plans.length === 0}
              className="flex items-center gap-1.5 rounded-xl bg-beat-maroon px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-beat-maroon-dark transition-all disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4 text-beat-gold" />
              <span>{isSubmitting ? "Assigning..." : "Confirm Plan Assignment"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
