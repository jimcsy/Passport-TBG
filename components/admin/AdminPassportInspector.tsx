"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Award,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { verifyMilestone } from "@/lib/actions/progress";
import { MilestoneStatus } from "@/lib/types/models";
import type { PathProgressSummary, EnrichedMilestone } from "@/lib/db/repositories/trainee";

interface AdminPassportInspectorProps {
  traineeId: string;
  paths: PathProgressSummary[];
}

export function AdminPassportInspector({
  traineeId,
  paths,
}: AdminPassportInspectorProps) {
  const router = useRouter();
  const [activePathKey, setActivePathKey] = useState<string>(paths[0]?.path || "");
  const [pendingMilestoneId, setPendingMilestoneId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activePath = paths.find((p) => p.path === activePathKey) || paths[0];

  const handleVerify = (milestoneId: string) => {
    setPendingMilestoneId(milestoneId);
    startTransition(async () => {
      const res = await verifyMilestone(traineeId, milestoneId);
      if (res.success) {
        router.refresh();
      }
      setPendingMilestoneId(null);
    });
  };

  return (
    <div className="space-y-6">
      {/* Path Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {paths.map((p) => {
          const isActive = p.path === activePathKey;
          const isComplete = p.verified === p.total && p.total > 0;

          return (
            <button
              key={p.path}
              type="button"
              onClick={() => setActivePathKey(p.path)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-3 text-xs font-bold transition-all border cursor-pointer ${
                isActive
                  ? "bg-beat-maroon text-white border-beat-maroon shadow-sm ring-2 ring-beat-gold/40"
                  : "bg-beat-card text-beat-maroon border-beat-border hover:border-beat-gold/60 hover:bg-white"
              }`}
            >
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span>{p.title}</span>
                  {isComplete && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-beat-gold shrink-0" />
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-black/10">
                    <div
                      className={`h-full ${
                        isActive ? "bg-beat-gold" : "bg-beat-maroon"
                      }`}
                      style={{ width: `${p.percent}%` }}
                    />
                  </div>
                  <span
                    className={`text-[10px] ${
                      isActive ? "text-beat-gold" : "text-beat-muted"
                    }`}
                  >
                    {p.verified}/{p.total}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Path Header & Milestone Cards with Trainer Sign-Off Controls */}
      {activePath && (
        <div className="rounded-xl bg-beat-card p-6 sm:p-8 shadow-sm border border-beat-border space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-beat-border">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-beat-gold">
                  <Award className="h-3.5 w-3.5" />
                  Trainer Inspection
                </span>
                <span className="text-xs text-beat-muted">•</span>
                <span className="text-xs font-semibold text-beat-muted">
                  {activePath.verified} of {activePath.total} Verified ({activePath.percent}%)
                </span>
              </div>
              <h2 className="mt-1 text-2xl font-semibold text-beat-maroon">
                {activePath.title}
              </h2>
              <p className="mt-1 text-xs text-beat-muted max-w-xl">
                {activePath.description}
              </p>
            </div>

            <div className="w-full sm:w-48 space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-beat-maroon">
                <span>Completion</span>
                <span className="text-beat-gold font-mono">{activePath.percent}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-beat-canvas border border-beat-border">
                <div
                  className="h-full bg-beat-gold transition-all duration-300"
                  style={{ width: `${activePath.percent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Milestones List */}
          <div className="space-y-3">
            {activePath.milestones.map((m) => {
              const isVerified = m.status === MilestoneStatus.VERIFIED;
              const isReadyForReview = m.status === MilestoneStatus.READY_FOR_REVIEW;
              const isProcessing = isPending && pendingMilestoneId === m.id;

              const formattedDate = m.verifiedAt
                ? new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }).format(new Date(m.verifiedAt))
                : null;

              return (
                <div
                  key={m.id}
                  className={`rounded-lg p-5 border transition-all ${
                    isVerified
                      ? "bg-white border-beat-gold/40 ring-1 ring-beat-gold/20 shadow-xs"
                      : isReadyForReview
                      ? "bg-beat-gold/10 border-beat-gold/30 ring-2 ring-beat-gold/30 shadow-sm"
                      : "bg-beat-canvas/40 border-beat-border"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1.5 break-words">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-beat-maroon/5 text-beat-maroon border border-beat-border">
                          {m.code}
                        </span>

                        {isVerified && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-beat-gold/10 px-2 py-0.5 text-[10px] font-bold text-beat-maroon border border-beat-gold/30">
                            <CheckCircle2 className="h-3 w-3 text-beat-maroon" />
                            Verified
                          </span>
                        )}

                        {isReadyForReview && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-beat-gold/10 px-2.5 py-0.5 text-[10px] font-bold text-beat-maroon border border-beat-gold/30">
                            <Clock className="h-3 w-3" />
                            Ready for Review Submission
                          </span>
                        )}

                        {!isVerified && !isReadyForReview && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-beat-canvas px-2 py-0.5 text-[10px] font-semibold text-beat-muted border border-beat-border">
                            In Progress
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold text-beat-maroon">
                        {m.title}
                      </h3>
                      <p className="text-xs text-beat-muted leading-relaxed">
                        {m.description}
                      </p>

                      {/* Trainee Reflection Note */}
                      {m.traineeNote && (
                        <div className="mt-2.5 rounded-xl bg-beat-canvas p-3 border border-beat-border text-xs">
                          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-beat-maroon">
                            <MessageSquare className="h-3 w-3 text-beat-gold" />
                            <span>Trainee Reflection Note:</span>
                          </div>
                          <p className="mt-1 text-beat-maroon italic">
                            &ldquo;{m.traineeNote}&rdquo;
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Trainer Stamp or 1-Click Verification Toggle */}
                    <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-2">
                      {isVerified ? (
                        <div className="passport-stamp px-3 py-1 text-[10px] bg-beat-gold/5 shadow-inner">
                          <div className="flex flex-col items-center text-center">
                            <span className="text-[9px] uppercase tracking-widest text-beat-gold-dark font-semibold">
                              Verified
                            </span>
                            <span className="text-[10px] font-semibold text-beat-maroon">
                              {m.trainerName || "Trainer Verified"}
                            </span>
                            <span className="text-[8px] font-semibold text-beat-muted">
                              {formattedDate}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleVerify(m.id)}
                          disabled={isPending}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-sm cursor-pointer ${
                            isReadyForReview
                              ? "bg-beat-maroon text-white hover:bg-beat-maroon-light active:bg-beat-maroon-dark ring-2 ring-beat-gold/50"
                              : "bg-beat-card text-beat-maroon border border-beat-border hover:border-beat-gold hover:bg-beat-gold/10"
                          } disabled:opacity-60`}
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-beat-gold" />
                              <span>Stamping...</span>
                            </>
                          ) : (
                            <>
                              <Award className="h-3.5 w-3.5 text-beat-gold" />
                              <span>
                                {isReadyForReview ? "1-Click Approve" : "Sign Off Milestone"}
                              </span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
