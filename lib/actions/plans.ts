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

export interface PublishPlanCanvasInput {
  planId: string;
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
    revalidatePath("/trainee/dashboard");

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

    revalidatePath("/trainer/trainees");
    revalidatePath(`/trainer/trainees/${traineeId}`);
    revalidatePath("/trainee/dashboard");

    return { success: true, data: res };
  } catch (error) {
    console.error("Error changing trainee plan:", error);
    return { success: false, error: "Failed to change trainee plan." };
  }
}



