import { ensureMasterPath } from "../services/learning-paths";
import type { Prisma, PrismaClient } from "@prisma/client";
import { readPathTitles } from "@/lib/plans/paths";
import { resolveStampDesign } from "@/lib/stamps/catalog";
import { prisma } from "../prisma";
import {
  CreateTrainingPlanSchema,
  type CreateTrainingPlanInput,
  SavePlanVersionSchema,
  type SavePlanVersionInput,
  PublishPlanVersionSchema,
  type PublishPlanVersionInput,
} from "@/lib/validations/plans";
import { reconcilePlanVersionSubscribers, type ReconcileResult } from "../services/reconcile";

/**
 * Creates a new training plan and initializes its draft version 1.
 */
export async function createTrainingPlan(input: CreateTrainingPlanInput) {
  const validated = CreateTrainingPlanSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const master = await ensureMasterPath(tx);
    // If setting as default, clear previous default
    if (validated.isDefault) {
      await tx.trainingPlan.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const plan = await tx.trainingPlan.create({
      data: {
        title: validated.title,
        roleIdentifier: validated.roleIdentifier,
        restaurantBrand: validated.restaurantBrand || null,
        description: validated.description || null,
        isDefault: validated.isDefault,
        status: "DRAFT",
        createdById: validated.createdById,
      },
    });

    await tx.learningPath.create({ data: { id: plan.id, planId: plan.id, type: "VARIANT", title: plan.title, parentId: master.id } });
    const version = await tx.planVersion.create({
      data: {
        planId: plan.id,
        versionNumber: 1,
        status: "DRAFT",
        changelog: "Initial draft",
        publishedById: validated.createdById,
      },
    });

    return { ...plan, versions: [version] };
  });
}

/**
 * Retrieves a training plan by ID, including its versions, nodes, edges, and active enrollment count.
 */
export async function getTrainingPlanById(id: string) {
  const plan = await prisma.trainingPlan.findUnique({
    where: { id },
    include: {
      learningPath: true,
      createdBy: {
        select: { id: true, fullName: true, employeeId: true },
      },
      versions: {
        orderBy: { versionNumber: "desc" },
        include: {
          nodes: {
            orderBy: [{ path: "asc" }, { orderIndex: "asc" }],
            include: { libraryMilestone: { select: { _count: { select: { materials: true } } } } },
          },
          edges: true,
          publishedBy: {
            select: { id: true, fullName: true },
          },
          _count: {
            select: {
              assignments: {
                where: { status: "ACTIVE" },
              },
            },
          },
        },
      },
    },
  });

  if (!plan) return null;

  const latestVersion = plan.versions[0] || null;
  const activeAssignmentsCount = await prisma.traineePlanAssignment.count({
    where: {
      planVersion: { planId: id },
      status: "ACTIVE",
    },
  });

  return {
    ...plan,
    latestVersion,
    activeAssignmentsCount,
  };
}

/**
 * Lists all training plans with optional filters and summary metadata.
 */
export async function listTrainingPlans(filters?: {
  roleIdentifier?: string;
  restaurantBrand?: string;
  status?: string;
}) {
  const where: Record<string, unknown> = {};

  if (filters?.roleIdentifier) {
    where.roleIdentifier = filters.roleIdentifier.toUpperCase();
  }
  if (filters?.restaurantBrand) {
    where.restaurantBrand = filters.restaurantBrand;
  }
  if (filters?.status) {
    where.status = filters.status;
  }

  const plans = await prisma.trainingPlan.findMany({
    where,
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    include: {
      createdBy: {
        select: { id: true, fullName: true },
      },
      versions: {
        orderBy: { versionNumber: "desc" },
        include: {
          _count: {
            select: {
              nodes: true,
              assignments: {
                where: { status: "ACTIVE" },
              },
            },
          },
        },
      },
    },
  });

  return plans.map((p) => {
    const latest = p.versions[0];
    const publishedVersion = p.versions.find((v) => v.status === "PUBLISHED");
    const draftVersion = p.versions.find((v) => v.status === "DRAFT");
    const hasDraft = Boolean(draftVersion);

    // Sum active assignments across all versions of this plan so enrolled trainees don't disappear during drafting
    const assignedTraineesCount = p.versions.reduce((sum, v) => sum + (v._count?.assignments || 0), 0);

    return {
      id: p.id,
      title: p.title,
      roleIdentifier: p.roleIdentifier,
      restaurantBrand: p.restaurantBrand,
      description: p.description,
      isDefault: p.isDefault,
      status: p.status,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      createdByName: p.createdBy.fullName,
      latestVersionNumber: latest?.versionNumber || 1,
      latestVersionStatus: latest?.status || "DRAFT",
      hasDraft,
      draftVersionNumber: draftVersion?.versionNumber || null,
      publishedVersionNumber: publishedVersion?.versionNumber || null,
      nodeCount: latest?._count.nodes || 0,
      assignedTraineesCount,
    };
  });
}

