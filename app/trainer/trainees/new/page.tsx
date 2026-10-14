import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAdminSession } from "@/lib/auth/session";
import { TraineeRegistrationForm } from "@/components/admin/TraineeRegistrationForm";
import { getTraineeDirectory } from "@/lib/db/repositories/admin";
import { prisma } from "@/lib/db/prisma";

export default async function NewTraineePage() {
  if (!(await getAdminSession())) redirect("/trainer/login");

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

  const existingRoles = Array.from(
    new Set(trainees.map((t) => t.jobRole).filter(Boolean) as string[])
  );
  const standardRoles = [
    "Barista",
    "Kitchen Staff",
    "Floor Server",
    "Store Supervisor",
    "Bartender",
    "Host / Hostess",
    "Line Cook",
    "Shift Manager",
  ];
  const allRoles = Array.from(new Set([...standardRoles, ...existingRoles])).sort();

  const options = {
    jobRole: allRoles,
    restaurantBrand: Array.from(new Set(trainees.map((t) => t.restaurantBrand))).sort(),
    branchLocation: Array.from(new Set(trainees.map((t) => t.branchLocation))).sort(),
    cohortBatch: Array.from(new Set(trainees.map((t) => t.cohortBatch))).sort(),
  };

  const planOptions = publishedPlans
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
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/trainer/trainees"
        className="inline-flex items-center gap-2 text-sm font-semibold text-beat-maroon hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to directory
      </Link>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-beat-gold">
          Trainee registration
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-beat-maroon">
          Start a new Growth Passport
        </h1>
        <p className="mt-3 text-sm leading-6 text-beat-muted">
          Register a trainee, assign their role, and select their customized BEAT training plan.
        </p>
      </div>
      <TraineeRegistrationForm options={options} plans={planOptions} />
    </div>
  );
}
