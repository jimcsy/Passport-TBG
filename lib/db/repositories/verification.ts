import type { PrismaClient } from "@prisma/client";
import { prisma } from "../prisma";
import { verificationData } from "@/lib/stamps/hash";

/** Resolve a catalog/library selection independently inside each trainee's active instance. */
export async function verifyAssignedMilestones(traineeIds: string[], milestoneId: string, trainerId: string, note?: string, db: PrismaClient = prisma) {
  return db.$transaction(async tx => {
    const reference = await tx.planNode.findUnique({ where: { id: milestoneId } });
    const definition = reference ? null : await tx.milestoneDefinition.findUnique({ where: { id: milestoneId } });
    if (!reference && !definition) throw new Error("Milestone is unavailable.");
    const code = reference?.code || definition!.code;
    const libraryId = reference?.libraryMilestoneId || definition?.id;
    for (const traineeId of Array.from(new Set(traineeIds)).sort()) {
      await tx.$queryRaw`SELECT "id" FROM "Trainee" WHERE "id" = ${traineeId} FOR UPDATE`;
      const assignment = await tx.traineePlanAssignment.findFirst({ where: { traineeId, status: "ACTIVE" }, orderBy: { assignedAt: "desc" }, include: { planVersion: { include: { nodes: true } } } });
      const nodes = assignment?.planVersion.nodes || [];
      const node = nodes.find(item => item.id === milestoneId) || nodes.find(item => item.code.toUpperCase() === code.toUpperCase()) || (libraryId ? nodes.find(item => item.libraryMilestoneId === libraryId) : null);
      if (!node) throw new Error("The selected milestone is not assigned to every selected trainee.");
      const existing = await tx.traineeProgress.findUnique({ where: { traineeId_planNodeId: { traineeId, planNodeId: node.id } } });
      if (existing?.isArchived) throw new Error("Archived milestones cannot be verified.");
      if (existing?.status === "VERIFIED") continue; // Retain the original award and hash on repeated sign-off.
      const approval = verificationData(traineeId, node.id, trainerId, new Date(), note);
      await tx.traineeProgress.upsert({ where: { traineeId_planNodeId: { traineeId, planNodeId: node.id } }, update: approval, create: { traineeId, planNodeId: node.id, ...approval } });
    }
  }, { timeout: 60_000 });
}
