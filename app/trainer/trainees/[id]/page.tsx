import { prisma } from "@/lib/db/prisma";
import { CreateIndividualPathButton } from "@/components/admin/CreateIndividualPathButton";
import { VariantEditor } from "@/components/admin/VariantEditor";
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

  const path = data.plan ? await prisma.learningPath.findUnique({ where: { planId: data.plan.id } }) : null;
  const instance = path?.type === "INSTANCE" && path.traineeId === data.trainee.id ? path : null;

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

      {instance && <section aria-label="Active path instance" className="rounded-xl border border-beat-border bg-white p-5">
        <p className="text-xs font-bold uppercase text-beat-gold">Active individual path</p>
        <h2 className="mt-2 font-semibold text-beat-maroon">{instance.title}</h2>
        <p className="my-3 text-sm text-beat-muted">Version {data.plan?.versionNumber}. Customizations belong to this trainee; promoting copies the active published nodes into a reusable draft.</p>
        <div className="flex flex-wrap gap-3"><Link className="beat-control" href={`/trainer/plans/${instance.planId}/builder`}>Customize Individual Path</Link><VariantEditor instanceId={instance.id} defaultDepartment={data.trainee.department || ""} defaultPosition={data.trainee.position || ""} /></div>
      </section>}
      {data.plan && !instance && <section className="rounded-xl border border-beat-border bg-white p-5" aria-label="Existing shared path">
        <h2 className="font-semibold text-beat-maroon">{data.plan.title}</h2>
        <p className="my-3 text-sm text-beat-muted">This trainee has an existing shared assignment. Create a private snapshot to customize or promote it. Their progress and awarded stamps will be retained.</p>
        <CreateIndividualPathButton traineeId={data.trainee.id} />
      </section>}
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
