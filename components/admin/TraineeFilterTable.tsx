"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Building2,
  MapPin,
  ArrowRight,
  Clock,
  CheckCircle2,
  Users,
} from "lucide-react";
import type { TraineeDirectoryItem } from "@/lib/db/repositories/admin";

interface TraineeFilterTableProps {
  trainees: TraineeDirectoryItem[];
}

export function TraineeFilterTable({ trainees }: TraineeFilterTableProps) {
  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("ALL");
  const [selectedBranch, setSelectedBranch] = useState("ALL");
  const [selectedCohort, setSelectedCohort] = useState("ALL");

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
        t.email.toLowerCase().includes(search.toLowerCase());

      const matchesBrand =
        selectedBrand === "ALL" || t.restaurantBrand === selectedBrand;
      const matchesBranch =
        selectedBranch === "ALL" || t.branchLocation === selectedBranch;
      const matchesCohort =
        selectedCohort === "ALL" || t.cohortBatch === selectedCohort;

      return matchesSearch && matchesBrand && matchesBranch && matchesCohort;
    });
  }, [trainees, search, selectedBrand, selectedBranch, selectedCohort]);

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="rounded-3xl bg-beat-card p-5 border border-beat-border shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-beat-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, trainee code, or email..."
              className="w-full rounded-2xl border border-beat-border bg-beat-canvas pl-10 pr-4 py-2.5 text-xs text-[#2B1810] placeholder:text-beat-muted/60 focus:border-beat-gold focus:outline-none focus:ring-1 focus:ring-beat-gold transition-all"
            />
          </div>

          {/* Brand Filter */}
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="rounded-2xl border border-beat-border bg-beat-canvas px-3.5 py-2.5 text-xs font-semibold text-beat-maroon focus:border-beat-gold focus:outline-none focus:ring-1 focus:ring-beat-gold cursor-pointer"
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
            className="rounded-2xl border border-beat-border bg-beat-canvas px-3.5 py-2.5 text-xs font-semibold text-beat-maroon focus:border-beat-gold focus:outline-none focus:ring-1 focus:ring-beat-gold cursor-pointer"
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
            className="rounded-2xl border border-beat-border bg-beat-canvas px-3.5 py-2.5 text-xs font-semibold text-beat-maroon focus:border-beat-gold focus:outline-none focus:ring-1 focus:ring-beat-gold cursor-pointer"
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
              className="text-beat-gold hover:underline font-bold text-[11px]"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Directory Table */}
      <div className="overflow-hidden rounded-3xl bg-beat-card border border-beat-border shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-beat-border bg-beat-canvas/50 text-[11px] font-bold uppercase tracking-wider text-beat-maroon/70">
                <th className="py-3.5 px-5">Trainee</th>
                <th className="py-3.5 px-4">Brand & Branch</th>
                <th className="py-3.5 px-4">Cohort</th>
                <th className="py-3.5 px-4">Passport Progress</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-beat-border">
              {filteredTrainees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-beat-muted">
                    <Users className="mx-auto h-8 w-8 text-beat-border mb-2" />
                    No trainees matched the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredTrainees.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-beat-canvas/40 transition-colors group"
                  >
                    {/* Trainee Details */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-beat-maroon/10 text-beat-maroon font-bold text-xs shrink-0">
                          {t.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-extrabold text-beat-maroon text-sm leading-tight">
                            {t.fullName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[10px] font-bold text-beat-gold bg-beat-maroon/5 px-1.5 py-0.2 rounded border border-beat-border">
                              {t.traineeCode}
                            </span>
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

                    {/* Progress Bar */}
                    <td className="py-4 px-4">
                      <div className="w-36 space-y-1">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-beat-maroon">
                            {t.verifiedCount}/{t.totalMilestones}
                          </span>
                          <span className="text-beat-gold">{t.progressPercent}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-beat-canvas border border-beat-border">
                          <div
                            className="h-full bg-gradient-to-r from-beat-maroon to-beat-gold transition-all duration-300"
                            style={{ width: `${t.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Review Status Pill */}
                    <td className="py-4 px-4">
                      {t.readyForReviewCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">
                          <Clock className="h-3 w-3" />
                          {t.readyForReviewCount} In Review
                        </span>
                      ) : t.verifiedCount === t.totalMilestones && t.totalMilestones > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
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
                        href={`/admin/trainees/${t.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-beat-canvas px-3.5 py-2 text-xs font-bold text-beat-maroon border border-beat-border hover:border-beat-gold hover:bg-beat-gold/10 transition-colors"
                      >
                        <span>View Passport</span>
                        <ArrowRight className="h-3.5 w-3.5 text-beat-gold" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
