import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { FOUNDATION_PLAN_ID } from "@/lib/constants/foundation";
import { readPathTitles } from "@/lib/plans/paths";

export type PathDb = Prisma.TransactionClient;
type Graph = Prisma.PlanVersionGetPayload<{ include: { nodes: true; edges: true } }>;

export async function ensureMasterPath(tx: PathDb) {
  const plan = await tx.trainingPlan.findUnique({ where: { id: FOUNDATION_PLAN_ID } });
  if (!plan) throw new Error("Seed the corporate foundation before managing learning paths.");
  return tx.learningPath.upsert({ where: { planId: plan.id }, update: {}, create: {
    id: plan.id, planId: plan.id, title: plan.title, type: "MASTER", isTemplate: true,
  } });
}

/** Copy only the definition graph, never progress, approvals, or hashes. */
export async function cloneVersionGraph(tx: PathDb, source: Graph, planId: string, authorId: string, status: "DRAFT" | "PUBLISHED" = "DRAFT") {
  const version = await tx.planVersion.create({ data: {
    planId, versionNumber: 1, status, publishedById: authorId,
    pathTitles: readPathTitles(source.pathTitles), changelog: "Snapshot copied from source path.",
  } });
  const ids = new Map(source.nodes.map(node => [node.id, randomUUID()]));
  if (source.nodes.length) await tx.planNode.createMany({ data: source.nodes.map(({ id, planVersionId, createdAt, ...node }) => ({ ...node, id: ids.get(id)!, planVersionId: version.id })) });
  const edges = source.edges.filter(edge => ids.has(edge.sourceNodeId) && ids.has(edge.targetNodeId));
  if (edges.length) await tx.planEdge.createMany({ data: edges.map(edge => ({ planVersionId: version.id, sourceNodeId: ids.get(edge.sourceNodeId)!, targetNodeId: ids.get(edge.targetNodeId)!, edgeType: edge.edgeType })) });
  return tx.planVersion.findUniqueOrThrow({ where: { id: version.id }, include: { nodes: true, edges: true } });
}

/** Every catalog assignment gets an independent version graph, including initial registration. */
export async function createInstanceForVersion(tx: PathDb, traineeId: string, sourceVersionId: string, authorId: string, allowHistorical = false) {
  await tx.$queryRaw`SELECT "id" FROM "Trainee" WHERE "id" = ${traineeId} FOR UPDATE`;
  const source = await tx.planVersion.findUniqueOrThrow({ where: { id: sourceVersionId }, include: { nodes: true, edges: true, plan: { include: { learningPath: true } } } });
  if (!allowHistorical && (source.status !== "PUBLISHED" || source.plan.status === "ARCHIVED")) throw new Error("Only published, available paths may be assigned.");
  if (source.plan.learningPath?.type === "INSTANCE") {
    if (source.plan.learningPath.traineeId !== traineeId) throw new Error("This instance belongs to another trainee.");
    return source;
  }
  const master = await ensureMasterPath(tx);
  const sourcePath = source.plan.learningPath || await tx.learningPath.create({ data: { id: source.planId, planId: source.planId, title: source.plan.title, type: "VARIANT", parentId: master.id } });
  const trainee = await tx.trainee.findUniqueOrThrow({ where: { id: traineeId } });
  const plan = await tx.trainingPlan.create({ data: {
    title: source.plan.title, roleIdentifier: source.plan.roleIdentifier, restaurantBrand: source.plan.restaurantBrand,
    status: "PUBLISHED", createdById: authorId,
  } });
  await tx.learningPath.create({ data: {
    id: plan.id, planId: plan.id, title: plan.title, type: "INSTANCE", parentId: sourcePath.id,
    traineeId, sourceVersionId, targetDepartment: trainee.department, targetPosition: trainee.position,
  } });
  return cloneVersionGraph(tx, source, plan.id, authorId, "PUBLISHED");
}
