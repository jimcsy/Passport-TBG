import { getBatchToolData } from "@/lib/db/repositories/admin";
import { BatchSignOffTool } from "@/components/admin/BatchSignOffTool";
import { CheckSquare, Award } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BatchSignOffPage() {
  const data = await getBatchToolData();

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-beat-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-beat-maroon tracking-tight">
              Batch Attendance & Bulk Sign-Off
            </h1>
            <span className="passport-stamp px-2.5 py-0.5 text-[9px] border-beat-gold text-beat-gold">
              Cohort Tools
            </span>
          </div>
          <p className="text-xs text-beat-muted mt-1">
            Conduct multi-trainee sign-offs and classroom session attendance logs across restaurant cohorts.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-beat-card px-4 py-2 border border-beat-border shadow-xs text-xs">
          <CheckSquare className="h-4 w-4 text-beat-gold" />
          <span className="font-extrabold text-beat-maroon">
            {data.trainees.length}
          </span>
          <span className="text-beat-muted">Eligible Trainees</span>
        </div>
      </div>

      {/* Batch Tool Form */}
      <BatchSignOffTool data={data} />
    </div>
  );
}
