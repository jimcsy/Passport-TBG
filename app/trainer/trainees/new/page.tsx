import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAdminSession } from "@/lib/auth/session";
import { TraineeRegistrationForm } from "@/components/admin/TraineeRegistrationForm";
import { getTraineeDirectory } from "@/lib/db/repositories/admin";

export default async function NewTraineePage() {
  if (!await getAdminSession()) redirect("/trainer/login");
  const trainees = await getTraineeDirectory();
  const options = {
    restaurantBrand: Array.from(new Set(trainees.map(t => t.restaurantBrand))).sort(),
    branchLocation: Array.from(new Set(trainees.map(t => t.branchLocation))).sort(),
    cohortBatch: Array.from(new Set(trainees.map(t => t.cohortBatch))).sort(),
  };
  return <div className="mx-auto max-w-3xl space-y-6">
    <Link href="/trainer/trainees" className="inline-flex items-center gap-2 text-sm font-semibold text-beat-maroon hover:underline"><ArrowLeft className="h-4 w-4" />Back to directory</Link>
    <div><p className="text-xs font-bold uppercase tracking-wider text-beat-gold">Trainee registration</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-beat-maroon">Start a new Growth Passport</h1><p className="mt-3 text-sm leading-6 text-beat-muted">Register one trainee and assign their restaurant, branch, and cohort. Their passport starts with all training milestones ready to begin.</p></div>
    <TraineeRegistrationForm options={options} />
  </div>;
}
