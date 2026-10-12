import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getTraineeSession } from "@/lib/auth/session";
import { getTraineePassportData } from "@/lib/db/repositories/trainee";
import { PassportBook } from "@/components/passport/PassportBook";

export default async function BookletPage() {
  const session = await getTraineeSession();
  if (!session) redirect("/");
  const data = await getTraineePassportData(session.id);
  if (!data) redirect("/");

  return (
      <div className="space-y-6">
        <Link href="/passport" className="inline-flex min-h-8 items-center gap-2 text-xs font-medium text-beat-maroon/70 hover:text-beat-maroon hover:underline hover:decoration-beat-gold hover:underline-offset-4"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to dashboard</Link>
        <div className="flex flex-wrap items-end justify-between gap-4 py-2">
          <div><p className="text-xs font-bold uppercase tracking-widest text-beat-maroon/60">Your digital mirror</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-beat-maroon">My growth passport</h1><p className="mt-2 text-sm text-beat-maroon/70">Every stamp is a step forward in your Bistro journey.</p></div>
          <div className="text-sm text-beat-maroon"><p className="font-bold">{data.trainee.fullName}</p><p className="mt-1 text-xs text-beat-maroon/60">{data.stats.verifiedCount} of {data.stats.totalMilestones} milestones verified · {data.stats.overallPercent}% complete</p></div>
        </div>
        <PassportBook data={data} />
        <p className="pb-6 text-center text-xs text-beat-maroon/60">Hover, focus, or tap any stamp to view its details and reflection below the booklet.</p>
      </div>
  );
}
