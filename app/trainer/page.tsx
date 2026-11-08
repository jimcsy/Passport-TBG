import { getHubInsightsAction } from "@/lib/actions/dashboard";
import { HubInsights } from "@/components/admin/HubInsights";

export const dynamic = "force-dynamic";

export default async function TrainerHubPage() {
  const data = await getHubInsightsAction();
  return <div className="space-y-6">
    <header><h1 className="text-xl md:text-2xl font-semibold text-beat-maroon">Trainer hub</h1><p className="mt-2 text-sm text-beat-muted">Follow cohort progress and keep your trainees moving forward.</p></header>
    <HubInsights data={data} />
  </div>;
}
