"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Check, Clock, Loader2, MessageSquareText, Send, Stamp } from "lucide-react";
import type { EnrichedMilestone } from "@/lib/db/repositories/trainee";
import { submitMilestoneForReview } from "@/lib/actions/progress";

const reflectionPlaceholder = "Share what you learned during your shift, feedback from your store buddy, or practice notes...";

export function StampDetailCallout({ milestone, id, onSubmittingChange, onQueued }: { milestone: EnrichedMilestone | null; id: string; onSubmittingChange: (pending: boolean) => void; onQueued: (milestoneId: string, note: string) => void }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const [feedback, setFeedback] = useState<{ id: string; message: string; error: boolean } | null>(null);
  const verified = milestone?.status === "VERIFIED";
  const inReview = milestone?.status === "READY_FOR_REVIEW";
  const locked = milestone?.status === "LOCKED";
  const canSubmit = milestone?.status === "IN_PROGRESS";
  const note = milestone ? drafts[milestone.id] ?? milestone.traineeNote ?? "" : "";
  const status = verified ? "Verified & Stamped" : inReview ? "In Review" : "Incomplete";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!milestone || !canSubmit || submitting.current) return;
    const submittedId = milestone.id;
    submitting.current = true;
    setPending(true);
    onSubmittingChange(true);
    setFeedback(null);
    try {
      const result = await submitMilestoneForReview(submittedId, note);
      if (result.success) {
        onQueued(submittedId, note.trim());
        setFeedback({ id: submittedId, message: "Submitted for review. Your milestone and reflection are now in the trainer’s Review Queue.", error: false });
      } else {
        setFeedback({ id: submittedId, message: result.error || "Could not submit your review request. Please try again.", error: true });
      }
      router.refresh();
    } catch {
      setFeedback({ id: submittedId, message: "Could not submit your review request. Please try again.", error: true });
    } finally {
      submitting.current = false;
      setPending(false);
      onSubmittingChange(false);
    }
  }

  return (
    <section id={id} aria-label="Stamp details" aria-busy={pending} className="rounded-lg border border-beat-gold/30 bg-white p-5 font-sans text-beat-maroon shadow-sm sm:p-6">
      {!milestone ? (
        <div className="flex items-center gap-4 py-2">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-beat-gold/50 bg-beat-canvas"><Stamp className="h-7 w-7 text-beat-gold" /></div>
          <div><h2 className="font-bold">Hover over a stamp</h2><p className="mt-1 text-xs leading-relaxed text-beat-maroon/70">Focus or tap any milestone stamp to view its status, trainer approval, and reflection note.</p></div>
        </div>
      ) : (
        <div className="grid items-start gap-5 sm:grid-cols-[112px_1fr] lg:grid-cols-[112px_1fr_1fr]">
          <div role="img" aria-label={`${status} stamp: ${milestone.code}`} className={`flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border-2 sm:h-28 sm:w-28 ${verified ? "border-beat-gold bg-beat-maroon text-beat-gold ring-4 ring-beat-gold/10" : "border-dashed border-beat-gold/50 bg-beat-canvas text-beat-maroon"}`}>
            {verified ? <Check className="h-9 w-9" /> : inReview ? <Clock className="h-8 w-8 text-beat-gold" /> : <Stamp className="h-8 w-8 text-beat-gold" />}
            <span className="mt-1 text-xs font-bold">{milestone.code}</span>
            <span className="mt-1 text-[8px] font-bold uppercase tracking-widest">{verified ? "BEAT verified" : inReview ? "In review" : "Incomplete"}</span>
          </div>
          <div className="min-w-0">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold ${verified ? "bg-beat-maroon text-beat-gold" : "bg-beat-gold/15 text-beat-maroon"}`}>{verified ? <Award className="h-3.5 w-3.5" /> : inReview ? <Clock className="h-3.5 w-3.5 text-beat-gold" /> : null}{status}</span>
            <h2 className="mt-3 break-words text-lg font-bold leading-snug">{milestone.title}</h2>
            <p className="mt-2 text-xs leading-relaxed text-beat-maroon/70">{milestone.description}</p>
            {verified ? (
              <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                <div><dt className="text-[10px] font-bold uppercase tracking-wide text-beat-maroon/60">Trainer name</dt><dd className="mt-1 font-semibold">{milestone.trainerName || "Not recorded"}</dd></div>
                <div><dt className="text-[10px] font-bold uppercase tracking-wide text-beat-maroon/60">Date approved</dt><dd className="mt-1 font-semibold">{milestone.verifiedAt ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" }).format(new Date(milestone.verifiedAt)) : "Not recorded"}</dd></div>
                <div className="sm:col-span-2"><dt className="text-[10px] font-bold uppercase tracking-wide text-beat-maroon/60">Signature · digital approval</dt><dd className="mt-1 border-b border-beat-gold/30 pb-2 text-base font-semibold italic">{milestone.trainerName || "Not recorded"}</dd>{milestone.trainerEmployeeId && <dd className="mt-1 text-[10px] text-beat-maroon/60">{milestone.trainerEmployeeId}</dd>}</div>
              </dl>
            ) : <p className="mt-4 text-xs text-beat-maroon/70">{inReview ? "Awaiting your trainer’s verification and stamp." : "Trainer approval will appear here once this milestone is verified."}</p>}
          </div>
          <form onSubmit={submit} className="min-w-0 rounded-xl border border-beat-gold/20 bg-beat-canvas p-4 sm:col-start-2 lg:col-start-auto">
            <h3 className="flex items-center gap-2 text-xs font-bold"><MessageSquareText className="h-4 w-4 shrink-0 text-beat-gold" />Trainee Reflection Note</h3>
            {canSubmit ? <>
              <label htmlFor={`${id}-reflection`} className="mt-3 block text-[11px] text-beat-maroon/70">Add a reflection for your trainer (optional)</label>
              <textarea id={`${id}-reflection`} rows={4} value={note} disabled={pending} onChange={event => setDrafts(previous => ({ ...previous, [milestone.id]: event.target.value }))} placeholder={reflectionPlaceholder} aria-describedby={`${id}-review-help`} className="mt-2 w-full resize-y rounded-lg border border-beat-gold/30 bg-white p-3 text-xs leading-relaxed text-beat-maroon placeholder:text-beat-maroon/50 disabled:opacity-60" />
            </> : <p className={`mt-3 whitespace-pre-wrap break-words text-xs leading-relaxed ${milestone.traineeNote?.trim() ? "text-beat-maroon" : "italic text-beat-maroon/60"}`}>{milestone.traineeNote?.trim() || "No reflection submitted."}</p>}
            <p id={`${id}-review-help`} className="mt-3 text-[11px] leading-relaxed text-beat-maroon/70">{verified ? "This milestone has already been approved by your trainer." : inReview ? "Your trainer can review your submission in the Review Queue." : locked ? "Ask your trainer to unlock this milestone before submitting." : "Submitting sends this milestone and your note to the trainer’s Review Queue."}</p>
            <button type="submit" disabled={!canSubmit || pending} className={`mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold disabled:cursor-default ${canSubmit ? "bg-beat-maroon text-white hover:bg-beat-maroon/90 disabled:opacity-60" : "border border-beat-gold/25 bg-white text-beat-maroon/60"}`}>
              {pending ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-beat-gold" /> : verified ? <Check aria-hidden="true" className="h-4 w-4 text-beat-gold" /> : inReview ? <Clock aria-hidden="true" className="h-4 w-4 text-beat-gold" /> : <Send aria-hidden="true" className="h-4 w-4 text-beat-gold" />}
              {pending ? "Submitting…" : verified ? "Verified & Stamped" : inReview ? "Awaiting trainer review" : locked ? "Milestone locked" : "Submit for review"}
            </button>
            {feedback?.id === milestone.id && <p role={feedback.error ? "alert" : "status"} className="mt-3 rounded-lg border border-beat-gold/30 bg-white p-3 text-xs leading-relaxed">{feedback.message}</p>}
          </form>
        </div>
      )}
    </section>
  );
}
