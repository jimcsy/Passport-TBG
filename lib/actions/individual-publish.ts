"use server";
import { getAdminSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { commitIndividualPublish, getIndividualPublishContext, IndividualPublishError, previewIndividualPublish } from "@/lib/db/repositories/individual-publish";
import type { IndividualPublishInput } from "@/lib/validations/individual-publish";
function message(error: unknown) { return error instanceof IndividualPublishError ? error.message : "Unable to prepare or publish this scope. Check the variant details and milestone data, then try again."; }
export async function individualPublishContextAction(planId: string) {
  if (!(await getAdminSession())) return { success: false as const, error: "Please sign in as a trainer." };
  try { return { success: true as const, data: await getIndividualPublishContext(planId) }; }
  catch (error) { return { success: false as const, error: message(error) }; }
}
export async function previewIndividualPublishAction(input: IndividualPublishInput) {
  if (!(await getAdminSession())) return { success: false as const, error: "Please sign in as a trainer." };
  try { return { success: true as const, data: await previewIndividualPublish(input) }; }
  catch (error) { return { success: false as const, error: message(error) }; }
}
export async function confirmIndividualPublishAction(input: IndividualPublishInput, previewToken: string) {
  const admin = await getAdminSession();
  if (!admin) return { success: false as const, error: "Please sign in as a trainer." };
  try {
    const result = await commitIndividualPublish(input, previewToken, admin.id);
    revalidatePath("/trainer/plans", "layout"); revalidatePath("/trainer/trainees", "layout");
    revalidatePath("/trainer/queue"); revalidatePath("/trainee/dashboard", "layout");
    return { success: true as const, data: result };
  } catch (error) { return { success: false as const, error: message(error) }; }
}
