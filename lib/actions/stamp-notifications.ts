"use server";

import { getTraineeSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export interface StampNotification {
  id: string;
  moduleId: string;
  title: string;
  path: string;
  verifiedAt: string;
  read: boolean;
}

export async function getStampNotificationsAction(): Promise<StampNotification[]> {
  const session = await getTraineeSession();
  if (!session) throw new Error("Unauthorized trainee session");
  const [awards, reads] = await Promise.all([
    prisma.traineeProgress.findMany({
      where: { traineeId: session.id, status: "VERIFIED", verifiedAt: { not: null }, verificationHash: { not: null } },
      select: { verificationHash: true, verifiedAt: true, isArchived: true, planNode: { select: { id: true, title: true, path: true } } },
      // Prefer the current copy when a preserved award also exists in an older version.
      orderBy: [{ isArchived: "asc" }, { verifiedAt: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.stampNotificationRead.findMany({ where: { traineeId: session.id }, select: { verificationHash: true } }),
  ]);
  const read = new Set(reads.map(item => item.verificationHash));
  const unique = new Map<string, StampNotification>();
  for (const award of awards) {
    const hash = award.verificationHash!;
    if (!unique.has(hash)) unique.set(hash, { id: hash, moduleId: award.planNode.id, title: award.planNode.title, path: award.planNode.path, verifiedAt: award.verifiedAt!.toISOString(), read: read.has(hash) });
  }
  return Array.from(unique.values()).sort((a, b) => b.verifiedAt.localeCompare(a.verifiedAt));
}

export async function openStampNotificationAction(awardId: string): Promise<{ firstOpen: boolean; notification: StampNotification }> {
  const session = await getTraineeSession();
  if (!session) throw new Error("Unauthorized trainee session");
  if (typeof awardId !== "string" || !awardId || awardId.length > 256) throw new Error("Invalid notification");
  const award = await prisma.traineeProgress.findFirst({
    where: { traineeId: session.id, verificationHash: awardId, status: "VERIFIED", verifiedAt: { not: null } },
    orderBy: [{ isArchived: "asc" }, { updatedAt: "desc" }],
    select: { verifiedAt: true, planNode: { select: { id: true, title: true, path: true } } },
  });
  if (!award) throw new Error("Notification is unavailable");
  // Only one tab/device can claim the first opening of this award.
  const result = await prisma.stampNotificationRead.createMany({ data: [{ traineeId: session.id, verificationHash: awardId }], skipDuplicates: true });
  return { firstOpen: result.count === 1, notification: { id: awardId, moduleId: award.planNode.id, title: award.planNode.title, path: award.planNode.path, verifiedAt: award.verifiedAt!.toISOString(), read: true } };
}
