import { getReviewQueueItems } from "@/lib/db/repositories/admin";
import { QueueItemCard } from "@/components/admin/QueueItemCard";
import { Inbox, CheckCircle2, Clock, Users, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReviewQueuePage() {
  const queueItems = await getReviewQueueItems();

  const uniqueTrainees = new Set(queueItems.map((item) => item.traineeId)).size;
  const uniqueBrands = new Set(
    queueItems.map((item) => item.trainee.restaurantBrand)
  ).size;

  return (
    <div className="space-y-6">
      {/* Page Title & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-beat-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-beat-maroon tracking-tight">
              Review Queue
            </h1>
            <span className="passport-stamp px-2.5 py-0.5 text-[9px] border-beat-gold text-beat-gold">
              BEAT Verification
            </span>
          </div>
          <p className="text-xs text-beat-muted mt-1">
            Actionable list of milestones flagged &ldquo;Ready for Review&rdquo; by trainees.
          </p>
        </div>

        {/* Quick Metrics Badges */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-2 rounded-2xl bg-beat-card px-4 py-2 border border-beat-border shadow-xs">
            <Clock className="h-4 w-4 text-amber-600" />
            <span className="font-extrabold text-beat-maroon">
              {queueItems.length}
            </span>
            <span className="text-beat-muted">Pending</span>
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-beat-card px-4 py-2 border border-beat-border shadow-xs">
            <Users className="h-4 w-4 text-beat-gold" />
            <span className="font-extrabold text-beat-maroon">
              {uniqueTrainees}
            </span>
            <span className="text-beat-muted">Trainees</span>
          </div>
        </div>
      </div>

      {/* Queue Items or Empty State */}
      {queueItems.length === 0 ? (
        <div className="rounded-3xl bg-beat-card p-12 text-center border border-beat-border shadow-sm space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-4 ring-emerald-100">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-extrabold text-beat-maroon">
              All Caught Up!
            </h3>
            <p className="text-xs text-beat-muted max-w-sm mx-auto">
              There are currently zero pending milestone submissions. New trainee verification requests will appear here in real time.
            </p>
          </div>
          <div className="pt-2">
            <span className="passport-stamp px-3 py-1 text-[10px] text-beat-gold border-beat-gold">
              Queue Cleared & Current
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {queueItems.map((item) => (
            <QueueItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
