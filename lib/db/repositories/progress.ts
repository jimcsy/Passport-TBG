import type { PrismaClient } from "@prisma/client";
import { prisma } from "../prisma";
import { MilestoneStatus } from "@/lib/types/models";

/** Preserve trainer approvals and prevent duplicate review requests. */
export async function queueMilestoneForReview(
  traineeId: string,
  milestoneId: string,
  note: string,
  db: PrismaClient = prisma
): Promise<{ success: boolean; error?: string }> {
  return db.$transaction(async tx => {
    const milestone = await tx.milestoneDefinition.findUnique({ where: { id: milestoneId } });
    if (!milestone) return { success: false, error: "Milestone not found." };
    const current = await tx.traineeProgress.findUnique({ where: { traineeId_milestoneId: { traineeId, milestoneId } } });
    if (current?.status === MilestoneStatus.VERIFIED) return { success: false, error: "This milestone is already verified and stamped." };
    if (current?.status === MilestoneStatus.READY_FOR_REVIEW) return { success: false, error: "This milestone is already in your trainer’s review queue." };
    if (current && current.status !== MilestoneStatus.IN_PROGRESS) return { success: false, error: "This milestone is locked. Ask your trainer to unlock it." };
    const data = { status: MilestoneStatus.READY_FOR_REVIEW, traineeNote: note.trim() || null, requestedAt: new Date() };
    if (current) {
      const result = await tx.traineeProgress.updateMany({ where: { id: current.id, status: MilestoneStatus.IN_PROGRESS }, data });
      if (!result.count) return { success: false, error: "The milestone status changed. Refresh and try again." };
    } else {
      await tx.traineeProgress.create({ data: { traineeId, milestoneId, ...data } });
    }
    return { success: true };
  });
}
