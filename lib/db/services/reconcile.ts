import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../prisma";
import { MilestoneStatus } from "@/lib/types/models";

export interface ReconcileResult {
  migratedTraineesCount: number;
  preservedProgressCount: number;
  archivedProgressCount: number;
  injectedProgressCount: number;
}

type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Reconciles a single trainee from their current active plan version to a new plan version.
 * Preserves completed/in-review milestones, archives deleted milestones, and injects new ones.
 */
export async function reconcileTraineeToPlanVersion(
  traineeId: string,
  newPlanVersionId: string,
  assignedById: string,
  db: DbClient = prisma
): Promise<{
  preserved: number;
  archived: number;
  injected: number;
}> {
  // 1. Fetch current active plan assignment
  const activeAssignment = await db.traineePlanAssignment.findFirst({
    where: { traineeId, status: "ACTIVE" },
    include: {
      planVersion: {
        include: { nodes: true },
      },
    },
  });

  // 2. Fetch new plan version with nodes
  const newVersion = await db.planVersion.findUnique({
    where: { id: newPlanVersionId },
    include: { nodes: true, plan: true },
  });

  if (!newVersion) {
    throw new Error(`Target PlanVersion ${newPlanVersionId} not found.`);
  }

  const validAssignedById =
    assignedById ||
    newVersion.publishedById ||
    newVersion.plan?.createdById ||
    activeAssignment?.assignedById ||
    "system";

  const oldNodes = activeAssignment?.planVersion.nodes || [];
  const newNodes = newVersion.nodes;

  // Build match map: oldNode.id -> newNode
  const matchMap = new Map<string, typeof newNodes[0]>();
  for (const oldNode of oldNodes) {
    const matched = newNodes.find(
      (n) =>
        (oldNode.libraryMilestoneId && n.libraryMilestoneId === oldNode.libraryMilestoneId) ||
        n.code.toUpperCase() === oldNode.code.toUpperCase()
    );
    if (matched) {
      matchMap.set(oldNode.id, matched);
    }
  }

  // 3. Fetch existing progress records for the trainee
  const existingProgress = await db.traineeProgress.findMany({
    where: { traineeId },
  });
  const progressByNodeId = new Map(existingProgress.map((p) => [p.planNodeId, p]));

  let preserved = 0;
  let archived = 0;
  let injected = 0;

  // Process matched nodes and remapped progress
  const handledNewNodeIds = new Set<string>();

  for (const oldNode of oldNodes) {
    const prog = progressByNodeId.get(oldNode.id);
    if (!prog) continue;

    const matchedNewNode = matchMap.get(oldNode.id);

    if (matchedNewNode) {
      handledNewNodeIds.add(matchedNewNode.id);
      // Remap progress to new node if different node id
      if (oldNode.id !== matchedNewNode.id) {
        await db.traineeProgress.upsert({
          where: {
            traineeId_planNodeId: {
              traineeId,
              planNodeId: matchedNewNode.id,
            },
          },
          update: {
            status: prog.status,
            traineeNote: prog.traineeNote,
            requestedAt: prog.requestedAt,
            verifiedBy: prog.verifiedBy,
            verifiedAt: prog.verifiedAt,
            trainerNote: prog.trainerNote,
            isArchived: false,
            archivedReason: null,
          },
          create: {
            traineeId,
            planNodeId: matchedNewNode.id,
            status: prog.status,
            traineeNote: prog.traineeNote,
            requestedAt: prog.requestedAt,
            verifiedBy: prog.verifiedBy,
            verifiedAt: prog.verifiedAt,
            trainerNote: prog.trainerNote,
            isArchived: false,
          },
        });

        // Clean up old version node progress now that state is remapped to new version
        await db.traineeProgress.delete({
          where: { id: prog.id },
        });

        preserved++;
      }
    } else {
      // Node was deleted/removed in the new version
      // Preserve record by soft-archiving without losing verification audit logs
      if (!prog.isArchived) {
        await db.traineeProgress.update({
          where: { id: prog.id },
          data: {
            isArchived: true,
            archivedReason: "REMOVED_FROM_UPDATED_PLAN",
          },
        });
        archived++;
      }
    }
  }

  // Inject newly added nodes into progress as IN_PROGRESS
  for (const newNode of newNodes) {
    if (handledNewNodeIds.has(newNode.id)) continue;

    const alreadyExists = progressByNodeId.has(newNode.id);
    if (!alreadyExists) {
      await db.traineeProgress.create({
        data: {
          traineeId,
          planNodeId: newNode.id,
          status: MilestoneStatus.IN_PROGRESS,
          isArchived: false,
        },
      });
      injected++;
    }
  }

  // 4. Switch assignment pointers
  await db.traineePlanAssignment.updateMany({
    where: {
      traineeId,
      status: "ACTIVE",
      planVersionId: { not: newPlanVersionId },
    },
    data: { status: "SUPERSEDED" },
  });

  await db.traineePlanAssignment.upsert({
    where: {
      traineeId_planVersionId: {
        traineeId,
        planVersionId: newPlanVersionId,
      },
    },
    update: {
      status: "ACTIVE",
      assignedById: validAssignedById,
      assignedAt: new Date(),
    },
    create: {
      traineeId,
      planVersionId: newPlanVersionId,
      assignedById: validAssignedById,
      status: "ACTIVE",
    },
  });

  return { preserved, archived, injected };
}

/**
 * Reconciles all trainees currently assigned to an old version of a plan to its newly published version.
 */
export async function reconcilePlanVersionSubscribers(
  oldPlanVersionId: string,
  newPlanVersionId: string,
  assignedById: string,
  db: DbClient = prisma
): Promise<ReconcileResult> {
  // Find all active subscribers of the old version
  const activeAssignments = await db.traineePlanAssignment.findMany({
    where: {
      planVersionId: oldPlanVersionId,
      status: "ACTIVE",
    },
    select: { traineeId: true },
  });

  let preservedProgressCount = 0;
  let archivedProgressCount = 0;
  let injectedProgressCount = 0;

  for (const assignment of activeAssignments) {
    const res = await reconcileTraineeToPlanVersion(
      assignment.traineeId,
      newPlanVersionId,
      assignedById,
      db
    );
    preservedProgressCount += res.preserved;
    archivedProgressCount += res.archived;
    injectedProgressCount += res.injected;
  }

  return {
    migratedTraineesCount: activeAssignments.length,
    preservedProgressCount,
    archivedProgressCount,
    injectedProgressCount,
  };
}
