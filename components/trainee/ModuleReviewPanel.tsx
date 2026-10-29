"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { EnrichedMilestone } from "@/lib/db/repositories/trainee";
import { submitMilestoneForReview } from "@/lib/actions/progress";

export function ModuleReviewPanel({ milestone }: { milestone: EnrichedMilestone }) {
  const router = useRouter();
  const id = useId();
  const [note, setNote] = useState(milestone.traineeNote ?? "");
  const [queued, setQueued] = useState(false);
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(null);
  const verified = milestone.status === "VERIFIED";
  const inReview = queued || milestone.status === "READY_FOR_REVIEW";
  const canSubmit = milestone.status === "IN_PROGRESS" && !queued;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit || lock.current) return;
    lock.current = true;
    setPending(true);
    setFeedback(null);
    try {
      const result = await submitMilestoneForReview(milestone.id, note);
      if (result.success) {
        setQueued(true);
        setFeedback({ message: "Submitted for review. Your milestone and reflection are now in the trainer’s Review Queue.", error: false });
        router.refresh();
      } else setFeedback({ message: result.error || "Could not submit your review request. Please try again.", error: true });
    } catch {
      setFeedback({ message: "Could not submit your review request. Please try again.", error: true });
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  return <section aria-labelledby={`${id}-title`} aria-busy={pending} className="rounded-xl border border-beat-gold/30 bg-white p-5 text-beat-maroon sm:p-6">
    <h2 id={`${id}-title`} className="text-lg font-bold">Review &amp; feedback</h2>
    <div className="mt-4 grid gap-6 md:grid-cols-2">
      <div className="space-y-4 text-sm">
        <p>{verified ? "Verified & Stamped" : inReview ? "Awaiting your trainer’s verification and stamp." : canSubmit ? "Explore the course materials above, then share your reflection and request trainer review." : "Ask your trainer to unlock this milestone before submitting."}</p>
        {verified && <dl className="space-y-3">
          <div><dt className="font-semibold">Trainer name</dt><dd>{milestone.trainerName || "Not recorded"}</dd></div>
          <div><dt className="font-semibold">Date approved</dt><dd>{milestone.verifiedAt ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(milestone.verifiedAt)) : "Not recorded"}</dd></div>
          <div><dt className="font-semibold">Verification hash</dt><dd className="font-mono">{milestone.verificationHash?.slice(0, 8) || "Not recorded"}</dd></div>
          <div><dt className="font-semibold">Signature · digital approval</dt><dd className="italic">{milestone.trainerName || "Not recorded"}</dd>{milestone.trainerEmployeeId && <dd>{milestone.trainerEmployeeId}</dd>}</div>
        </dl>}
        {milestone.trainerNote && <div><h3 className="font-semibold">Trainer feedback</h3><p className="mt-1 whitespace-pre-wrap break-words">{milestone.trainerNote}</p></div>}
      </div>
      <form onSubmit={submit} className="min-w-0 rounded-xl border border-beat-gold/20 bg-beat-canvas p-4">
        <h3 className="text-sm font-bold">Trainee Reflection Note</h3>
        {canSubmit ? <>
          <label htmlFor={`${id}-reflection`} className="mt-3 block text-xs">Add a reflection for your trainer (optional)</label>
          <textarea id={`${id}-reflection`} value={note} onChange={event => setNote(event.target.value)} disabled={pending} rows={4} placeholder="Share what you learned during your shift, feedback from your store buddy, or practice notes..." className="mt-2 w-full resize-y rounded-lg border border-beat-gold/30 bg-white p-3 text-sm disabled:opacity-60" />
        </> : <p className="mt-3 whitespace-pre-wrap break-words text-sm">{(queued ? note : milestone.traineeNote)?.trim() || "No reflection submitted."}</p>}
        <p className="mt-3 text-xs">{canSubmit ? "Submitting sends this milestone and your note to the trainer’s Review Queue." : inReview ? "Your trainer can review your submission in the Review Queue." : verified ? "This milestone has already been approved by your trainer." : "This milestone is locked."}</p>
        <button type="submit" disabled={!canSubmit || pending} className="mt-4 min-h-11 w-full rounded-lg bg-beat-maroon px-4 py-3 text-sm font-semibold text-white disabled:cursor-default disabled:opacity-60">{pending ? "Submitting…" : verified ? "Verified & Stamped" : inReview ? "Awaiting trainer review" : canSubmit ? "Submit for review" : "Milestone locked"}</button>
        {feedback && <p role={feedback.error ? "alert" : "status"} className="mt-3 text-sm">{feedback.message}</p>}
      </form>
    </div>
  </section>;
}
