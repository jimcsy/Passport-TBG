import type { PrismaClient } from "@prisma/client";
import { createInstanceForVersion } from "../services/learning-paths";
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
export async function assignPlanToTrainee(input: AssignPlanInput, db: PrismaClient = prisma) {
  const validated = AssignPlanSchema.parse(input);

  return db.$transaction(async (tx) => {
    const instance = await createInstanceForVersion(tx, validated.traineeId, validated.planVersionId, validated.assignedById);
    const res = await reconcileTraineeToPlanVersion(
      validated.traineeId,
      instance.id,
      validated.assignedById,
      tx
    );

    const assignment = await tx.traineePlanAssignment.findUniqueOrThrow({
      where: {
        traineeId_planVersionId: {
          traineeId: validated.traineeId,
          planVersionId: instance.id,
        },
      },
      include: {
        planVersion: {
          include: { plan: true },
        },
      },
    });

    return { assignment, reconcileStats: res };
  }, { timeout: 60_000 });
}

/**
 * Bulk assigns a list of trainees to a plan version.
 */
export async function bulkAssignPlanToCohort(input: BulkAssignPlanInput, db: PrismaClient = prisma) {
  const validated = BulkAssignPlanSchema.parse(input);

  return db.$transaction(async (tx) => {
    let successCount = 0;
    for (const traineeId of [...validated.traineeIds].sort()) {
      const instance = await createInstanceForVersion(tx, traineeId, validated.planVersionId, validated.assignedById);
      await reconcileTraineeToPlanVersion(
        traineeId,
        instance.id,
        validated.assignedById,
        tx
      );
      successCount++;
    }

    return { assignedCount: successCount };
  }, { timeout: 60_000 });
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
  assignedById: string,
  db: PrismaClient = prisma
) {
  return db.$transaction(async (tx) => {
    const instance = await createInstanceForVersion(tx, traineeId, newPlanVersionId, assignedById);
    const res = await reconcileTraineeToPlanVersion(
      traineeId,
      instance.id,
      assignedById,
      tx
    );

    const assignment = await tx.traineePlanAssignment.findUniqueOrThrow({
      where: {
        traineeId_planVersionId: {
          traineeId,
          planVersionId: instance.id,
        },
      },
      include: {
        planVersion: {
          include: { plan: true },
        },
      },
    });

    return { assignment, reconcileStats: res };
  }, { timeout: 60_000 });
}
