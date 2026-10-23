import { prisma } from "../prisma";
import { aggregateCohortProgress, type CohortHeatmapData } from "@/lib/dashboard/cohorts";
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
