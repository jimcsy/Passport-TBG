import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getTraineeSession } from "@/lib/auth/session";
import { getTraineePassportData } from "@/lib/db/repositories/trainee";
import { ModuleDetails } from "@/components/trainee/ModuleDetails";

export default async function ModulePage({ params }: { params: { id: string } }) {
  const session = await getTraineeSession();
  if (!session) redirect("/trainee");
  const data = await getTraineePassportData(session.id);
  if (!data) redirect("/trainee");
  const path = data.paths.find(track => track.milestones.some(m => m.id === params.id));
  const milestone =
    path?.milestones.find(m => m.id === params.id) ||
    data.archivedMilestones?.find(m => m.id === params.id);
  if (!milestone) notFound();

  return <div className="mx-auto max-w-3xl space-y-6">
    <Link href="/trainee/dashboard" className="inline-flex min-h-8 items-center gap-2 text-xs font-medium text-beat-maroon/70 hover:text-beat-maroon hover:underline hover:decoration-beat-gold hover:underline-offset-4"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to dashboard</Link>
    <header><p className="text-xs font-bold uppercase tracking-widest text-beat-maroon/60">{path?.title}</p><h1 className="mt-2 text-xl md:text-2xl font-bold text-beat-maroon">Module details</h1><p className="mt-2 text-sm text-beat-maroon/70">Review your milestone and send your reflection to your trainer.</p></header>
    <ModuleDetails milestone={milestone} />
  </div>;
}
