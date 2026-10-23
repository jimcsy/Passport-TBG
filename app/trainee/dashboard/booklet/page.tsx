import { StampNotificationToast } from "@/components/trainee/StampNotificationToast";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getTraineeSession } from "@/lib/auth/session";
import { getTraineePassportData } from "@/lib/db/repositories/trainee";
import { PassportBook } from "@/components/passport/PassportBook";

export default async function BookletPage() {
  const session = await getTraineeSession();
  if (!session) redirect("/trainee");
  const stampCursor = new Date().toISOString();
  const data = await getTraineePassportData(session.id);
  if (!data) redirect("/trainee");

  return (
      <div className="space-y-6">
        <StampNotificationToast initialTimestamp={stampCursor} />
        <Link href="/trainee/dashboard" className="inline-flex min-h-8 items-center gap-2 text-xs font-medium text-beat-maroon/70 hover:text-beat-maroon hover:underline hover:decoration-beat-gold hover:underline-offset-4"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to dashboard</Link>
        <div className="flex flex-wrap items-end justify-between gap-4 py-2">
          <div><h1 className="text-3xl font-semibold tracking-tight text-beat-maroon">My passport</h1><p className="mt-2 text-sm text-beat-maroon/70">Milestone stamps, trainer approvals, and reflections.</p></div>
          <div className="text-sm text-beat-maroon"><p className="font-bold">{data.trainee.fullName}</p><p className="mt-1 text-xs text-beat-maroon/60">{data.stats.verifiedCount} of {data.stats.totalMilestones} milestones verified · {data.stats.overallPercent}% complete</p></div>
        </div>
        <PassportBook data={data} />
        <p className="pb-6 text-center text-xs text-beat-maroon/60">Hover, focus, or tap any stamp to view its details and reflection below the booklet.</p>
      </div>
  );
}
