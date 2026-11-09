import "server-only";
import type { PrismaClient } from "@prisma/client";
import { strobiTipsDb } from "@/lib/ai/strobi-tips-db";
import { strobiTipContextSchema, type StrobiTipContext } from "@/lib/validations/strobi-tips";

export interface StrobiTipAccessSnapshot {
  assignmentId: string;
  planVersionId: string;
  nodeId: string;
  context: StrobiTipContext;
}
export type StrobiTipAccess = { allowed: true; snapshot: StrobiTipAccessSnapshot } | {
  allowed: false;
  code: "UNAUTHORIZED" | "INACCESSIBLE_MILESTONE" | "LOCKED_MILESTONE" | "ARCHIVED_MILESTONE";
};

/** Read-only, intentionally excludes profile, notes, verifier, materials and hashes. */
export async function resolveStrobiTipAccess(traineeId: string, nodeId: string, db: PrismaClient = strobiTipsDb): Promise<StrobiTipAccess> {
  const trainee = await db.trainee.findUnique({ where: { id: traineeId }, select: {
    planAssignments: {
      where: { status: "ACTIVE" }, orderBy: { assignedAt: "desc" }, take: 1,
      select: { id: true, planVersionId: true, planVersion: { select: { nodes: { select: {
        id: true, code: true, title: true, description: true, path: true, libraryMilestoneId: true,
      } } } } },
    },
    progressRecords: { select: {
      planNodeId: true, status: true, isArchived: true, archivedReason: true,
      planNode: { select: { planVersionId: true, libraryMilestoneId: true, code: true } },
    } },
  } });
  if (!trainee) return { allowed: false, code: "UNAUTHORIZED" };
  const assignment = trainee.planAssignments[0];
  const node = assignment?.planVersion.nodes.find(item => item.id === nodeId);
  if (!node) {
    // Only an owned archive can be distinguished; never probe foreign/global nodes.
    const archived = trainee.progressRecords.some(item => item.planNodeId === nodeId && item.isArchived && item.archivedReason === "REMOVED_FROM_UPDATED_PLAN");
    return { allowed: false, code: archived ? "ARCHIVED_MILESTONE" : "INACCESSIBLE_MILESTONE" };
  }
  // Fail closed if inconsistent/stale assignments still point at an archived row.
  if (trainee.progressRecords.some(item => item.planNodeId === nodeId && item.isArchived))
    return { allowed: false, code: "ARCHIVED_MILESTONE" };
  // Same effective progress lookup/order as getTraineePassportData: exact ID,
  // retained library identity, then competency code, within this active version.
  const active = trainee.progressRecords.filter(item => !item.isArchived && item.planNode.planVersionId === assignment.planVersionId);
  const byId = new Map(active.map(item => [item.planNodeId, item]));
  const byLibrary = new Map(active.filter(item => item.planNode.libraryMilestoneId).map(item => [item.planNode.libraryMilestoneId!, item]));
  const byCode = new Map(active.map(item => [item.planNode.code, item]));
  const progress = byId.get(node.id) || (node.libraryMilestoneId ? byLibrary.get(node.libraryMilestoneId) : undefined) || byCode.get(node.code);
  const status = progress?.status ?? "IN_PROGRESS";
  if (status === "LOCKED") return { allowed: false, code: "LOCKED_MILESTONE" };
  if (!["IN_PROGRESS", "READY_FOR_REVIEW", "VERIFIED"].includes(status)) return { allowed: false, code: "INACCESSIBLE_MILESTONE" };
  const parsed = strobiTipContextSchema.safeParse({ title: node.title, description: node.description, pillar: node.path });
  if (!parsed.success) return { allowed: false, code: "INACCESSIBLE_MILESTONE" };
  return { allowed: true, snapshot: { assignmentId: assignment.id, planVersionId: assignment.planVersionId, nodeId: node.id, context: parsed.data } };
}
