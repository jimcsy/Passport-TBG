import type { PrismaClient } from "@prisma/client";
import { prisma } from "../prisma";
import { stampRevocationSchema, type StampRevocationInput } from "@/lib/validations/stamp-revocation";

/** Serialize with verification and path changes, and revoke only the displayed award. */
export async function revokeAward(input: StampRevocationInput, trainerId: string, db: PrismaClient = prisma) {
  const parsed = stampRevocationSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Enter a valid revocation reason (5–500 characters)." };
  const { traineeId, progressId, expectedHash, reason } = parsed.data;
  return db.$transaction(async tx => {
    const trainer = await tx.adminUser.findUnique({ where: { id: trainerId }, select: { role: true } });
    if (!trainer || !["TRAINER", "ADMIN", "SUPER_ADMIN"].includes(trainer.role)) return { success: false, error: "Unauthorized trainer session." };
    await tx.$queryRaw`SELECT "id" FROM "public"."Trainee" WHERE "id" = ${traineeId} FOR UPDATE`;
    const assignment = await tx.traineePlanAssignment.findFirst({ where: { traineeId, status: "ACTIVE" }, orderBy: { assignedAt: "desc" }, select: { planVersionId: true } });
    const progress = await tx.traineeProgress.findFirst({ where: { id: progressId, traineeId, isArchived: false, planNode: { planVersionId: assignment?.planVersionId || "" } }, include: { planNode: true } });
    if (!progress || progress.status !== "VERIFIED" || progress.verificationHash !== expectedHash) return { success: false, error: "This stamp changed or is no longer active. Refresh the profile and try again." };

    const awardKey = expectedHash || `legacy:${progress.id}:${(progress.verifiedAt || progress.updatedAt).toISOString()}`;
    await tx.stampRevocation.create({ data: {
      traineeId, awardKey, verificationHash: expectedHash, planNodeId: progress.planNodeId,
      milestoneCode: progress.planNode.code, milestoneTitle: progress.planNode.title,
      verifiedBy: progress.verifiedBy, verifiedAt: progress.verifiedAt,
      originalTrainerNote: progress.trainerNote, originalRequestedAt: progress.requestedAt,
      revokedById: trainerId, reason,
    } });
    // Preserved copies share an award hash. Invalidate those too so an old
    // notification or a future path restore cannot resurrect the revoked stamp.
    await tx.traineeProgress.updateMany({
      where: { traineeId, ...(expectedHash ? { verificationHash: expectedHash } : { id: progress.id }) },
      data: { status: "IN_PROGRESS", verificationHash: null, verifiedAt: null, verifiedBy: null, requestedAt: null, trainerNote: `Stamp revoked: ${reason}` },
    });
    return { success: true };
  }, { timeout: 30_000 });
}
