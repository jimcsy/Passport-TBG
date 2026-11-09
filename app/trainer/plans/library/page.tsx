import { TrainingContentHeader } from "@/components/admin/TrainingContentHeader";
import { MilestoneLibrary } from "@/components/admin/library/MilestoneLibrary";

import { getStrobiConfiguration } from "@/lib/ai/strobi-config";

export const dynamic = "force-dynamic";

export default function MilestoneLibraryPage() {
  const configuration = getStrobiConfiguration();
  const availability = configuration.available ? "available" : configuration.reason;
  return <div className="space-y-6">
    <TrainingContentHeader activeTab="library" />
    <MilestoneLibrary strobiAvailability={availability} />
  </div>;
}
