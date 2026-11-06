import Link from "next/link";
import { TrainingContentHeader } from "@/components/admin/TrainingContentHeader";

/** Navigation landing; library browsing and inspection are delivered in TC-05/TC-06. */
export default function MilestoneLibraryPage() {
  return <div className="space-y-6">
    <TrainingContentHeader activeTab="library" />
    <section aria-labelledby="milestone-library-heading" className="max-w-2xl space-y-3 py-2">
      <h2 id="milestone-library-heading" className="text-lg font-semibold text-beat-maroon">Milestone Library</h2>
      <p className="text-sm leading-relaxed text-beat-maroon/75">Milestones and their materials are shared across training plans. You can currently manage them by opening a plan in the Full Path Builder.</p>
      <Link href="/trainer/plans" className="inline-flex min-h-11 items-center text-sm font-semibold text-beat-maroon underline decoration-beat-gold underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-beat-maroon">Open training plans</Link>
    </section>
  </div>;
}
