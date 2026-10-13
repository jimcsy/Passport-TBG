import { getTraineeDirectory } from "@/lib/db/repositories/admin";
import { TraineeFilterTable } from "@/components/admin/TraineeFilterTable";
import { Users, Award } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TraineesDirectoryPage() {
  const trainees = await getTraineeDirectory();

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-beat-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-beat-maroon tracking-tight">
              Trainee Directory
            </h1>
            <span className="passport-stamp px-2.5 py-0.5 text-[9px] border-beat-gold text-beat-gold">
              BEAT Cohorts
            </span>
          </div>
          <p className="text-xs text-beat-muted mt-1">
            Monitor employee training progress, branch assignments, and passport verification rates.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-beat-card px-4 py-2 border border-beat-border shadow-xs text-xs">
          <Users className="h-4 w-4 text-beat-gold" />
          <span className="font-extrabold text-beat-maroon">
            {trainees.length}
          </span>
          <span className="text-beat-muted">Total Trainees</span>
        </div>
      </div>

      {/* Directory Filter Table */}
      <TraineeFilterTable trainees={trainees} />
    </div>
  );
}
