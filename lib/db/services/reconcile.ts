import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../prisma";
import { matchPlanNodes } from "@/lib/canvas/diff";
export interface ReconcileResult {
  migratedTraineesCount: number;
  preservedProgressCount: number;
  archivedProgressCount: number;
  injectedProgressCount: number;
}
type DbClient = PrismaClient | Prisma.TransactionClient;
const statusRank: Record<string, number> = { LOCKED: 0, IN_PROGRESS: 1, READY_FOR_REVIEW: 2, VERIFIED: 3 };

/** Remap progress in place, preserve verification provenance, and archive removals. Never delete progress. */
export async function reconcileTraineeToPlanVersion(traineeId: string, newPlanVersionId: string, assignedById: string, db: DbClient = prisma): Promise<{ preserved: number; archived: number; injected: number }> {
  if (db === prisma) return prisma.$transaction(tx => reconcileTraineeToPlanVersion(traineeId, newPlanVersionId, assignedById, tx), { timeout: 60_000 });
  const activeAssignment = await db.traineePlanAssignment.findFirst({ where: { traineeId, status: "ACTIVE" }, orderBy: { assignedAt: "desc" }, include: { planVersion: { include: { nodes: true } } } });
  const newVersion = await db.planVersion.findUnique({ where: { id: newPlanVersionId }, include: { nodes: true, plan: true } });
  if (!newVersion) throw new Error(`Target PlanVersion ${newPlanVersionId} not found.`);
  if (activeAssignment?.planVersionId === newPlanVersionId) return { preserved: 0, archived: 0, injected: 0 };
  const validAssignedById = assignedById || newVersion.publishedById || newVersion.plan.createdById;
  const oldNodes = activeAssignment?.planVersion.nodes || [];
  const matches = matchPlanNodes(oldNodes, newVersion.nodes);
  const progress = await db.traineeProgress.findMany({ where: { traineeId } });
  const byNode = new Map(progress.map(record => [record.planNodeId, record]));
  const handled = new Set<string>();
  const removals: string[] = [];
  let preserved = 0;
  for (const old of oldNodes) {
    const record = byNode.get(old.id);
    if (!record) continue;
    const next = matches.get(old);
    if (!next) { if (!record.isArchived) removals.push(record.id); continue; }
    handled.add(next.id);
    const destination = byNode.get(next.id);
    if (destination && destination.id !== record.id) {
      // Rejoining a prior version must not overwrite a stronger existing approval.
      const winner = (statusRank[record.status] ?? 0) >= (statusRank[destination.status] ?? 0) ? record : destination;
      await db.traineeProgress.update({ where: { id: destination.id }, data: {
        status: winner.status, traineeNote: winner.traineeNote, requestedAt: winner.requestedAt,
        verifiedBy: winner.verifiedBy, verifiedAt: winner.verifiedAt, verificationHash: winner.verificationHash,
        trainerNote: winner.trainerNote, isArchived: false, archivedReason: null,
      } });
      await db.traineeProgress.update({ where: { id: record.id }, data: { isArchived: true, archivedReason: "REMAPPED_TO_UPDATED_PLAN" } });
    } else {
      // Updating the FK retains the progress ID, createdAt, status, notes, dates and original hash.
      await db.traineeProgress.update({ where: { id: record.id }, data: { planNodeId: next.id, isArchived: false, archivedReason: null } });
    }
    preserved++;
  }
  const archived = removals.length ? (await db.traineeProgress.updateMany({ where: { id: { in: removals } }, data: { isArchived: true, archivedReason: "REMOVED_FROM_UPDATED_PLAN" } })).count : 0;
  const additions = newVersion.nodes.filter(node => !handled.has(node.id) && !byNode.has(node.id));
  const injected = additions.length ? (await db.traineeProgress.createMany({ data: additions.map(node => ({ traineeId, planNodeId: node.id, status: "IN_PROGRESS", isArchived: false })), skipDuplicates: true })).count : 0;
  await db.traineePlanAssignment.updateMany({ where: { traineeId, status: "ACTIVE", planVersionId: { not: newPlanVersionId } }, data: { status: "SUPERSEDED" } });
  await db.traineePlanAssignment.upsert({ where: { traineeId_planVersionId: { traineeId, planVersionId: newPlanVersionId } }, update: { status: "ACTIVE", assignedById: validAssignedById, assignedAt: new Date() }, create: { traineeId, planVersionId: newPlanVersionId, assignedById: validAssignedById, status: "ACTIVE" } });
  return { preserved, archived, injected };
}
export async function reconcilePlanVersionSubscribers(oldPlanVersionId: string, newPlanVersionId: string, assignedById: string, db: DbClient = prisma): Promise<ReconcileResult> {
  if (db === prisma) return prisma.$transaction(tx => reconcilePlanVersionSubscribers(oldPlanVersionId, newPlanVersionId, assignedById, tx), { timeout: 60_000 });
  const assignments = await db.traineePlanAssignment.findMany({ where: { planVersionId: oldPlanVersionId, status: "ACTIVE" }, select: { traineeId: true } });
  const result: ReconcileResult = { migratedTraineesCount: assignments.length, preservedProgressCount: 0, archivedProgressCount: 0, injectedProgressCount: 0 };
  for (const assignment of assignments) {
    const stats = await reconcileTraineeToPlanVersion(assignment.traineeId, newPlanVersionId, assignedById, db);
    result.preservedProgressCount += stats.preserved;
    result.archivedProgressCount += stats.archived;
    result.injectedProgressCount += stats.injected;
  }
  return result;
}
