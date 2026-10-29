import { prisma } from "../prisma";
import type { PrismaClient } from "@prisma/client";
import { VariantMetadataSchema, type VariantMetadata } from "@/lib/validations/learning-paths";
import { SavePlanVersionSchema, type SavePlanVersionInput } from "@/lib/validations/plans";
import { cloneVersionGraph, createInstanceForVersion, ensureMasterPath } from "../services/learning-paths";
import { reconcileTraineeToPlanVersion } from "../services/reconcile";
import { savePlanVersion } from "./plans";

/** Unique active trainees across private instance versions and legacy direct assignments. */
export async function getVariantEnrollmentCounts(variantIds: string[], db: PrismaClient = prisma) {
  if (!variantIds.length) return new Map<string, number>();
  const assignments = await db.traineePlanAssignment.findMany({
    where: { status: "ACTIVE", planVersion: { plan: { learningPath: { OR: [
      { id: { in: variantIds }, type: "VARIANT" },
      { parentId: { in: variantIds }, type: "INSTANCE" },
    ] } } } },
    select: { traineeId: true, planVersion: { select: { plan: { select: { learningPath: { select: { id: true, parentId: true, type: true, traineeId: true } } } } } } },
  });
  const groups = new Map(variantIds.map(id => [id, new Set<string>()]));
  for (const assignment of assignments) {
    const path = assignment.planVersion.plan.learningPath;
    if (!path || (path.type === "INSTANCE" && path.traineeId !== assignment.traineeId)) continue;
    const variantId = path.type === "INSTANCE" ? path.parentId : path.id;
    if (variantId) groups.get(variantId)?.add(assignment.traineeId);
  }
  return new Map(Array.from(groups, ([id, trainees]) => [id, trainees.size]));
}

export async function getLearningPathCatalog(db: PrismaClient = prisma) {
  const master = await db.learningPath.findUnique({ where: { planId: "plan-tbg-corporate-foundation-l1" }, include: {
    plan: { include: { versions: { orderBy: { versionNumber: "desc" }, take: 1, include: { _count: { select: { nodes: true } } } } } },
    children: { where: { type: "VARIANT", plan: { status: { not: "ARCHIVED" } } }, orderBy: { title: "asc" }, include: {
      plan: { include: { versions: { orderBy: { versionNumber: "desc" }, take: 1, include: { nodes: true, edges: true } } } },
    } },
  } });
  if (!master) return null;
  const counts = await getVariantEnrollmentCounts(master.children.map(path => path.id), db);
  return { ...master, children: master.children.map(path => ({ ...path, enrolledTraineeCount: counts.get(path.id) || 0 })) };
}

export async function createRoleVariant(metadata: VariantMetadata, authorId: string, db: PrismaClient = prisma) {
  const input = VariantMetadataSchema.parse(metadata);
  return db.$transaction(async tx => {
    const master = await ensureMasterPath(tx);
    const source = await tx.planVersion.findFirstOrThrow({ where: { planId: master.planId, status: "PUBLISHED", plan: { status: "PUBLISHED" } }, orderBy: { versionNumber: "desc" }, include: { nodes: true, edges: true } });
    const plan = await tx.trainingPlan.create({ data: { title: input.title, roleIdentifier: "ROLE_VARIANT", createdById: authorId, status: "DRAFT" } });
    const path = await tx.learningPath.create({ data: { id: plan.id, planId: plan.id, type: "VARIANT", parentId: master.id, ...input } });
    await cloneVersionGraph(tx, source, plan.id, authorId);
    return path;
  }, { timeout: 60_000 });
}

export async function editRoleVariant(input: VariantMetadata & { variantId: string; graph?: Omit<SavePlanVersionInput, "planId" | "publishedById" | "status"> }, authorId: string, db: PrismaClient = prisma) {
  const metadata = VariantMetadataSchema.parse(input);
  return db.$transaction(async tx => {
    const path = await tx.learningPath.findUniqueOrThrow({ where: { id: input.variantId }, include: { plan: true } });
    if (path.type !== "VARIANT" || path.plan.status === "ARCHIVED") throw new Error("This variant is unavailable.");
    // Updating metadata never changes private snapshots or progress.
    const updated = await tx.learningPath.update({ where: { id: path.id }, data: metadata });
    await tx.trainingPlan.update({ where: { id: path.planId }, data: { title: metadata.title } });
    if (input.graph) {
      const graph = SavePlanVersionSchema.parse({ ...input.graph, planId: path.planId, publishedById: authorId, status: "DRAFT" });
      await savePlanVersion(graph, tx);
    }
    return updated;
  }, { timeout: 60_000 });
}

export async function deleteRoleVariant(variantId: string, db: PrismaClient = prisma) {
  return db.$transaction(async tx => {
    const path = await tx.learningPath.findUniqueOrThrow({ where: { id: variantId } });
    if (path.type !== "VARIANT") throw new Error("Only role variants may be deleted from the catalog.");
    // Tombstone the plan so existing instances/provenance keep valid references.
    await tx.trainingPlan.update({ where: { id: path.planId }, data: { status: "ARCHIVED" } });
  });
}

export async function promotePathInstance(input: { instanceId: string; variantTitle: string; department: string; position: string }, authorId: string, db: PrismaClient = prisma) {
  const metadata = VariantMetadataSchema.parse({ title: input.variantTitle, targetDepartment: input.department, targetPosition: input.position });
  return db.$transaction(async tx => {
    const instance = await tx.learningPath.findUniqueOrThrow({ where: { id: input.instanceId } });
    if (instance.type !== "INSTANCE" || !instance.traineeId) throw new Error("Select a trainee's active instance.");
    const assignment = await tx.traineePlanAssignment.findFirst({ where: { traineeId: instance.traineeId, status: "ACTIVE", planVersion: { planId: instance.planId } }, include: { planVersion: { include: { nodes: true, edges: true } } } });
    if (!assignment) throw new Error("Only the active instance may be promoted. Publish custom changes before promoting.");
    const master = await ensureMasterPath(tx);
    const plan = await tx.trainingPlan.create({ data: { title: metadata.title, roleIdentifier: "ROLE_VARIANT", createdById: authorId, status: "DRAFT" } });
    const variant = await tx.learningPath.create({ data: { id: plan.id, planId: plan.id, type: "VARIANT", parentId: master.id, sourceVersionId: assignment.planVersionId, ...metadata } });
    await cloneVersionGraph(tx, assignment.planVersion, plan.id, authorId);
    return variant;
  }, { timeout: 60_000 });
}

/** Upgrade a legacy shared assignment once; lock the trainee to avoid duplicate instances on concurrent requests. */
export async function ensureTraineePathInstance(traineeId: string, db: PrismaClient = prisma) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Trainee" WHERE "id" = ${traineeId} FOR UPDATE`;
    const assignment = await tx.traineePlanAssignment.findFirst({ where: { traineeId, status: "ACTIVE" }, orderBy: { assignedAt: "desc" }, include: { planVersion: { include: { plan: { include: { learningPath: true } } } } } });
    if (!assignment) return null;
    const current = assignment.planVersion.plan.learningPath;
    if (current?.type === "INSTANCE") {
      if (current.traineeId !== traineeId) throw new Error("Invalid instance owner.");
      return current;
    }
    const version = await createInstanceForVersion(tx, traineeId, assignment.planVersionId, assignment.assignedById, true);
    await reconcileTraineeToPlanVersion(traineeId, version.id, assignment.assignedById, tx);
    return tx.learningPath.findUniqueOrThrow({ where: { planId: version.planId } });
  }, { timeout: 60_000 });
}
