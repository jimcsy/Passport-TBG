"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";
import {
  createTrainingPlan,
  savePlanVersion,
  publishPlanVersion,
  archiveTrainingPlan,
  getLibraryMilestones,
} from "@/lib/db/repositories/plans";
import {
  assignPlanToTrainee,
  bulkAssignPlanToCohort,
  changeTraineePlan,
} from "@/lib/db/repositories/assignments";
import type { SavePlanVersionInput, PublishPlanVersionInput } from "@/lib/validations/plans";
import { DevelopmentPath } from "@/lib/types/models";

export interface PlanActionResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

/**
 * Creates a new training plan and redirects to its visual builder.
 */
export async function createPlanAction(formData: FormData): Promise<PlanActionResult> {
  const admin = await getAdminSession();
  if (!admin) return { success: false, error: "Unauthorized session" };

  const title = formData.get("title") as string;
  const roleIdentifier = formData.get("roleIdentifier") as string;
  const restaurantBrand = (formData.get("restaurantBrand") as string) || null;
  const description = (formData.get("description") as string) || null;

  try {
    const plan = await createTrainingPlan({
      title,
      roleIdentifier,
      restaurantBrand,
      description,
      isDefault: false,
      createdById: admin.id,
    });

    revalidatePath("/trainer/plans");
    return { success: true, data: plan };
  } catch (error) {
    console.error("Error creating plan:", error);
    return { success: false, error: "Failed to create training plan." };
  }
}

/**
 * Persists canvas nodes and edges for a plan version.
 */
export async function savePlanVersionAction(input: SavePlanVersionInput): Promise<PlanActionResult> {
  const admin = await getAdminSession();
  if (!admin) return { success: false, error: "Unauthorized session" };

  try {
    const saved = await savePlanVersion({
      ...input,
      publishedById: admin.id,
    });

    revalidatePath(`/trainer/plans/${input.planId}/builder`);
    revalidatePath("/trainer/plans");
    return { success: true, data: saved };
  } catch (error) {
    console.error("Error saving plan version:", error);
    return { success: false, error: "Failed to save plan canvas." };
  }
}

/**
 * Publishes a plan version with optional safe trainee reconciliation.
 */
export async function publishPlanVersionAction(input: PublishPlanVersionInput): Promise<PlanActionResult> {
  const admin = await getAdminSession();
  if (!admin) return { success: false, error: "Unauthorized session" };

  try {
    const res = await publishPlanVersion(input, admin.id);

    revalidatePath("/trainer/plans");
    revalidatePath(`/trainer/plans/${input.versionId}/builder`);
    revalidatePath("/trainer/trainees");
    revalidatePath("/trainer/queue");

    return { success: true, data: res };
  } catch (error) {
    console.error("Error publishing plan version:", error);
    return { success: false, error: "Failed to publish plan version." };
  }
}

/**
 * Archives a training plan.
 */
export async function archivePlanAction(planId: string): Promise<PlanActionResult> {
  const admin = await getAdminSession();
  if (!admin) return { success: false, error: "Unauthorized session" };

  try {
    await archiveTrainingPlan(planId);
    revalidatePath("/trainer/plans");
    return { success: true };
  } catch (error) {
    console.error("Error archiving plan:", error);
    return { success: false, error: "Failed to archive plan." };
  }
}

/**
 * Returns standard master milestones catalog.
 */
export async function getLibraryMilestonesAction(pathFilter?: string): Promise<PlanActionResult> {
  const admin = await getAdminSession();
  if (!admin) return { success: false, error: "Unauthorized session", data: [] };

  try {
    const milestones = await getLibraryMilestones(pathFilter);
    return { success: true, data: milestones };
  } catch (error) {
    console.error("Error fetching library milestones:", error);
    return { success: false, error: "Failed to fetch library milestones.", data: [] };
  }
}

/**
 * Persists a custom milestone to the organization library for reuse across all plans.
 */
