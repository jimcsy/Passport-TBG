import { prisma } from "../prisma";
import {
  AssignPlanSchema,
  type AssignPlanInput,
  BulkAssignPlanSchema,
  type BulkAssignPlanInput,
} from "@/lib/validations/plans";
import { reconcileTraineeToPlanVersion } from "../services/reconcile";

/**
 * Assigns a trainee to a specific plan version, safely reconciling existing progress.
 */
export async function assignPlanToTrainee(input: AssignPlanInput) {
  const validated = AssignPlanSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const res = await reconcileTraineeToPlanVersion(
      validated.traineeId,
      validated.planVersionId,
      validated.assignedById,
      tx
    );

    const assignment = await tx.traineePlanAssignment.findUniqueOrThrow({
      where: {
        traineeId_planVersionId: {
          traineeId: validated.traineeId,
          planVersionId: validated.planVersionId,
        },
      },
      include: {
        planVersion: {
          include: { plan: true },
        },
      },
    });

    return { assignment, reconcileStats: res };
  });
}

/**
 * Bulk assigns a list of trainees to a plan version.
 */
export async function bulkAssignPlanToCohort(input: BulkAssignPlanInput) {
  const validated = BulkAssignPlanSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    let successCount = 0;
    for (const traineeId of validated.traineeIds) {
      await reconcileTraineeToPlanVersion(
        traineeId,
        validated.planVersionId,
        validated.assignedById,
        tx
      );
      successCount++;
    }

    return { assignedCount: successCount };
  });
}

/**
 * Retrieves the currently active plan assignment for a trainee.
 */
export async function getTraineeActivePlan(traineeId: string) {
  return prisma.traineePlanAssignment.findFirst({
    where: {
      traineeId,
      status: "ACTIVE",
    },
    include: {
      assignedBy: {
        select: { id: true, fullName: true, employeeId: true },
      },
      planVersion: {
        include: {
          plan: true,
          nodes: {
            orderBy: [{ path: "asc" }, { orderIndex: "asc" }],
          },
          edges: true,
        },
      },
    },
  });
}

/**
 * Changes a trainee's plan version and reconciles their progress.
 */
export async function changeTraineePlan(
  traineeId: string,
  newPlanVersionId: string,
  assignedById: string
) {
  return prisma.$transaction(async (tx) => {
    const res = await reconcileTraineeToPlanVersion(
      traineeId,
      newPlanVersionId,
      assignedById,
      tx
    );

    const assignment = await tx.traineePlanAssignment.findUniqueOrThrow({
      where: {
        traineeId_planVersionId: {
          traineeId,
          planVersionId: newPlanVersionId,
        },
      },
      include: {
        planVersion: {
          include: { plan: true },
        },
      },
    });

    return { assignment, reconcileStats: res };
  });
}
