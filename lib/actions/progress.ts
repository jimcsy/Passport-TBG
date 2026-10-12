"use server";

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

    revalidatePath("/passport");
    revalidatePath("/passport/booklet");
    revalidatePath(`/passport/modules/${milestoneId}`);
    revalidatePath("/admin/queue");
    revalidatePath(`/admin/trainees/${traineeSession.id}`);

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
    await prisma.traineeProgress.upsert({
      where: {
        traineeId_milestoneId: {
          traineeId,
          milestoneId,
        },
      },
      update: {
        status: MilestoneStatus.VERIFIED,
        verifiedBy: adminSession.id,
        verifiedAt: new Date(),
        trainerNote: trainerNote?.trim() || null,
      },
      create: {
        traineeId,
        milestoneId,
        status: MilestoneStatus.VERIFIED,
        verifiedBy: adminSession.id,
        verifiedAt: new Date(),
        trainerNote: trainerNote?.trim() || null,
      },
    });

    revalidatePath("/passport");
    revalidatePath("/admin/queue");
    revalidatePath(`/admin/trainees/${traineeId}`);
    revalidatePath("/admin/trainees");

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

    await prisma.$transaction(
      traineeIds.map((traineeId) =>
        prisma.traineeProgress.upsert({
          where: {
            traineeId_milestoneId: {
              traineeId,
              milestoneId,
            },
          },
          update: {
            status: MilestoneStatus.VERIFIED,
            verifiedBy: adminSession.id,
            verifiedAt: now,
            trainerNote: trainerNote?.trim() || null,
          },
          create: {
            traineeId,
            milestoneId,
            status: MilestoneStatus.VERIFIED,
            verifiedBy: adminSession.id,
            verifiedAt: now,
            trainerNote: trainerNote?.trim() || null,
          },
        })
      )
    );

    revalidatePath("/passport");
    revalidatePath("/admin/queue");
    revalidatePath("/admin/trainees");
    revalidatePath("/admin/batch");

    return { success: true };
  } catch (error) {
    console.error("Error during bulk verification:", error);
    return { success: false, error: "Failed to execute bulk verification." };
  }
}
