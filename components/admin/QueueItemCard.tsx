"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Building2,
  MapPin,
  Loader2,
  MessageSquare,
  Award,
} from "lucide-react";
import { verifyMilestone } from "@/lib/actions/progress";
import type { ReviewQueueItem } from "@/lib/db/repositories/admin";

interface QueueItemCardProps {
  item: ReviewQueueItem;
  focused?: boolean;
}

export function QueueItemCard({ item, focused = false }: QueueItemCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(focused);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!focused) return;
    setExpanded(true);
    panel.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" });
    panel.current?.focus({ preventScroll: true });
  }, [focused]);
  const [error, setError] = useState<string | null>(null);
  const [trainerNote, setTrainerNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isVerified, setIsVerified] = useState(false);

  const formattedDate = item.requestedAt
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
      }).format(new Date(item.requestedAt))
    : "Recently";

  const handleVerify = () => {
    setError(null);
    startTransition(async () => {
      const res = await verifyMilestone(
        item.traineeId,
        item.milestoneId,
        trainerNote
      );
      if (!res.success) setError(res.error || "Unable to verify milestone. Please try again.");
      if (res.success) {
        setIsVerified(true);
        setTimeout(() => {
          router.refresh();
        }, 800);
      }
    });
  };

  if (isVerified) {
    return (
      <div className="rounded-xl bg-beat-gold/10 p-6 border border-beat-gold/30 flex items-center justify-between gap-4 animate-in fade-out duration-700">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-beat-gold/10 text-beat-maroon">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-beat-maroon">
              Stamped & Verified!
            </h4>
            <p className="text-xs text-beat-maroon">
              {item.trainee.fullName} • {item.milestone.code}
            </p>
          </div>
        </div>
        <span className="passport-stamp px-3 py-1 text-[10px] text-beat-gold border-beat-gold">
          Gold Seal Applied
        </span>
      </div>
    );
  }

  return (
    <div ref={panel} id={`review-${item.id}`} tabIndex={-1} className={`scroll-mt-6 outline-none focus-visible:ring-2 focus-visible:ring-beat-gold ${focused ? "ring-2 ring-beat-gold" : ""} rounded-xl bg-beat-card p-3 md:p-5 shadow-sm border border-beat-border space-y-4 hover:border-beat-gold/50 transition-all`}>
      {/* Top Header: Trainee Identity & Submission Time */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-beat-border">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-mono text-xs font-semibold text-beat-gold bg-beat-maroon/5 px-2.5 py-0.5 rounded-md border border-beat-border">
            {item.trainee.traineeCode}
          </span>
          <h3 className="text-base font-semibold text-beat-maroon">
            {item.trainee.fullName}
          </h3>
          <span className="hidden sm:inline-block text-xs text-beat-muted">•</span>
          <span className="text-xs font-semibold text-beat-maroon/80 flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5 text-beat-gold" />
            {item.trainee.restaurantBrand}
          </span>
          <span className="text-xs text-beat-muted flex items-center gap-1">
            <MapPin className="h-3 w-3 text-beat-muted" />
            {item.trainee.branchLocation}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-beat-muted">
          <Clock className="h-3.5 w-3.5 text-beat-maroon" />
          <span>Submitted {formattedDate}</span>
        </div>
      </div>

      <button type="button" aria-expanded={expanded} aria-controls={`queue-detail-${item.id}`} onClick={() => setExpanded(value => !value)} className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm font-semibold text-beat-maroon"><span className="min-w-0 break-words">{item.milestone.code}: {item.milestone.title}</span><span className="shrink-0">{expanded ? "− Hide details" : "+ Review details"}</span></button>
      {expanded && <div id={`queue-detail-${item.id}`} className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3 text-xs text-beat-muted"><span>{item.trainee.email} · {item.trainee.cohortBatch}</span><Link href={`/trainer/trainees/${item.traineeId}`} className="font-semibold text-beat-maroon underline">View passport</Link></div>
      {/* Middle: Milestone Details */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-beat-gold/10 text-beat-maroon border border-beat-gold/30">
            {item.milestone.code}
          </span>
          <span className="text-xs font-bold text-beat-gold uppercase tracking-wider">
            {item.milestone.path}
          </span>
        </div>

        <h4 className="text-sm font-semibold text-beat-maroon">
          {item.milestone.title}
        </h4>
        <p className="text-xs text-beat-muted leading-relaxed">
          {item.milestone.description}
        </p>

        {/* Trainee Reflection Note */}
        {item.traineeNote && (
          <div className="mt-3 rounded-lg bg-beat-canvas p-3.5 border border-beat-border text-xs">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-beat-maroon">
              <MessageSquare className="h-3 w-3 text-beat-gold" />
              <span>Trainee Reflection Note:</span>
            </div>
            <p className="mt-1 text-beat-maroon italic">
              &ldquo;{item.traineeNote}&rdquo;
            </p>
          </div>
        )}

        {/* Optional Trainer Feedback Note input */}
        {showNoteInput && (
          <div className="mt-3 animate-in fade-in">
            <label
              htmlFor={`trainer-note-${item.id}`}
              className="block text-[10px] font-bold uppercase tracking-wider text-beat-maroon mb-1"
            >
              Add Trainer Feedback Note (Optional):
            </label>
            <input
              id={`trainer-note-${item.id}`}
              type="text"
              value={trainerNote}
              onChange={(e) => setTrainerNote(e.target.value)}
              placeholder="e.g. Excellent station preparation during the lunch rush."
              className="w-full rounded-xl border border-beat-border bg-beat-canvas px-3.5 py-2 text-xs text-beat-maroon focus:border-beat-gold focus:outline-none focus:ring-1 focus:ring-beat-gold"
            />
          </div>
        )}
      </div>

      {error && <p role="alert" className="text-sm text-beat-maroon">{error}</p>}
      {/* Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-beat-border">
        <button
          type="button"
          onClick={() => setShowNoteInput(!showNoteInput)}
          className="text-xs font-semibold text-beat-gold hover:text-beat-gold-dark transition-colors cursor-pointer"
        >
          {showNoteInput ? "− Hide feedback note" : "+ Add feedback note"}
        </button>

        <button
          type="button"
          onClick={handleVerify}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-beat-maroon px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-beat-maroon-light active:bg-beat-maroon-dark transition-all disabled:opacity-70 cursor-pointer group"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-beat-gold" />
              <span>Stamping Passport...</span>
            </>
          ) : (
            <>
              <Award className="h-4 w-4 text-beat-gold transition-transform group-hover:scale-110" />
              <span>1-Click Verify & Stamp</span>
            </>
          )}
        </button>
      </div>
      </div>}
    </div>
  );
}
