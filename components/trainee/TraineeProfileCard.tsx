import { ChevronDown, GitBranch, UserRound } from "lucide-react";
import type { TraineePassportViewData } from "@/lib/db/repositories/trainee";

export function TraineeProfileCard({ data }: { data: TraineePassportViewData }) {
  const { trainee, stats, plan } = data;
  const fields = [
    ["Department", trainee.department || "Not specified"],
    ["Position", trainee.position || trainee.jobRole || "Not specified"],
    ["Brand", trainee.restaurantBrand],
    ["Branch", trainee.branchLocation],
    ["Batch", trainee.cohortBatch],
    ["Hire date", new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" }).format(new Date(trainee.hireDate))],
  ];

  return <section aria-label="Trainee profile and progress" className="min-w-0 overflow-hidden rounded-2xl border border-beat-gold/25 bg-white shadow-sm">
    <div className="flex items-center gap-3 p-4 text-beat-maroon">
      <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-beat-maroon/5"><UserRound className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1"><span className="block break-words text-sm font-semibold leading-snug">{trainee.fullName}</span><span className="mt-1 block break-all text-[11px] text-beat-maroon/60">{trainee.traineeCode}</span></span>
    </div>
    <div className="space-y-5 border-t border-beat-gold/15 px-4 pb-5 pt-4">
      <section aria-label="Completion statistics" className="space-y-3">
        <div className="flex items-center justify-between text-xs"><h2 className="font-semibold text-beat-maroon">Learning progress</h2><span className="font-bold text-beat-maroon">{stats.overallPercent}% complete</span></div>
        <div role="progressbar" aria-label="Overall completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={stats.overallPercent} className="h-2 overflow-hidden rounded-full bg-beat-gold/15"><div className="h-full rounded-full bg-beat-gold" style={{ width: `${stats.overallPercent}%` }} /></div>
        <div className="grid grid-cols-3 gap-2 text-center text-beat-maroon">
          {[[String(stats.totalMilestones), "Milestones"], [`${stats.verifiedCount}/${stats.totalMilestones}`, "Verified"], [String(stats.readyForReviewCount), "In review"]].map(([value, label]) => <div key={label} className="min-w-0 rounded-lg bg-beat-canvas px-1 py-3"><span className="block text-base font-bold">{value}</span><span className="mt-1 block text-[10px] text-beat-maroon/65">{label}</span></div>)}
        </div>
      </section>
      <details aria-label="Full profile details" className="group border-t border-beat-gold/15">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 text-xs font-semibold text-beat-maroon [&::-webkit-details-marker]:hidden"><span className="group-open:hidden">Full profile</span><span className="hidden group-open:inline">Hide full profile</span><ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" /></summary>
        <div className="space-y-5 pt-2">
      <dl className="grid grid-cols-1 gap-x-4 gap-y-4 min-[360px]:grid-cols-2">
        {fields.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-[10px] font-semibold uppercase tracking-wide text-beat-maroon/55">{label}</dt><dd className="mt-1 break-words text-xs font-medium leading-relaxed text-beat-maroon">{value}</dd></div>)}
      </dl>
      <section aria-label="Assigned training plan" className="border-t border-beat-gold/15 pt-4 text-beat-maroon">
        <h2 className="flex items-center gap-2 text-xs font-semibold"><GitBranch aria-hidden="true" className="h-4 w-4 text-beat-gold" />Assigned training plan</h2>
        {plan ? <><p className="mt-2 break-words text-sm font-semibold">{plan.title}</p><p className="mt-1 break-all text-[11px] text-beat-maroon/60">Version {plan.versionNumber} · {plan.roleIdentifier}</p></> : <p className="mt-2 text-xs text-beat-maroon/65">No training plan assigned yet. Ask your trainer to assign one.</p>}
        {data.archivedMilestones.length > 0 && <p className="mt-2 text-xs font-medium text-beat-maroon/65">{data.archivedMilestones.length} preserved endorsements</p>}
      </section>
        </div>
      </details>
    </div>
  </section>;
}
