"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/auth/session";
import { createRoleVariant, deleteRoleVariant, editRoleVariant, promotePathInstance, ensureTraineePathInstance } from "@/lib/db/repositories/learning-paths";
import type { VariantMetadata } from "@/lib/validations/learning-paths";
import type { SavePlanVersionInput } from "@/lib/validations/plans";

function refresh() {
  revalidatePath("/trainer/plans", "layout"); revalidatePath("/trainer/trainees", "layout");
}
export async function createVariant(input: VariantMetadata) {
  const admin = await getAdminSession();
  if (!admin) return { success: false, error: "Please sign in as a trainer." };
  try { const path = await createRoleVariant(input, admin.id); refresh(); return { success: true, data: { id: path.id, planId: path.planId } }; }
  catch { return { success: false, error: "Unable to create variant. Check the title, department and position, and ensure the foundation is published." }; }
}
export async function updateVariantMetadata(input: VariantMetadata & { variantId: string }) {
  const admin = await getAdminSession();
  if (!admin) return { success: false, error: "Please sign in as a trainer." };
  try { await editRoleVariant(input, admin.id); refresh(); return { success: true }; }
  catch { return { success: false, error: "Unable to update variant. Check the department/position pairing and variant availability." }; }
}
export async function saveVariant(input: VariantMetadata & { variantId: string; graph: Omit<SavePlanVersionInput, "planId" | "publishedById" | "status"> }) {
  const admin = await getAdminSession();
  if (!admin) return { success: false, error: "Please sign in as a trainer." };
  try { await editRoleVariant(input, admin.id); refresh(); return { success: true }; }
  catch { return { success: false, error: "Unable to save variant. Check milestone codes, titles and department/position tags." }; }
}
export async function deleteVariant(variantId: string) {
  const admin = await getAdminSession();
  if (!admin) return { success: false, error: "Please sign in as a trainer." };
  try { await deleteRoleVariant(variantId); refresh(); return { success: true }; }
  catch { return { success: false, error: "Unable to delete this variant." }; }
}
export async function promoteInstanceToVariant(input: { instanceId: string; variantTitle: string; department: string; position: string }) {
  const admin = await getAdminSession();
  if (!admin) return { success: false, error: "Please sign in as a trainer." };
  try { const path = await promotePathInstance(input, admin.id); refresh(); return { success: true, data: { id: path.id, planId: path.planId } }; }
  catch { return { success: false, error: "Unable to promote this path. Check the title and department/position, and ensure the trainee has an active instance." }; }
}

export async function createIndividualInstance(traineeId: string) {
  const admin = await getAdminSession();
  if (!admin) return { success: false, error: "Please sign in as a trainer." };
  try {
    const path = await ensureTraineePathInstance(traineeId);
    if (!path) return { success: false, error: "This trainee has no active assignment to copy." };
    refresh(); return { success: true };
  } catch { return { success: false, error: "Unable to create an individual instance. Existing progress has been preserved." }; }
}