export async function createCustomLibraryMilestoneAction(data: {
  code: string;
  title: string;
  description: string;
  path: DevelopmentPath;
}): Promise<PlanActionResult> {
  const admin = await getAdminSession();
  if (!admin) return { success: false, error: "Unauthorized session" };

  try {
    const { prisma } = await import("@/lib/db/prisma");
    const milestone = await prisma.milestoneDefinition.upsert({
      where: { code: data.code },
      update: {
        title: data.title,
        description: data.description,
        path: data.path,
      },
      create: {
        code: data.code,
        title: data.title,
        description: data.description,
        path: data.path,
        isStandard: false,
      },
    });

    revalidatePath("/trainer/plans");
    return { success: true, data: milestone };
  } catch (error) {
    console.error("Error creating custom library milestone:", error);
    return { success: false, error: "Failed to register custom milestone in library." };
  }
}

/**
 * Updates a custom milestone in the library and synchronizes any canvas nodes using it.
 */
export async function updateCustomLibraryMilestoneAction(
  identifier: { id?: string; code?: string },
  data: {
    code: string;
    title: string;
    description: string;
    path: DevelopmentPath;
  }
): Promise<PlanActionResult> {
  const admin = await getAdminSession();
  if (!admin) return { success: false, error: "Unauthorized session" };

  try {
    const { prisma } = await import("@/lib/db/prisma");
    const where = identifier.id ? { id: identifier.id } : { code: identifier.code! };

    const existing = await prisma.milestoneDefinition.findUnique({ where });
    if (!existing) {
      // If not yet saved in definition, create it as custom
      const created = await prisma.milestoneDefinition.create({
        data: {
          code: data.code,
          title: data.title,
          description: data.description,
          path: data.path,
          isStandard: false,
        },
      });
      revalidatePath("/trainer/plans");
      return { success: true, data: created };
    }

    if (existing.isStandard) {
      return { success: false, error: "Standard BEAT canonical milestones cannot be modified." };
    }

    const updated = await prisma.milestoneDefinition.update({
      where: { id: existing.id },
      data: {
        code: data.code,
        title: data.title,
        description: data.description,
        path: data.path,
      },
    });

    // Also update any plan nodes matching this milestone definition
    await prisma.planNode.updateMany({
      where: {
        planVersion: { status: "DRAFT" },
        OR: [
          { libraryMilestoneId: existing.id },
          { code: existing.code, isCustom: true },
        ],
      },
      data: {
        code: data.code,
        title: data.title,
        description: data.description,
        path: data.path,
      },
    });

    revalidatePath("/trainer/plans");
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error updating custom library milestone:", error);
    return { success: false, error: "Failed to update custom milestone." };
  }
}

/**
 * Deletes a custom milestone from the library.
 * Standard BEAT milestones are protected and cannot be deleted.
 */
export async function deleteCustomLibraryMilestoneAction(
  identifier: { id?: string; code?: string }
): Promise<PlanActionResult> {
  const admin = await getAdminSession();
  if (!admin) return { success: false, error: "Unauthorized session" };

  try {
    const { prisma } = await import("@/lib/db/prisma");
    const where = identifier.id ? { id: identifier.id } : { code: identifier.code! };

    const existing = await prisma.milestoneDefinition.findUnique({ where });
    if (!existing) {
      return { success: true };
    }

    if (existing.isStandard) {
      return { success: false, error: "Standard BEAT canonical milestones cannot be deleted." };
    }

    const materials = await prisma.courseMaterial.findMany({ where: { milestoneId: existing.id }, select: { id: true } });
    if (materials.length) {
      const { deleteMaterialAction } = await import("./materials");
      for (const material of materials) {
        const result = await deleteMaterialAction(material.id);
        if (!result.success) return { success: false, error: result.error };
      }
    }

    await prisma.milestoneDefinition.delete({
      where: { id: existing.id },
    });

    revalidatePath("/trainer/plans");
    return { success: true };
  } catch (error) {
    console.error("Error deleting custom library milestone:", error);
    return { success: false, error: "Failed to delete custom milestone from library." };
  }
}

