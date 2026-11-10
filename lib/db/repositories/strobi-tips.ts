import "server-only";
import { createHash } from "node:crypto";
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
async function readAssignment(traineeId: string, db: PrismaClient) {
  return db.trainee.findUnique({ where: { id: traineeId }, select: {
    planAssignments: {
      where: { status: "ACTIVE" }, orderBy: { assignedAt: "desc" }, take: 1,
      select: { id: true, planVersionId: true, planVersion: { select: { nodes: { select: {
        id: true, code: true, title: true, description: true, path: true, libraryMilestoneId: true,
      } } } } },
    },
    progressRecords: { select: {
      planNodeId: true, status: true, isArchived: true, archivedReason: true,
      planNode: { select: { planVersionId: true, libraryMilestoneId: true, code: true, title: true, path: true } },
    } },
  } });
}
function accessFromAssignment(trainee: Awaited<ReturnType<typeof readAssignment>>, nodeId: string): StrobiTipAccess {
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

export async function resolveStrobiTipAccess(traineeId: string, nodeId: string, db: PrismaClient = strobiTipsDb): Promise<StrobiTipAccess> {
  return accessFromAssignment(await readAssignment(traineeId, db), nodeId);
}

/** Whitelisted client choices only; no descriptions, feedback or progress identities. */
export async function readStrobiChatChoices(traineeId: string, currentNodeId?: string, db: PrismaClient = strobiTipsDb) {
  const data = await readAssignment(traineeId, db);
  if (!data) return null;
  const assignment = data.planAssignments[0];
  const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
  const milestones = (assignment?.planVersion.nodes || []).flatMap(node => {
    const access = accessFromAssignment(data, node.id);
    const parsed = strobiTipContextSchema.safeParse({ title: node.title, description: node.description, pillar: node.path });
    if (!parsed.success || !access.allowed && access.code !== "LOCKED_MILESTONE") return [];
    // Eligibility is resolved above using the same canonical status as the API.
    const active = data.progressRecords.filter(item => !item.isArchived && item.planNode.planVersionId === assignment!.planVersionId);
    const exact = active.find(item => item.planNodeId === node.id);
    const library = node.libraryMilestoneId ? active.filter(item => item.planNode.libraryMilestoneId === node.libraryMilestoneId).at(-1) : undefined;
    const code = active.filter(item => item.planNode.code === node.code).at(-1);
    const status = access.allowed ? (exact || library || code)?.status || "IN_PROGRESS" : "LOCKED";
    return [{ id: node.id, title: parsed.data.title, pillar: parsed.data.pillar, status,
      isArchived: false, revision: hash([assignment!.id, assignment!.planVersionId, node.id, parsed.data]) }];
  });
  if (currentNodeId && !milestones.some(node => node.id === currentNodeId)) {
    const archived = data.progressRecords.find(item => item.planNodeId === currentNodeId && item.isArchived && item.archivedReason === "REMOVED_FROM_UPDATED_PLAN");
    if (archived && ["ONBOARDING", "COMMUNICATION", "TECHNICAL", "CULTURE", "LEADERSHIP"].includes(archived.planNode.path))
      milestones.push({ id: currentNodeId, title: archived.planNode.title, pillar: archived.planNode.path as typeof milestones[number]["pillar"], status: "ARCHIVED", isArchived: true, revision: hash([archived.planNode.planVersionId, currentNodeId, "archive"]) });
  }
  return { assignmentKey: assignment ? `${assignment.id}:${assignment.planVersionId}` : "unassigned", milestones };
}
