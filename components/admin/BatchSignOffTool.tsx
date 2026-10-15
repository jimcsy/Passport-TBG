"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  Square,
  Users,
  Award,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Building2,
  MapPin,
  Calendar,
} from "lucide-react";
import { bulkVerifyMilestones } from "@/lib/actions/progress";
import type { BatchToolData } from "@/lib/db/repositories/admin";

interface BatchSignOffToolProps {
  data: BatchToolData;
}

export function BatchSignOffTool({ data }: BatchSignOffToolProps) {
  const router = useRouter();
  const [selectedBrand, setSelectedBrand] = useState("ALL");
  const [selectedBranch, setSelectedBranch] = useState("ALL");
  const [selectedCohort, setSelectedCohort] = useState("ALL");

  const [selectedTraineeIds, setSelectedTraineeIds] = useState<string[]>([]);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>(
    data.milestones[0]?.id || ""
  );
  const [trainerNote, setTrainerNote] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  // Extract filter choices
  const brands = useMemo(() => {
    return Array.from(new Set(data.trainees.map((t) => t.restaurantBrand))).sort();
  }, [data.trainees]);

  const branches = useMemo(() => {
    return Array.from(new Set(data.trainees.map((t) => t.branchLocation))).sort();
  }, [data.trainees]);

  const cohorts = useMemo(() => {
    return Array.from(new Set(data.trainees.map((t) => t.cohortBatch))).sort();
  }, [data.trainees]);

  // Filtered trainee list
  const filteredTrainees = useMemo(() => {
    return data.trainees.filter((t) => {
      const matchBrand = selectedBrand === "ALL" || t.restaurantBrand === selectedBrand;
      const matchBranch = selectedBranch === "ALL" || t.branchLocation === selectedBranch;
      const matchCohort = selectedCohort === "ALL" || t.cohortBatch === selectedCohort;
      return matchBrand && matchBranch && matchCohort;
    });
  }, [data.trainees, selectedBrand, selectedBranch, selectedCohort]);

  // Handle select all
  const allFilteredSelected =
    filteredTrainees.length > 0 &&
    filteredTrainees.every((t) => selectedTraineeIds.includes(t.id));

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      // Unselect all in current filter
      const filteredIds = new Set(filteredTrainees.map((t) => t.id));
      setSelectedTraineeIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      // Add all in current filter
      const toAdd = filteredTrainees.map((t) => t.id);
      setSelectedTraineeIds((prev) => Array.from(new Set([...prev, ...toAdd])));
    }
  };

  const handleToggleTrainee = (id: string) => {
    setSelectedTraineeIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSuccess(false);

    if (selectedTraineeIds.length === 0) {
      setError("Please select at least one trainee to sign off.");
      return;
    }

    if (!selectedMilestoneId) {
      setError("Please select a training milestone.");
      return;
    }

    startTransition(async () => {
      const count = selectedTraineeIds.length;
      const result = await bulkVerifyMilestones(
        selectedTraineeIds,
        selectedMilestoneId,
        trainerNote
      );

      if (result.success) {
        setIsSuccess(true);
        setSuccessCount(count);
        setSelectedTraineeIds([]);
        setTrainerNote("");
        router.refresh();
      } else {
        setError(result.error || "Failed to complete bulk sign-off.");
      }
    });
  };

  const selectedMilestone = data.milestones.find(
    (m) => m.id === selectedMilestoneId
  );

  return (
    <div className="space-y-6">
      {/* Success Notification */}
      {isSuccess && (
        <div className="flex items-center justify-between rounded-xl bg-beat-gold/10 p-5 border border-beat-gold/30 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-beat-gold/10 text-beat-maroon">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-beat-maroon">
                Bulk Sign-Off Completed!
              </h4>
              <p className="text-xs text-beat-maroon">
                Successfully stamped milestone <strong>{selectedMilestone?.code}</strong> for <strong>{successCount}</strong> trainees in a single transaction.
              </p>
            </div>
          </div>
          <span className="passport-stamp px-3 py-1 text-[10px] text-beat-gold border-beat-gold">
            Transaction Committed
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2.5 rounded-lg bg-beat-maroon/5 p-4 text-xs text-beat-maroon border border-beat-maroon/25">
          <AlertCircle className="h-4 w-4 shrink-0 text-beat-maroon mt-0.5" />
          <p className="font-semibold">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Cohort Filter & Trainee Checkbox List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters Bar */}
          <div className="rounded-xl bg-beat-card p-5 border border-beat-border shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-beat-maroon">
              Step 1: Filter Cohort & Select Attendees
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-beat-muted uppercase mb-1">
                  Brand
                </label>
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full rounded-xl border border-beat-border bg-beat-canvas px-3 py-2 text-xs font-semibold text-beat-maroon focus:outline-none focus:border-beat-gold cursor-pointer"
                >
                  <option value="ALL">All Brands ({brands.length})</option>
                  {brands.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-beat-muted uppercase mb-1">
                  Branch
                </label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full rounded-xl border border-beat-border bg-beat-canvas px-3 py-2 text-xs font-semibold text-beat-maroon focus:outline-none focus:border-beat-gold cursor-pointer"
                >
                  <option value="ALL">All Branches ({branches.length})</option>
                  {branches.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-beat-muted uppercase mb-1">
                  Cohort
                </label>
                <select
                  value={selectedCohort}
                  onChange={(e) => setSelectedCohort(e.target.value)}
                  className="w-full rounded-xl border border-beat-border bg-beat-canvas px-3 py-2 text-xs font-semibold text-beat-maroon focus:outline-none focus:border-beat-gold cursor-pointer"
                >
                  <option value="ALL">All Cohorts ({cohorts.length})</option>
                  {cohorts.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Trainees List with Select All */}
          <div className="rounded-xl bg-beat-card border border-beat-border shadow-xs overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-beat-canvas/60 border-b border-beat-border">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="flex items-center gap-2 text-xs font-bold text-beat-maroon hover:text-beat-gold transition-colors cursor-pointer"
              >
                {allFilteredSelected ? (
                  <CheckSquare className="h-4 w-4 text-beat-gold" />
                ) : (
                  <Square className="h-4 w-4 text-beat-muted" />
                )}
                <span>Select All Filtered ({filteredTrainees.length})</span>
              </button>

              <span className="text-xs font-bold text-beat-gold">
                {selectedTraineeIds.length} Selected
              </span>
            </div>

            <div className="divide-y divide-beat-border max-h-[380px] overflow-y-auto">
              {filteredTrainees.length === 0 ? (
                <div className="p-8 text-center text-xs text-beat-muted">
                  No trainees match the chosen cohort filters.
                </div>
              ) : (
                filteredTrainees.map((t) => {
                  const isChecked = selectedTraineeIds.includes(t.id);
                  return (
                    <div
                      key={t.id}
                      onClick={() => handleToggleTrainee(t.id)}
                      className={`flex items-center justify-between p-4 transition-colors cursor-pointer ${
                        isChecked ? "bg-beat-gold/10" : "hover:bg-beat-canvas/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by parent onClick
                          className="h-4 w-4 rounded text-beat-maroon focus:ring-beat-gold cursor-pointer"
                        />
                        <div>
                          <p className="text-sm font-semibold text-beat-maroon">
                            {t.fullName}
                          </p>
                          <p className="text-[11px] text-beat-muted">
                            <span className="font-mono font-bold text-beat-gold">{t.traineeCode}</span> • {t.restaurantBrand} ({t.branchLocation})
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-beat-muted">
                        {t.cohortBatch}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Milestone Picker & Execute */}
        <div className="space-y-4">
          <div className="rounded-xl bg-beat-card p-6 border border-beat-border shadow-xs space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-beat-maroon">
              Step 2: Training Milestone to Stamp
            </h3>

            {/* Milestone Dropdown */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-beat-muted mb-1.5">
                Select Milestone Checklist
              </label>
              <select
                value={selectedMilestoneId}
                onChange={(e) => setSelectedMilestoneId(e.target.value)}
                className="w-full rounded-lg border border-beat-border bg-beat-canvas p-3 text-xs font-bold text-beat-maroon focus:border-beat-gold focus:outline-none focus:ring-1 focus:ring-beat-gold cursor-pointer"
              >
                {data.milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    [{m.code}] {m.title}
                  </option>
                ))}
              </select>

              {selectedMilestone && (
                <div className="mt-2.5 rounded-xl bg-beat-canvas p-3 border border-beat-border text-[11px] text-beat-muted">
                  <span className="font-bold text-beat-maroon">
                    {selectedMilestone.path}:
                  </span>{" "}
                  {selectedMilestone.title}
                </div>
              )}
            </div>

            {/* Optional Trainer Note */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-beat-muted mb-1.5">
                Session Sign-Off Note (Optional)
              </label>
              <textarea
                value={trainerNote}
                onChange={(e) => setTrainerNote(e.target.value)}
                rows={3}
                placeholder="e.g. Completed Shift Classroom orientation with 100% attendance."
                className="w-full rounded-lg border border-beat-border bg-beat-canvas p-3 text-xs text-beat-maroon focus:border-beat-gold focus:outline-none focus:ring-1 focus:ring-beat-gold resize-none"
              />
            </div>

            {/* Bulk Action Submit Button */}
            <button
              type="submit"
              disabled={isPending || selectedTraineeIds.length === 0}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-beat-maroon py-4 px-4 text-xs font-semibold text-white shadow-sm shadow-beat-maroon/20 hover:bg-beat-maroon-light active:bg-beat-maroon-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-beat-gold" />
                  <span>Stamping Cohort...</span>
                </>
              ) : (
                <>
                  <Award className="h-4 w-4 text-beat-gold" />
                  <span>
                    Bulk Sign Off ({selectedTraineeIds.length} Trainees)
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
