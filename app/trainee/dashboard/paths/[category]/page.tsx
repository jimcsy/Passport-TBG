import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getTraineeSession } from "@/lib/auth/session";
import { getTraineePassportData } from "@/lib/db/repositories/trainee";
import { developmentPathSlug } from "@/lib/paths/navigation";
import { PathModules } from "@/components/trainee/PathModules";
import { StrobiBanner } from "@/components/trainee/StrobiBanner";

export default async function DevelopmentPathPage({ params }: { params: { category: string } }) {
  const session = await getTraineeSession();
  if (!session) redirect("/trainee");
  const data = await getTraineePassportData(session.id);
  if (!data) redirect("/auth/trainee-session-expired");
  const path = data.paths.find(track => developmentPathSlug(track.path) === params.category);
  if (!path) notFound();

  return <div className="space-y-6">
    <Link href="/trainee/dashboard" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-beat-maroon hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to dashboard</Link>
    <header>
      <p className="text-xs font-bold uppercase tracking-widest text-beat-maroon/60">Development path</p>
      <h1 className="mt-2 text-2xl font-bold text-beat-maroon">{path.title}</h1>
      <p className="mt-2 text-sm text-beat-maroon/70">{path.description}</p>
      <p className="mt-3 text-sm font-semibold text-beat-maroon">{path.verified}/{path.total} verified · {path.percent}% complete</p>
    </header>
    <StrobiBanner path={path.path} />
    <section aria-label={`${path.title} modules`} className="space-y-4">
      <h2 className="text-xl font-semibold text-beat-maroon">Modules</h2>
      <PathModules milestones={[...path.milestones].sort((a, b) => a.orderIndex - b.orderIndex)} />
    </section>
  </div>;
}
