"use server";

import { createHash } from "node:crypto";
import { getAdminSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export interface ReviewNotification {
  id: string;
  progressId: string;
  traineeName: string;
  traineeCode: string;
  title: string;
  requestedAt: string;
  read: boolean;
}

function requestKey(item: { traineeId: string; requestedAt: Date | null; createdAt: Date; planNode: { code: string; libraryMilestoneId: string | null } }) {
  return createHash("sha256").update(JSON.stringify([item.traineeId, (item.requestedAt ?? item.createdAt).toISOString(), item.planNode.libraryMilestoneId ?? item.planNode.code])).digest("hex");
}

export async function getReviewNotificationsAction(): Promise<ReviewNotification[]> {
  const session = await getAdminSession();
  if (!session) throw new Error("Unauthorized trainer session");
  // Trainers currently share the Review Queue; use its same visibility rules.
  const [requests, reads] = await Promise.all([
    prisma.traineeProgress.findMany({
      where: { status: "READY_FOR_REVIEW", isArchived: false },
      select: { id: true, traineeId: true, requestedAt: true, createdAt: true, trainee: { select: { fullName: true, traineeCode: true } }, planNode: { select: { title: true, code: true, libraryMilestoneId: true } } },
      orderBy: [{ requestedAt: "desc" }, { id: "desc" }],
    }),
    prisma.reviewNotificationRead.findMany({ where: { trainerId: session.id }, select: { requestKey: true } }),
  ]);
  const read = new Set(reads.map(item => item.requestKey));
  const unique = new Map<string, ReviewNotification>();
  for (const item of requests) {
    const id = requestKey(item);
    if (!unique.has(id)) unique.set(id, { id, progressId: item.id, traineeName: item.trainee.fullName, traineeCode: item.trainee.traineeCode, title: item.planNode.title, requestedAt: (item.requestedAt ?? item.createdAt).toISOString(), read: read.has(id) });
  }
  return Array.from(unique.values());
}

export async function openReviewNotificationAction(progressId: string): Promise<{ available: boolean; href?: string; id?: string }> {
  const session = await getAdminSession();
  if (!session) throw new Error("Unauthorized trainer session");
  if (typeof progressId !== "string" || !progressId || progressId.length > 200) throw new Error("Invalid notification");
  const request = await prisma.traineeProgress.findFirst({
    where: { id: progressId, status: "READY_FOR_REVIEW", isArchived: false },
    select: { traineeId: true, requestedAt: true, createdAt: true, planNode: { select: { code: true, libraryMilestoneId: true } } },
  });
  if (!request) return { available: false };
  const id = requestKey(request);
  await prisma.reviewNotificationRead.createMany({ data: [{ trainerId: session.id, requestKey: id }], skipDuplicates: true });
  return { available: true, id, href: `/trainer/queue?tab=queue&review=${encodeURIComponent(progressId)}#review-${encodeURIComponent(progressId)}` };
}