export interface PublishPlanCanvasInput {
  planId: string;
  pathTitles?: import("@/lib/plans/paths").PathTitles;
  syncTrainees: boolean;
  changelog?: string | null;
  nodes: Array<{
    id?: string;
    libraryMilestoneId?: string | null;
    path: DevelopmentPath;
    code: string;
    title: string;
    description: string;
    orderIndex: number;
    posX: number;
    posY: number;
    stampDesign?: string;
    isCustom: boolean;
  }>;
  edges: Array<{
    sourceNodeId: string;
    targetNodeId: string;
    edgeType: "PARENT_CHILD" | "SEQUENCE_HINT";
  }>;
}

/**
 * Saves current canvas state and publishes as an immutable version with safe reconciliation.
 */
export async function publishPlanCanvasAction(input: PublishPlanCanvasInput): Promise<PlanActionResult> {
  const admin = await getAdminSession();
  if (!admin) return { success: false, error: "Unauthorized session" };

  try {
    const saved = await savePlanVersion({
      planId: input.planId,
      pathTitles: input.pathTitles,
      publishedById: admin.id,
      status: "DRAFT",
      changelog: input.changelog || "Published canvas version",
      nodes: input.nodes,
      edges: input.edges,
    });

    const res = await publishPlanVersion(
      {
        versionId: saved.id,
        syncTrainees: input.syncTrainees,
        changelog: input.changelog,
      },
      admin.id
    );

    revalidatePath("/trainer/plans");
    revalidatePath(`/trainer/plans/${input.planId}/builder`);
    revalidatePath("/trainer/trainees");
    revalidatePath("/trainer/queue");
    if (input.syncTrainees) {
      revalidatePath("/trainee/dashboard", "page");
    }

    return { success: true, data: res };
  } catch (error) {
    console.error("Error publishing canvas version:", error);
    return { success: false, error: "Failed to publish plan version." };
  }
}

/**
 * Assigns a trainee to a published training plan version.
 */
export async function assignPlanAction(traineeId: string, planVersionId: string): Promise<PlanActionResult> {
  const admin = await getAdminSession();
  if (!admin) return { success: false, error: "Unauthorized session" };

  try {
    const res = await assignPlanToTrainee({
      traineeId,
      planVersionId,
      assignedById: admin.id,
    });

    revalidatePath("/trainer/plans");
    revalidatePath("/trainer/trainees");
    revalidatePath(`/trainer/trainees/${traineeId}`);
    revalidatePath("/trainee/dashboard");

    return { success: true, data: res };
  } catch (error) {
    console.error("Error assigning plan:", error);
    return { success: false, error: "Failed to assign training plan." };
  }
}

/**
 * Bulk assigns multiple trainees to a published training plan version.
 */
export async function bulkAssignPlanAction(traineeIds: string[], planVersionId: string): Promise<PlanActionResult> {
  const admin = await getAdminSession();
  if (!admin) return { success: false, error: "Unauthorized session" };

  try {
    const res = await bulkAssignPlanToCohort({
      traineeIds,
      planVersionId,
      assignedById: admin.id,
    });

    revalidatePath("/trainer/plans");
    revalidatePath("/trainer/trainees");
    revalidatePath("/trainer/batch");
    revalidatePath("/trainee/dashboard");

    return { success: true, data: res };
  } catch (error) {
    console.error("Error bulk assigning plans:", error);
    return { success: false, error: "Failed to bulk assign training plan." };
  }
}

/**
 * Changes a trainee's plan version and safely reconciles existing progress.
 */
export async function changeTraineePlanAction(traineeId: string, newPlanVersionId: string): Promise<PlanActionResult> {
  const admin = await getAdminSession();
  if (!admin) return { success: false, error: "Unauthorized session" };

  try {
    const res = await changeTraineePlan(traineeId, newPlanVersionId, admin.id);

    revalidatePath("/trainer/plans");
    revalidatePath("/trainer/trainees");
    revalidatePath(`/trainer/trainees/${traineeId}`);
    revalidatePath("/trainee/dashboard");

    return { success: true, data: res };
  } catch (error) {
    console.error("Error changing trainee plan:", error);
    return { success: false, error: "Failed to change trainee plan." };
  }
}

