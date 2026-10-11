"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Sparkles, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { submitMilestoneForReview } from "@/lib/actions/progress";
import type { EnrichedMilestone } from "@/lib/db/repositories/trainee";

interface ReadyForReviewModalProps {
  milestone: EnrichedMilestone | null;
  onClose: () => void;
}

export function ReadyForReviewModal({
  milestone,
  onClose,
}: ReadyForReviewModalProps) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!milestone) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await submitMilestoneForReview(milestone.id, note);
      if (result.success) {
        setIsSuccess(true);
        setTimeout(() => {
          onClose();
          router.refresh();
        }, 1200);
      } else {
        setError(result.error || "Failed to submit for review.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-beat-border animate-in zoom-in-95">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="absolute top-5 right-5 rounded-full p-1.5 text-beat-muted hover:text-beat-maroon hover:bg-beat-canvas transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {isSuccess ? (
          <div className="py-8 flex flex-col items-center text-center space-y-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-extrabold text-beat-maroon">
              Ready for Review Submitted!
            </h3>
            <p className="text-xs text-beat-muted max-w-sm">
              Your milestone is now queued for your store trainer&#39;s review and official gold seal stamp.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Modal Header */}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black text-beat-gold bg-beat-maroon/5 px-2.5 py-0.5 rounded-md border border-beat-border">
                  {milestone.code}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-beat-maroon">
                  Self-Service Verification Request
                </span>
              </div>
              <h2 className="mt-2 text-xl font-extrabold text-beat-maroon leading-snug">
                {milestone.title}
              </h2>
              <p className="mt-1 text-xs text-beat-muted leading-relaxed">
                {milestone.description}
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {/* Reflection Note Input */}
            <div>
              <label
                htmlFor="reflectionNote"
                className="block text-xs font-bold uppercase tracking-wider text-beat-maroon mb-1.5"
              >
                Reflection & Shift Notes (Optional)
              </label>
              <textarea
                id="reflectionNote"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                disabled={isPending}
                placeholder="Share what you learned during your shift, feedback from your store buddy, or practice notes..."
                className="w-full rounded-2xl border border-beat-border bg-beat-canvas p-3.5 text-xs text-[#2B1810] placeholder:text-beat-muted/60 focus:border-beat-gold focus:outline-none focus:ring-2 focus:ring-beat-gold/20 transition-all resize-none"
              />
              <p className="mt-1 text-[11px] text-beat-muted">
                Your notes will be visible to your trainer when they inspect the review queue.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded-xl border border-beat-border px-4 py-2.5 text-xs font-bold text-beat-muted hover:bg-beat-canvas hover:text-beat-maroon transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-xl bg-beat-maroon px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-beat-maroon-light active:bg-beat-maroon-dark transition-all disabled:opacity-70 cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-beat-gold" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-beat-gold" />
                    <span>Send for Trainer Review</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
