import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
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
    <main className="min-h-screen bg-beat-canvas p-4 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-beat-gold/20 bg-white p-5">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-beat-maroon p-3 text-beat-gold"><BookOpen className="h-6 w-6" /></div><div><p className="font-bold text-beat-maroon">Growth Passport</p><p className="text-[10px] font-bold uppercase tracking-widest text-beat-maroon/60">The Bistro Group · BEAT Program</p></div></div>
          <Link href="/passport" className="inline-flex items-center gap-2 rounded-xl border border-beat-gold/30 px-4 py-2 text-xs font-bold text-beat-maroon hover:bg-beat-canvas"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link>
        </header>
        <div className="flex flex-wrap items-end justify-between gap-4 py-2">
          <div><p className="text-xs font-bold uppercase tracking-widest text-beat-maroon/60">Your digital mirror</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-beat-maroon">My growth passport</h1><p className="mt-2 text-sm text-beat-maroon/70">Every stamp is a step forward in your Bistro journey.</p></div>
          <div className="text-sm text-beat-maroon"><p className="font-bold">{data.trainee.fullName}</p><p className="mt-1 text-xs text-beat-maroon/60">{data.stats.verifiedCount} of {data.stats.totalMilestones} milestones verified · {data.stats.overallPercent}% complete</p></div>
        </div>
        <PassportBook data={data} />
        <p className="pb-6 text-center text-xs text-beat-maroon/60">Hover, focus, or tap any stamp to view its details and reflection below the booklet.</p>
      </div>
    </main>
  );
}
