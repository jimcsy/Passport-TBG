"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Building2,
  MapPin,
  ArrowRight,
  Clock,
  CheckCircle2,
  Users,
  GitBranch,
  CheckSquare,
  Square,
  MinusSquare,
  } from "lucide-react";
import type { TraineeDirectoryItem } from "@/lib/db/repositories/admin";
import { AssignPlanModal, type AvailablePlanOption } from "./AssignPlanModal";

interface TraineeFilterTableProps {
  trainees: TraineeDirectoryItem[];
  availablePlans?: AvailablePlanOption[];
}

export function TraineeFilterTable({ trainees, availablePlans = [] }: TraineeFilterTableProps) {
  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("ALL");
  const [selectedBranch, setSelectedBranch] = useState("ALL");
  const [selectedCohort, setSelectedCohort] = useState("ALL");

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTraineeIds, setModalTraineeIds] = useState<string[]>([]);
  const [modalTraineeNames, setModalTraineeNames] = useState<string[]>([]);

  // Derive unique filter options
  const brands = useMemo(() => {
    return Array.from(new Set(trainees.map((t) => t.restaurantBrand))).sort();
  }, [trainees]);

  const branches = useMemo(() => {
    return Array.from(new Set(trainees.map((t) => t.branchLocation))).sort();
  }, [trainees]);

  const cohorts = useMemo(() => {
    return Array.from(new Set(trainees.map((t) => t.cohortBatch))).sort();
  }, [trainees]);

  // Filtered list
  const filteredTrainees = useMemo(() => {
    return trainees.filter((t) => {
      const matchesSearch =
        search.trim() === "" ||
        t.fullName.toLowerCase().includes(search.toLowerCase()) ||
        t.traineeCode.toLowerCase().includes(search.toLowerCase()) ||
        t.email.toLowerCase().includes(search.toLowerCase()) ||
        (t.jobRole && t.jobRole.toLowerCase().includes(search.toLowerCase())) ||
        (t.planTitle && t.planTitle.toLowerCase().includes(search.toLowerCase()));

      const matchesBrand =
        selectedBrand === "ALL" || t.restaurantBrand === selectedBrand;
      const matchesBranch =
        selectedBranch === "ALL" || t.branchLocation === selectedBranch;
      const matchesCohort =
        selectedCohort === "ALL" || t.cohortBatch === selectedCohort;

      return matchesSearch && matchesBrand && matchesBranch && matchesCohort;
    });
  }, [trainees, search, selectedBrand, selectedBranch, selectedCohort]);

  // Selection helpers
  const allFilteredSelected =
    filteredTrainees.length > 0 &&
    filteredTrainees.every((t) => selectedIds.has(t.id));

  const someFilteredSelected =
    filteredTrainees.some((t) => selectedIds.has(t.id)) && !allFilteredSelected;

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      const newSet = new Set(selectedIds);
      filteredTrainees.forEach((t) => newSet.delete(t.id));
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedIds);
      filteredTrainees.forEach((t) => newSet.add(t.id));
      setSelectedIds(newSet);
    }
  };

  const toggleSelectOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleOpenBulkModal = () => {
    const targets = trainees.filter((t) => selectedIds.has(t.id));
    setModalTraineeIds(targets.map((t) => t.id));
    setModalTraineeNames(targets.map((t) => t.fullName));
    setIsModalOpen(true);
  };

  const handleOpenSingleModal = (trainee: TraineeDirectoryItem) => {
    setModalTraineeIds([trainee.id]);
    setModalTraineeNames([trainee.fullName]);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="rounded-xl bg-beat-card p-5 border border-beat-border shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-beat-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, trainee code, role, plan, or email..."
              className="w-full rounded-lg border border-beat-border bg-beat-canvas pl-10 pr-4 py-2.5 text-xs text-beat-maroon placeholder:text-beat-muted/60 focus:border-beat-gold focus:outline-none focus:ring-1 focus:ring-beat-gold transition-all"
            />
          </div>

          {/* Brand Filter */}
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="rounded-lg border border-beat-border bg-beat-canvas px-3.5 py-2.5 text-xs font-semibold text-beat-maroon focus:border-beat-gold focus:outline-none focus:ring-1 focus:ring-beat-gold cursor-pointer"
          >
            <option value="ALL">All Brands ({brands.length})</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {/* Branch Filter */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="rounded-lg border border-beat-border bg-beat-canvas px-3.5 py-2.5 text-xs font-semibold text-beat-maroon focus:border-beat-gold focus:outline-none focus:ring-1 focus:ring-beat-gold cursor-pointer"
          >
            <option value="ALL">All Branches ({branches.length})</option>
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {/* Cohort Filter */}
          <select
            value={selectedCohort}
            onChange={(e) => setSelectedCohort(e.target.value)}
            className="rounded-lg border border-beat-border bg-beat-canvas px-3.5 py-2.5 text-xs font-semibold text-beat-maroon focus:border-beat-gold focus:outline-none focus:ring-1 focus:ring-beat-gold cursor-pointer"
          >
            <option value="ALL">All Cohorts ({cohorts.length})</option>
            {cohorts.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between text-xs text-beat-muted pt-1">
          <span>
            Showing <strong className="text-beat-maroon">{filteredTrainees.length}</strong> of {trainees.length} trainees
          </span>
          {(search || selectedBrand !== "ALL" || selectedBranch !== "ALL" || selectedCohort !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedBrand("ALL");
                setSelectedBranch("ALL");
                setSelectedCohort("ALL");
              }}
              className="text-beat-gold hover:underline font-bold text-[11px] cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Bulk Action Sticky Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-beat-maroon px-5 py-3 text-white shadow-sm border border-beat-gold/30 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-beat-gold text-beat-maroon font-bold text-xs">
              {selectedIds.size}
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">
                {selectedIds.size} {selectedIds.size === 1 ? "trainee" : "trainees"} selected
              </p>
              <p className="text-[11px] text-white/70">
                Bulk assign or update customized BEAT training plans
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="rounded-xl px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              Deselect All
            </button>
            <button
              type="button"
              onClick={handleOpenBulkModal}
              disabled={availablePlans.length === 0}
              className="flex items-center gap-1.5 rounded-xl bg-beat-gold px-4 py-2 text-xs font-bold text-beat-maroon shadow-sm hover:bg-beat-gold-light transition-all cursor-pointer disabled:opacity-50"
            >
              <GitBranch className="h-3.5 w-3.5" />
              <span>Assign Plan ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* Directory Table */}
      <div className="overflow-hidden rounded-xl bg-beat-card border border-beat-border shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-beat-border bg-beat-canvas/50 text-[11px] font-bold uppercase tracking-wider text-beat-maroon/70">
                <th className="py-3.5 pl-5 pr-2 w-10">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-beat-maroon/60 hover:text-beat-maroon cursor-pointer flex items-center"
                    title={allFilteredSelected ? "Deselect all" : "Select all"}
                  >
                    {allFilteredSelected ? (
                      <CheckSquare className="h-4 w-4 text-beat-maroon" />
                    ) : someFilteredSelected ? (
                      <MinusSquare className="h-4 w-4 text-beat-gold" />
                    ) : (
                      <Square className="h-4 w-4 text-beat-muted/60" />
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-4">Trainee & Role</th>
                <th className="py-3.5 px-4">Brand & Branch</th>
                <th className="py-3.5 px-4">Cohort</th>
                <th className="py-3.5 px-4">Assigned Training Plan</th>
                <th className="py-3.5 px-4">Passport Progress</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-beat-border">
              {filteredTrainees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-beat-muted">
                    <Users className="mx-auto h-8 w-8 text-beat-border mb-2" />
                    No trainees matched the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredTrainees.map((t) => {
                  const isSelected = selectedIds.has(t.id);
                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-beat-canvas/40 transition-colors group ${
                        isSelected ? "bg-beat-gold/5" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-4 pl-5 pr-2">
                        <button
                          type="button"
                          onClick={() => toggleSelectOne(t.id)}
                          className="cursor-pointer flex items-center text-beat-maroon/70 hover:text-beat-maroon"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-beat-maroon" />
                          ) : (
                            <Square className="h-4 w-4 text-beat-muted/50 group-hover:text-beat-muted" />
                          )}
                        </button>
                      </td>

                      {/* Trainee Details & Role */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-beat-maroon/10 text-beat-maroon font-bold text-xs shrink-0">
                            {t.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-beat-maroon text-sm leading-tight">
                              {t.fullName}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[10px] font-bold text-beat-gold bg-beat-maroon/5 px-1.5 py-0.2 rounded border border-beat-border">
                                {t.traineeCode}
                              </span>
                              {t.jobRole && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-beat-canvas px-1.5 py-0.5 text-[10px] font-bold text-beat-maroon border border-beat-border">
                                  {t.jobRole}
                                </span>
                              )}
                              <span className="text-[11px] text-beat-muted truncate max-w-[140px]">
                                {t.email}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Brand & Branch */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-beat-maroon flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5 text-beat-gold" />
                            {t.restaurantBrand}
                          </p>
                          <p className="text-[11px] text-beat-muted flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-beat-muted" />
                            {t.branchLocation}
                          </p>
                        </div>
                      </td>

                      {/* Cohort */}
                      <td className="py-4 px-4 font-semibold text-beat-maroon">
                        {t.cohortBatch}
                      </td>

                      {/* Assigned Training Plan */}
                      <td className="py-4 px-4">
                        {t.planTitle ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-beat-maroon text-xs">
                                {t.planTitle}
                              </span>
                              <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-beat-maroon/10 text-beat-maroon">
                                v{t.planVersionNumber}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenSingleModal(t)}
                              className="text-[10px] font-bold text-beat-gold hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <GitBranch className="h-2.5 w-2.5" />
                              Change Plan
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
                              Unassigned
                            </span>
                            <div>
                              <button
                                type="button"
                                onClick={() => handleOpenSingleModal(t)}
                                className="text-[10px] font-bold text-beat-maroon hover:underline cursor-pointer flex items-center gap-1"
                              >
                                <GitBranch className="h-2.5 w-2.5 text-beat-gold" />
                                Assign Plan
                              </button>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Progress Bar */}
                      <td className="py-4 px-4">
                        <div className="w-32 space-y-1">
                          <div className="flex justify-between text-[11px] font-bold">
                            <span className="text-beat-maroon">
                              {t.verifiedCount}/{t.totalMilestones}
                            </span>
                            <span className="text-beat-gold">{t.progressPercent}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-beat-canvas border border-beat-border">
                            <div
                              className="h-full bg-beat-gold transition-all duration-300"
                              style={{ width: `${t.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Review Status Pill */}
                      <td className="py-4 px-4">
                        {t.readyForReviewCount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-beat-gold/10 px-2.5 py-0.5 text-[10px] font-bold text-beat-maroon border border-beat-gold/30">
                            <Clock className="h-3 w-3" />
                            {t.readyForReviewCount} In Review
                          </span>
                        ) : t.verifiedCount === t.totalMilestones && t.totalMilestones > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-beat-gold/10 px-2.5 py-0.5 text-[10px] font-bold text-beat-maroon border border-beat-gold/30">
                            <CheckCircle2 className="h-3 w-3" />
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-beat-canvas px-2.5 py-0.5 text-[10px] font-semibold text-beat-muted border border-beat-border">
                            In Progress
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-5 text-right">
                        <Link
                          href={`/trainer/trainees/${t.id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-beat-canvas px-3.5 py-2 text-xs font-bold text-beat-maroon border border-beat-border hover:border-beat-gold hover:bg-beat-gold/10 transition-colors"
                        >
                          <span>View Passport</span>
                          <ArrowRight className="h-3.5 w-3.5 text-beat-gold" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plan Assignment Modal */}
      <AssignPlanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        traineeIds={modalTraineeIds}
        traineeNames={modalTraineeNames}
        plans={availablePlans}
        onSuccess={() => {
          setSelectedIds(new Set());
        }}
      />
    </div>
  );
}