/**
 * Creates a new working draft version cloned from the latest published version (or base template).
 */
export async function createDraftVersionAction(planId: string): Promise<PlanActionResult> {
  const admin = await getAdminSession();
  if (!admin) return { success: false, error: "Unauthorized session" };

  try {
    const { prisma } = await import("@/lib/db/prisma");

    const plan = await prisma.trainingPlan.findUnique({
      where: { id: planId },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          include: {
            nodes: true,
            edges: true,
          },
        },
      },
    });

    if (!plan) return { success: false, error: "Plan not found" };

    // Check if an existing draft already exists
    const existingDraft = plan.versions.find((v) => v.status === "DRAFT");
    if (existingDraft) {
      return { success: true, data: existingDraft };
    }

    const latest = plan.versions[0];
    const newVersionNumber = (latest?.versionNumber || 0) + 1;

    const newDraft = await prisma.$transaction(async (tx) => {
      const createdVersion = await tx.planVersion.create({
        data: {
          planId,
          pathTitles: (await import("@/lib/plans/paths")).readPathTitles(latest?.pathTitles),
          versionNumber: newVersionNumber,
          status: "DRAFT",
          changelog: `Draft version ${newVersionNumber} cloned from v${latest?.versionNumber || 1}`,
          publishedById: admin.id,
        },
      });

      // Clone nodes from latest version if any exist
      if (latest && latest.nodes.length > 0) {
        const nodeIdMap = new Map<string, string>();

        for (const node of latest.nodes) {
          const createdNode = await tx.planNode.create({
            data: {
              planVersionId: createdVersion.id,
              code: node.code,
              title: node.title,
              description: node.description,
              path: node.path,
              orderIndex: node.orderIndex,
              posX: node.posX,
              posY: node.posY,
              stampDesign: node.stampDesign,
              isCustom: node.isCustom,
              libraryMilestoneId: node.libraryMilestoneId,
            },
          });
          nodeIdMap.set(node.id, createdNode.id);
        }

        for (const edge of latest.edges) {
          const newSourceId = nodeIdMap.get(edge.sourceNodeId);
          const newTargetId = nodeIdMap.get(edge.targetNodeId);

          if (newSourceId && newTargetId) {
            await tx.planEdge.create({
              data: {
                planVersionId: createdVersion.id,
                sourceNodeId: newSourceId,
                targetNodeId: newTargetId,
                edgeType: edge.edgeType,
              },
            });
          }
        }
      }

      return tx.planVersion.findUnique({
        where: { id: createdVersion.id },
        include: {
          nodes: { include: { libraryMilestone: { select: { _count: { select: { materials: true } } } } } },
          edges: true,
          publishedBy: { select: { fullName: true } },
          _count: {
            select: {
              assignments: {
                where: { status: "ACTIVE" },
              },
            },
          },
        },
      });
    }, { timeout: 30_000 });

    revalidatePath(`/trainer/plans/${planId}/builder`);
    revalidatePath("/trainer/plans");
    return { success: true, data: newDraft };
  } catch (error) {
    console.error("Error creating draft version:", error);
    return { success: false, error: "Failed to create draft version." };
  }
}




export async function getMilestoneProgressCountAction(planId: string, code: string, libraryMilestoneId?: string | null) {
  const admin = await getAdminSession();
  if (!admin) return { success: false as const, error: "Unauthorized trainer session" };
  const { prisma } = await import("@/lib/db/prisma");
  const records = await prisma.traineeProgress.findMany({
    where: { isArchived: false, planNode: { planVersion: { planId }, OR: [{ code: { equals: code, mode: "insensitive" } }, ...(libraryMilestoneId ? [{ libraryMilestoneId }] : [])] }, trainee: { planAssignments: { some: { status: "ACTIVE", planVersion: { planId } } } } },
    select: { traineeId: true }, distinct: ["traineeId"],
  });
  return { success: true as const, data: { traineeCount: records.length } };
}
