import Link from "next/link";
import { listTrainingPlans } from "@/lib/db/repositories/plans";
import { CreatePlanModal } from "@/components/admin/CreatePlanModal";
import {
  GitBranch,
  Layers,
  Users,
  CheckCircle2,
  Calendar,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TrainingPlansPage() {
  const plans = await listTrainingPlans();

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-beat-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-beat-maroon tracking-tight">
              Training Plans
            </h1>
            <span className="passport-stamp px-2.5 py-0.5 text-[9px] border-beat-gold text-beat-gold">
              Dynamic Builder
            </span>
          </div>
          <p className="text-xs text-beat-muted mt-1">
            Manage custom role-tailored development paths and published version snapshots.
          </p>
        </div>

        <CreatePlanModal />
      </div>

      {/* Plan Cards Grid */}
      {plans.length === 0 ? (
        <div className="rounded-xl border border-dashed border-beat-gold/40 bg-white p-12 text-center text-beat-maroon">
          <GitBranch className="mx-auto h-12 w-12 text-beat-gold mb-3" />
          <h3 className="text-lg font-bold">No Training Plans Configured</h3>
          <p className="text-xs text-beat-muted mt-1 max-w-sm mx-auto">
            Create your first role-tailored training plan using the button above or run the database seed.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="flex flex-col justify-between rounded-xl border border-beat-gold/30 bg-white p-5 shadow-sm hover:shadow-sm transition-shadow text-beat-maroon relative group"
            >
              <div>
                {/* Header row with badges */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-beat-maroon/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-beat-maroon border border-beat-maroon/20">
                    {plan.roleIdentifier}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {plan.isDefault && (
                      <span className="rounded-full bg-beat-gold/20 px-2 py-0.5 text-[10px] font-bold text-beat-maroon border border-beat-gold/40">
                        Default
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        plan.status === "PUBLISHED"
                          ? "bg-beat-gold/10 text-beat-maroon border border-beat-gold/30"
                          : "bg-beat-gold/10 text-beat-maroon border border-beat-gold/30"
                      }`}
                    >
                      {plan.status}
                    </span>
                  </div>
                </div>

                {/* Plan Title & Brand */}
                <h3 className="font-bold text-base text-beat-maroon line-clamp-1">
                  {plan.title}
                </h3>
                <p className="text-xs text-beat-gold font-semibold mt-0.5">
                  {plan.restaurantBrand || "All Bistro Group Brands"}
                </p>

                {plan.description && (
                  <p className="text-xs text-beat-muted line-clamp-2 mt-2 leading-relaxed">
                    {plan.description}
                  </p>
                )}

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-beat-border/60 text-xs">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-beat-gold" />
                    <div>
                      <p className="text-[10px] text-beat-muted uppercase tracking-wider font-semibold">
                        Version & Nodes
                      </p>
                      <p className="font-bold text-beat-maroon">
                        v{plan.latestVersionNumber} · {plan.nodeCount} milestones
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-beat-maroon" />
                    <div>
                      <p className="text-[10px] text-beat-muted uppercase tracking-wider font-semibold">
                        Active Enrolled
                      </p>
                      <p className="font-bold text-beat-maroon">
                        {plan.assignedTraineesCount} trainees
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-5 pt-3 border-t border-beat-border flex items-center justify-between">
                <span className="text-[10px] text-beat-muted font-medium">
                  Author: {plan.createdByName}
                </span>

                <Link
                  href={`/trainer/plans/${plan.id}/builder`}
                  className="flex items-center gap-1.5 rounded-xl bg-beat-maroon px-3.5 py-1.5 text-xs font-bold text-white hover:bg-beat-maroon-dark transition-colors shadow-xs"
                >
                  <span>Open Canvas</span>
                  <ArrowRight className="h-3.5 w-3.5 text-beat-gold" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
