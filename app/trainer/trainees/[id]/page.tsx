import { notFound } from "next/navigation";
import Link from "next/link";
import { getTraineePassportData } from "@/lib/db/repositories/trainee";
import { PassportCover } from "@/components/passport/PassportCover";
import { AdminPassportInspector } from "@/components/admin/AdminPassportInspector";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

interface TraineeDetailPageProps {
  params: {
    id: string;
  };
}

export default async function TraineeDetailPage({
  params,
}: TraineeDetailPageProps) {
  const data = await getTraineePassportData(params.id);

  if (!data) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumbs */}
      <div className="flex items-center justify-between pb-3 border-b border-beat-border">
        <Link
          href="/trainer/trainees"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-beat-maroon hover:text-beat-gold transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Trainee Directory</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="passport-stamp px-2.5 py-0.5 text-[9px] border-beat-gold text-beat-gold">
            Trainer Mode
          </span>
        </div>
      </div>

      {/* Trainee Passport Cover */}
      <PassportCover trainee={data.trainee} plan={data.plan} stats={data.stats} />

      {/* 5 Paths with Trainer Approval Controls */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-semibold text-beat-maroon tracking-tight">
            Development Paths & Sign-Offs
          </h2>
          <span className="text-xs font-semibold text-beat-muted">
            1-Click Trainer Approvals Active
          </span>
        </div>

        <AdminPassportInspector
          traineeId={data.trainee.id}
          paths={data.paths}
        />
      </div>
    </div>
  );
}