/**
 * Persists canvas nodes and edges to a plan.
 * If the latest version is a DRAFT with 0 active assignments, it updates that draft in place.
 * Otherwise, it creates a new version (v+1) to guarantee immutability of published snapshots.
 */
export async function savePlanVersion(input: SavePlanVersionInput, db: PrismaClient | Prisma.TransactionClient = prisma) {
  const validated = SavePlanVersionSchema.parse(input);

  const save = async (tx: Prisma.TransactionClient) => {
    const plan = await tx.trainingPlan.findUnique({
      where: { id: validated.planId },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          include: {
            _count: { select: { assignments: true } },
          },
        },
      },
    });

    if (!plan || plan.status === "ARCHIVED") throw new Error("Training Plan is unavailable.");

    const latest = plan.versions[0];
    let targetVersionId: string;
    let targetVersionNumber: number;

    const canOverwrite =
      latest && latest.status === "DRAFT" && latest._count.assignments === 0;

    if (canOverwrite) {
      targetVersionId = latest.id;
      targetVersionNumber = latest.versionNumber;

      // Delete previous nodes/edges for this draft
      await tx.planEdge.deleteMany({ where: { planVersionId: targetVersionId } });
      await tx.planNode.deleteMany({ where: { planVersionId: targetVersionId } });

      await tx.planVersion.update({
        where: { id: targetVersionId },
        data: {
          pathTitles: validated.pathTitles ?? readPathTitles(latest?.pathTitles),
          status: validated.status,
          changelog: validated.changelog || latest.changelog,
          publishedById: validated.publishedById,
        },
      });
    } else {
      // Create next immutable version
      targetVersionNumber = (latest?.versionNumber || 0) + 1;
      const newVersion = await tx.planVersion.create({
        data: {
          planId: validated.planId,
          versionNumber: targetVersionNumber,
          pathTitles: validated.pathTitles ?? readPathTitles(latest?.pathTitles),
          status: validated.status,
          changelog: validated.changelog || `Version ${targetVersionNumber}`,
          publishedById: validated.publishedById,
        },
      });
      targetVersionId = newVersion.id;
    }

    // Map client node identifiers to persistent IDs
    const nodeIdMap = new Map<string, string>();

    // Create new nodes
    for (const node of validated.nodes) {
      let libraryMilestoneId = node.libraryMilestoneId || null;

      // If it's a custom milestone, also upsert into MilestoneDefinition
      // so it is combined into the shared library across all training tracks
      if (node.isCustom && !libraryMilestoneId) {
        const customDef = await tx.milestoneDefinition.upsert({
          where: { code: node.code },
          // Node snapshots can diverge without renaming the shared library entry.
          update: {},
          create: {
            code: node.code,
            title: node.title,
            description: node.description,
            path: node.path,
            orderIndex: node.orderIndex,
            isStandard: false,
          },
        });
        libraryMilestoneId = customDef.id;
      }

      const createdNode = await tx.planNode.create({
        data: {
          planVersionId: targetVersionId,
          libraryMilestoneId,
          path: node.path,
          code: node.code,
          title: node.title,
          description: node.description,
          orderIndex: node.orderIndex,
          posX: node.posX,
          posY: node.posY,
          stampDesign: resolveStampDesign(node.stampDesign, node.path),
          isCustom: node.isCustom,
        },
      });

      if (node.id) {
        nodeIdMap.set(node.id, createdNode.id);
      }
      // Also map by code for reference
      nodeIdMap.set(node.code, createdNode.id);
    }

    // Only connect nodes created in this version; canvas hubs are virtual.
    const persistedNodeIds = new Set(nodeIdMap.values());
    for (const edge of validated.edges) {
      const sourceId = nodeIdMap.get(edge.sourceNodeId) || edge.sourceNodeId;
      const targetId = nodeIdMap.get(edge.targetNodeId) || edge.targetNodeId;

      if (persistedNodeIds.has(sourceId) && persistedNodeIds.has(targetId)) {
        await tx.planEdge.create({
          data: {
            planVersionId: targetVersionId,
            sourceNodeId: sourceId,
            targetNodeId: targetId,
            edgeType: edge.edgeType,
          },
        });
      }
    }

    return tx.planVersion.findUniqueOrThrow({
      where: { id: targetVersionId },
      include: {
        nodes: true,
        edges: true,
      },
    });
  };
  return "$transaction" in db ? (db as PrismaClient).$transaction(save, { timeout: 60_000 }) : save(db);
}

