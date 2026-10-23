"use server";

import { verificationData } from "@/lib/stamps/hash";
import { revalidatePath } from "next/cache";
import { prisma } from "../db/prisma";
import { getTraineeSession, getAdminSession } from "../auth/session";
import { MilestoneStatus } from "../types/models";
import { queueMilestoneForReview } from "../db/repositories/progress";

export interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Trainee submits a milestone as Ready for Review with an optional reflection note.
 */
export async function submitMilestoneForReview(
  milestoneId: string,
  traineeNote: string
): Promise<ActionResult> {
  const traineeSession = await getTraineeSession();

  if (!traineeSession) {
    return { success: false, error: "Unauthorized. Please log in again." };
  }

  try {
    const result = await queueMilestoneForReview(traineeSession.id, milestoneId, traineeNote);
    if (!result.success) return result;

    revalidatePath("/trainee/dashboard", "layout");
    revalidatePath("/trainee/dashboard/booklet");
    revalidatePath(`/trainee/dashboard/modules/${milestoneId}`);
    revalidatePath("/trainer/queue");
    revalidatePath(`/trainer/trainees/${traineeSession.id}`);

    return { success: true };
  } catch (error) {
    console.error("Error submitting milestone for review:", error);
    return { success: false, error: "Failed to submit milestone for review." };
  }
}

/**
 * Trainer 1-click verifies a milestone for a trainee.
 */
export async function verifyMilestone(
  traineeId: string,
  milestoneId: string,
  trainerNote?: string
): Promise<ActionResult> {
  const adminSession = await getAdminSession();

  if (!adminSession) {
    return { success: false, error: "Unauthorized trainer session." };
  }

  try {
    let targetNodeId = milestoneId;
    const node = await prisma.planNode.findUnique({ where: { id: milestoneId } });
    if (!node) {
      const fallback = await prisma.planNode.findFirst({ where: { libraryMilestoneId: milestoneId } });
      if (fallback) targetNodeId = fallback.id;
    }

    const verifiedAt = new Date();
    const approval = verificationData(traineeId, targetNodeId, adminSession.id, verifiedAt, trainerNote);
    await prisma.traineeProgress.upsert({
      where: {
        traineeId_planNodeId: {
          traineeId,
          planNodeId: targetNodeId,
        },
      },
      update: approval,
      create: { traineeId, planNodeId: targetNodeId, ...approval },
    });

    revalidatePath("/trainee/dashboard", "layout");
    revalidatePath("/trainer/queue");
    revalidatePath(`/trainer/trainees/${traineeId}`);
    revalidatePath("/trainer/trainees");

    return { success: true };
  } catch (error) {
    console.error("Error verifying milestone:", error);
    return { success: false, error: "Failed to verify milestone." };
  }
}

/**
 * Bulk verification for cohort batch updates.
 */
export async function bulkVerifyMilestones(
  traineeIds: string[],
  milestoneId: string,
  trainerNote?: string
): Promise<ActionResult> {
  const adminSession = await getAdminSession();

  if (!adminSession) {
    return { success: false, error: "Unauthorized trainer session." };
  }

  if (traineeIds.length === 0) {
    return { success: false, error: "Please select at least one trainee." };
  }

  try {
    const now = new Date();
    let targetNodeId = milestoneId;
    const node = await prisma.planNode.findUnique({ where: { id: milestoneId } });
    if (!node) {
      const fallback = await prisma.planNode.findFirst({ where: { libraryMilestoneId: milestoneId } });
      if (fallback) targetNodeId = fallback.id;
    }

    await prisma.$transaction(
      traineeIds.map((traineeId) =>
        prisma.traineeProgress.upsert({
          where: {
            traineeId_planNodeId: {
              traineeId,
              planNodeId: targetNodeId,
            },
          },
          update: {
            status: MilestoneStatus.VERIFIED,
            verifiedBy: adminSession.id,
            verifiedAt: now,
            verificationHash: verificationData(traineeId, targetNodeId, adminSession.id, now).verificationHash,
            trainerNote: trainerNote?.trim() || null,
          },
          create: {
            traineeId,
            planNodeId: targetNodeId,
            status: MilestoneStatus.VERIFIED,
            verifiedBy: adminSession.id,
            verifiedAt: now,
            verificationHash: verificationData(traineeId, targetNodeId, adminSession.id, now).verificationHash,
            trainerNote: trainerNote?.trim() || null,
          },
        })
      )
    );

    revalidatePath("/trainee/dashboard", "layout");
    revalidatePath("/trainer/queue");
    revalidatePath("/trainer/trainees");
    revalidatePath("/trainer/batch");

    return { success: true };
  } catch (error) {
    console.error("Error during bulk verification:", error);
    return { success: false, error: "Failed to execute bulk verification." };
  }
}

/** Poll only the authenticated trainee's active, non-archived stamps. */
export async function checkForNewStampsAction(since: string): Promise<{ hasNew: boolean; checkedAt: string }> {
  const session = await getTraineeSession();
  if (!session) throw new Error("Unauthorized trainee session");
  const after = new Date(since);
  if (!Number.isFinite(after.getTime())) throw new Error("Invalid stamp cursor");
  // Capture the upper bound before reading so approvals during the query cannot be skipped.
  const checkedAt = new Date();
  const count = await prisma.traineeProgress.count({
    where: {
      traineeId: session.id, isArchived: false, status: "VERIFIED",
      verifiedAt: { gt: after, lte: checkedAt },
      planNode: { planVersion: { assignments: { some: { traineeId: session.id, status: "ACTIVE" } } } },
    },
  });
  return { hasNew: count > 0, checkedAt: checkedAt.toISOString() };
}
