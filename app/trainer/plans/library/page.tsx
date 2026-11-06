import { TrainingContentHeader } from "@/components/admin/TrainingContentHeader";
import { MilestoneLibrary } from "@/components/admin/library/MilestoneLibrary";

export const dynamic = "force-dynamic";

export default function MilestoneLibraryPage() {
  return <div className="space-y-6">
    <TrainingContentHeader activeTab="library" />
    <MilestoneLibrary />
  </div>;
}