/**
 * Publishes a plan version and optionally safe-reconciles enrolled active trainees.
 */
export async function publishPlanVersion(
  input: PublishPlanVersionInput & { publishedById?: string },
  publishedByIdArg?: string,
  db: PrismaClient | Prisma.TransactionClient = prisma
): Promise<{
  version: unknown;
  reconcileResult: ReconcileResult | null;
}> {
  const validated = PublishPlanVersionSchema.parse(input);
  const publisherId = publishedByIdArg || input.publishedById;

  const publish = async (tx: Prisma.TransactionClient) => {
    const version = await tx.planVersion.findUnique({
      where: { id: validated.versionId },
      include: { plan: true },
    });

    if (!version || version.plan.status === "ARCHIVED") throw new Error("Plan version is unavailable.");

    const effectivePublishedById =
      publisherId || version.publishedById || version.plan.createdById;

    // Update version status to PUBLISHED
    const updatedVersion = await tx.planVersion.update({
      where: { id: validated.versionId },
      data: {
        status: "PUBLISHED",
        publishedById: effectivePublishedById,
        publishedAt: new Date(),
        changelog: validated.changelog || version.changelog,
      },
      include: {
        nodes: true,
        edges: true,
      },
    });

    // Mark plan as PUBLISHED
    await tx.trainingPlan.update({
      where: { id: version.planId },
      data: { status: "PUBLISHED" },
    });

    let reconcileResult: ReconcileResult | null = null;

    if (validated.syncTrainees) {
      // Include subscribers left on any older version after an earlier publish without sync.
      const sourceVersions = await tx.traineePlanAssignment.findMany({
        where: { status: "ACTIVE", planVersion: { planId: version.planId }, planVersionId: { not: version.id } },
        select: { planVersionId: true }, distinct: ["planVersionId"],
      });
      reconcileResult = { migratedTraineesCount: 0, preservedProgressCount: 0, archivedProgressCount: 0, injectedProgressCount: 0 };
      for (const source of sourceVersions) {
        const result = await reconcilePlanVersionSubscribers(source.planVersionId, version.id, effectivePublishedById, tx);
        reconcileResult.migratedTraineesCount += result.migratedTraineesCount;
        reconcileResult.preservedProgressCount += result.preservedProgressCount;
        reconcileResult.archivedProgressCount += result.archivedProgressCount;
        reconcileResult.injectedProgressCount += result.injectedProgressCount;
      }
    }

    // Mark previous published versions as SUPERSEDED
    await tx.planVersion.updateMany({
      where: {
        planId: version.planId,
        id: { not: validated.versionId },
        status: "PUBLISHED",
      },
      data: { status: "SUPERSEDED" },
    });

    return {
      version: updatedVersion,
      reconcileResult,
    };
  };
  return "$transaction" in db ? (db as PrismaClient).$transaction(publish, { timeout: 60_000 }) : publish(db);
}

/**
 * Soft-archives a training plan.
 */
export async function archiveTrainingPlan(id: string) {
  const path = await prisma.learningPath.findUnique({ where: { planId: id } });
  if (path && path.type !== "VARIANT") throw new Error("Only catalog variants may be archived.");
  return prisma.trainingPlan.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });
}

/**
 * Returns standard and custom master milestones from the BEAT catalog.
 */
export async function getLibraryMilestones(pathFilter?: string) {
  const where: Record<string, unknown> = {};
  if (pathFilter) where.path = pathFilter;

  return prisma.milestoneDefinition.findMany({
    where,
    orderBy: [{ isStandard: "desc" }, { path: "asc" }, { orderIndex: "asc" }],
  });
}

export async function getPlanMilestoneProgressCounts(planId: string) {
  const records = await prisma.traineeProgress.findMany({
    where: { isArchived: false, planNode: { planVersion: { planId } }, trainee: { planAssignments: { some: { status: "ACTIVE", planVersion: { planId } } } } },
    select: { traineeId: true, planNode: { select: { code: true, libraryMilestoneId: true } } },
  });
  const groups = new Map<string, Set<string>>();
  for (const record of records) for (const key of [`code:${record.planNode.code.toUpperCase()}`, ...(record.planNode.libraryMilestoneId ? [`library:${record.planNode.libraryMilestoneId}`] : [])]) {
    const group = groups.get(key) || new Set<string>(); group.add(record.traineeId); groups.set(key, group);
  }
  return Object.fromEntries(Array.from(groups.entries()).map(([key, trainees]) => [key, trainees.size]));
}
