import { Award, Check, Clock, MessageSquareText, Stamp } from "lucide-react";
import type { EnrichedMilestone } from "@/lib/db/repositories/trainee";

const reflectionPlaceholder = "Share what you learned during your shift, feedback from your store buddy, or practice notes...";

export function StampDetailCallout({ milestone, id }: { milestone: EnrichedMilestone | null; id: string }) {
  const verified = milestone?.status === "VERIFIED";
  const inReview = milestone?.status === "READY_FOR_REVIEW";
  const status = verified ? "Verified & Stamped" : inReview ? "In Review" : "Incomplete";

  return (
    <section id={id} aria-label="Stamp details" className="sticky bottom-4 z-20 max-h-[45dvh] overflow-y-auto rounded-2xl border border-beat-gold/40 bg-white p-5 font-sans text-beat-maroon shadow-lg shadow-beat-maroon/10 sm:p-6">
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
          <div className="min-w-0 rounded-xl border border-beat-gold/20 bg-beat-canvas p-4 sm:col-start-2 lg:col-start-auto">
            <h3 className="flex items-center gap-2 text-xs font-bold"><MessageSquareText className="h-4 w-4 shrink-0 text-beat-gold" />Trainee Reflection Note</h3>
            <p className={`mt-3 whitespace-pre-wrap break-words text-xs leading-relaxed ${milestone.traineeNote?.trim() ? "text-beat-maroon" : "italic text-beat-maroon/60"}`}>{milestone.traineeNote?.trim() || reflectionPlaceholder}</p>
            {!milestone.traineeNote?.trim() && <p className="mt-3 text-[10px] text-beat-maroon/60">No reflection submitted yet.</p>}
          </div>
        </div>
      )}
    </section>
  );
}
