import Link from "next/link";
import { getHubDashboardDataAction } from "@/lib/actions/dashboard";
import { CohortProgressHeatmap } from "@/components/admin/CohortProgressHeatmap";

export const dynamic = "force-dynamic";

export default async function TrainerHubPage() {
  const cohorts = await getHubDashboardDataAction();
  return <div className="space-y-6">
    <header><h1 className="text-xl md:text-2xl font-semibold text-beat-maroon">Trainer hub</h1><p className="mt-2 text-sm text-beat-muted">Follow cohort progress and keep your trainees moving forward.</p></header>
    <nav aria-label="Trainer tools" className="grid gap-3 sm:grid-cols-3">{[
      ["/trainer/queue", "Verifications", "Review submissions and stamp passports."],
      ["/trainer/plans", "Training plans", "Build and publish learning paths."],
      ["/trainer/trainees", "Trainee directory", "Manage trainees and plan assignments."],
    ].map(([href, title, description]) => <Link key={href} href={href} className="rounded-xl border border-beat-border bg-white p-5 text-beat-maroon hover:border-beat-gold"><span className="font-semibold">{title} →</span><span className="mt-2 block text-xs text-beat-muted">{description}</span></Link>)}</nav>
    <CohortProgressHeatmap data={cohorts} />
  </div>;
}
