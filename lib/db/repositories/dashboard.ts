import { prisma } from "../prisma";
import { aggregateCohortProgress, type CohortHeatmapData } from "@/lib/dashboard/cohorts";
import { summarizeHub } from "@/lib/dashboard/insights";
export type { CohortHeatmapData } from "@/lib/dashboard/cohorts";

export async function getCohortProgressHeatmap(): Promise<CohortHeatmapData[]> {
  const trainees = await prisma.trainee.findMany({
    where: { planAssignments: { some: { status: "ACTIVE" } } },
    select: {
      restaurantBrand: true, cohortBatch: true,
      planAssignments: {
        where: { status: "ACTIVE" }, orderBy: { assignedAt: "desc" }, take: 1,
        select: { planVersion: { select: { nodes: { select: { id: true } } } } },
      },
      progressRecords: { where: { isArchived: false, status: "VERIFIED" },
        select: { planNodeId: true, status: true, isArchived: true } },
    },
  });
  return aggregateCohortProgress(trainees);
}

export async function getHubInsights() {
  const [trainees, milestones, materials] = await Promise.all([
    prisma.trainee.findMany({ select: {
      createdAt: true, restaurantBrand: true, cohortBatch: true,
      contentView: { select: { firstViewedAt: true } },
      planAssignments: { where: { status: "ACTIVE" }, orderBy: { assignedAt: "desc" }, take: 1,
        select: { planVersion: { select: { nodes: { select: { id: true, path: true } } } } } },
      progressRecords: { where: { isArchived: false, status: { in: ["VERIFIED", "READY_FOR_REVIEW"] } },
        select: { planNodeId: true, status: true, isArchived: true, requestedAt: true } },
    } }),
    prisma.milestoneDefinition.count(), prisma.courseMaterial.count(),
  ]);
  return { ...summarizeHub(trainees), milestones, materials };
}
