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
      createdBy: {
        select: { id: true, fullName: true, employeeId: true },
      },
      versions: {
        orderBy: { versionNumber: "desc" },
        include: {
          nodes: {
            orderBy: [{ path: "asc" }, { orderIndex: "asc" }],
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
export async function savePlanVersion(input: SavePlanVersionInput) {
  const validated = SavePlanVersionSchema.parse(input);

  return prisma.$transaction(async (tx) => {
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

    if (!plan) throw new Error("Training Plan not found.");

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
      if (node.isCustom) {
        const customDef = await tx.milestoneDefinition.upsert({
          where: { code: node.code },
          update: {
            title: node.title,
            description: node.description,
            path: node.path,
          },
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
          isCustom: node.isCustom,
        },
      });

      if (node.id) {
        nodeIdMap.set(node.id, createdNode.id);
      }
      // Also map by code for reference
      nodeIdMap.set(node.code, createdNode.id);
    }

    // Create edges with mapped node IDs
    for (const edge of validated.edges) {
      const sourceId = nodeIdMap.get(edge.sourceNodeId) || edge.sourceNodeId;
      const targetId = nodeIdMap.get(edge.targetNodeId) || edge.targetNodeId;

      // Only insert if both source and target exist
      const sourceExists = await tx.planNode.findUnique({ where: { id: sourceId } });
      const targetExists = await tx.planNode.findUnique({ where: { id: targetId } });

      if (sourceExists && targetExists) {
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
  });
}

/**
 * Publishes a plan version and optionally safe-reconciles enrolled active trainees.
 */
export async function publishPlanVersion(
  input: PublishPlanVersionInput & { publishedById?: string },
  publishedByIdArg?: string
): Promise<{
  version: unknown;
  reconcileResult: ReconcileResult | null;
}> {
  const validated = PublishPlanVersionSchema.parse(input);
  const publisherId = publishedByIdArg || input.publishedById;

  return prisma.$transaction(async (tx) => {
    const version = await tx.planVersion.findUnique({
      where: { id: validated.versionId },
      include: { plan: true },
    });

    if (!version) throw new Error("Plan version not found.");

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
      // Find the previous published version of this plan
      const previousVersion = await tx.planVersion.findFirst({
        where: {
          planId: version.planId,
          versionNumber: { lt: version.versionNumber },
          status: "PUBLISHED",
        },
        orderBy: { versionNumber: "desc" },
      });

      if (previousVersion) {
        reconcileResult = await reconcilePlanVersionSubscribers(
          previousVersion.id,
          updatedVersion.id,
          effectivePublishedById,
          tx
        );
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
  });
}

/**
 * Soft-archives a training plan.
 */
export async function archiveTrainingPlan(id: string) {
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
