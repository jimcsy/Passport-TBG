"use server";

import { getTraineeSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function recordModuleViewAction(moduleId: string): Promise<boolean> {
  const session = await getTraineeSession();
  if (!session || typeof moduleId !== "string" || !moduleId || moduleId.length > 100) return false;
  try {
    const accessible = await prisma.planNode.findFirst({ where: { id: moduleId, OR: [
      { planVersion: { assignments: { some: { traineeId: session.id, status: "ACTIVE" } } } },
      { progressRecords: { some: { traineeId: session.id, isArchived: true } } },
    ] }, select: { id: true } });
    if (!accessible) return false;
    await prisma.traineeContentView.createMany({ data: [{ traineeId: session.id }], skipDuplicates: true });
    return true;
  } catch { return false; } // Analytics must not block learning or review submissions.
}
