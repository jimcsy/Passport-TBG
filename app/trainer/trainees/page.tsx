import { getTraineeDirectory } from "@/lib/db/repositories/admin";
import { TraineeFilterTable } from "@/components/admin/TraineeFilterTable";
import Link from "next/link";
import { Users, UserPlus } from "lucide-react";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function TraineesDirectoryPage({ searchParams }: { searchParams?: { brand?: string; cohort?: string } }) {
  const [trainees, publishedPlans] = await Promise.all([
    getTraineeDirectory(),
    prisma.trainingPlan.findMany({
      where: { status: "PUBLISHED" },
      include: {
        versions: {
          where: { status: "PUBLISHED" },
          orderBy: { versionNumber: "desc" },
          take: 1,
          include: {
            _count: { select: { nodes: true } },
          },
        },
      },
      orderBy: { title: "asc" },
    }),
  ]);

  const availablePlans = publishedPlans
    .filter((p) => p.versions[0])
    .map((p) => ({
      id: p.id,
      title: p.title,
      roleIdentifier: p.roleIdentifier,
      restaurantBrand: p.restaurantBrand,
      isDefault: p.isDefault,
      latestVersionId: p.versions[0].id,
      versionNumber: p.versions[0].versionNumber,
      milestoneCount: p.versions[0]._count.nodes,
    }));

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-beat-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-beat-maroon tracking-tight">
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

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/trainer/trainees/new"
            className="inline-flex items-center gap-2 rounded-xl bg-beat-maroon px-4 py-3 text-sm font-bold text-white hover:bg-beat-maroon-light shadow-sm"
          >
            <UserPlus className="h-4 w-4 text-beat-gold" />
            Register Trainee
          </Link>
          <div className="flex items-center gap-2 rounded-lg bg-beat-card px-4 py-2 border border-beat-border shadow-xs text-xs">
            <Users className="h-4 w-4 text-beat-gold" />
            <span className="font-semibold text-beat-maroon">
              {trainees.length}
            </span>
            <span className="text-beat-muted">Total Trainees</span>
          </div>
        </div>
      </div>

      {/* Directory Filter Table */}
      <TraineeFilterTable trainees={trainees} availablePlans={availablePlans} initialBrand={searchParams?.brand} initialCohort={searchParams?.cohort} />
    </div>
  );
}
