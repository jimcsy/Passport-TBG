import { PassportStamp } from "./PassportStamp";
import { CheckCircle2, Clock, Lock, Send, UserCheck } from "lucide-react";
import { MilestoneStatus } from "@/lib/types/models";
import type { EnrichedMilestone } from "@/lib/db/repositories/trainee";

interface MilestoneCardProps {
  milestone: EnrichedMilestone;
  onRequestReview?: (milestone: EnrichedMilestone) => void;
}

export function MilestoneCard({ milestone, onRequestReview }: MilestoneCardProps) {
  const isVerified = milestone.status === MilestoneStatus.VERIFIED;
  const isReadyForReview = milestone.status === MilestoneStatus.READY_FOR_REVIEW;
  const isLocked = milestone.status === MilestoneStatus.LOCKED;
  const isInProgress = milestone.status === MilestoneStatus.IN_PROGRESS;


  return (
    <div id={`milestone-${milestone.id}`} tabIndex={-1}
      className={`relative rounded-lg p-5 transition-all border ${
        isVerified
          ? "bg-white border-beat-gold/40 shadow-sm ring-1 ring-beat-gold/20"
          : isReadyForReview
          ? "bg-beat-gold/5 border-beat-gold/30"
          : isLocked
          ? "bg-beat-canvas/50 border-beat-border/60 opacity-60"
          : "bg-white border-beat-border hover:border-beat-gold/50 shadow-sm"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        {/* Left: Code, Title, Description */}
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`font-mono text-xs font-semibold px-2 py-0.5 rounded-md ${
                isVerified
                  ? "bg-beat-gold/15 text-beat-maroon"
                  : isReadyForReview
                  ? "bg-beat-gold/15 text-beat-maroon"
                  : "bg-beat-canvas text-beat-muted border border-beat-border"
              }`}
            >
              {milestone.code}
            </span>

            {/* Status Pill */}
            {isVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-beat-maroon/5 px-2 py-0.5 text-[10px] font-bold text-beat-maroon border border-beat-gold/30">
                <CheckCircle2 className="h-3 w-3 text-beat-gold" />
                Verified & Stamped
              </span>
            )}
            {isReadyForReview && (
              <span className="inline-flex items-center gap-1 rounded-full bg-beat-gold/15 px-2 py-0.5 text-[10px] font-bold text-beat-maroon border border-beat-gold/40">
                <Clock className="h-3 w-3 text-beat-gold" />
                Awaiting Verification
              </span>
            )}
            {isInProgress && (
              <span className="inline-flex items-center gap-1 rounded-full bg-beat-canvas px-2 py-0.5 text-[10px] font-bold text-beat-maroon border border-beat-border">
                In Progress
              </span>
            )}
            {isLocked && (
              <span className="inline-flex items-center gap-1 rounded-full bg-beat-canvas px-2 py-0.5 text-[10px] font-bold text-beat-maroon/60 border border-beat-gold/20">
                <Lock className="h-3 w-3" />
                Locked
              </span>
            )}
          </div>

          <h3 className="text-base font-bold text-beat-maroon leading-snug">
            {milestone.title}
          </h3>

          <p className="text-xs text-beat-muted leading-relaxed">
            {milestone.description}
          </p>

          {/* Trainee Reflection Note Banner */}
          {milestone.traineeNote && (
            <div className="mt-3 rounded-xl bg-beat-canvas p-3 border border-beat-border text-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-beat-maroon/70">
                Trainee Reflection Note
              </p>
              <p className="mt-0.5 text-beat-maroon italic">
                &ldquo;{milestone.traineeNote}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Right: Gold Stamp OR Action Button */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
          <PassportStamp milestone={milestone} />

          {isReadyForReview && (
            <div className="text-xs text-beat-maroon flex items-center gap-1 font-semibold">
              <Clock className="h-3.5 w-3.5" />
              <span>In Trainer Queue</span>
            </div>
          )}

          {isInProgress && onRequestReview && (
            <button
              type="button"
              onClick={() => onRequestReview(milestone)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-beat-canvas px-3.5 py-2 text-xs font-bold text-beat-maroon border border-beat-border hover:border-beat-gold hover:bg-beat-gold/10 hover:text-beat-maroon transition-all cursor-pointer shadow-sm"
            >
              <Send className="h-3.5 w-3.5 text-beat-gold" />
              <span>Mark for Review</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
