"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { getAdminSession, getTraineeSession, encryptSession, decryptSession } from "@/lib/auth/session";
import { getSupabaseAdmin, MATERIAL_BUCKET } from "@/lib/supabase/server";
import { uploadRequestSchema, validateFile, type UploadRequest } from "@/lib/validations/materials";
import { createCourseMaterial, deleteCourseMaterial, getMaterialsForMilestone, reorderMaterials } from "@/lib/db/repositories/materials";

async function requireTrainer() {
  const admin = await getAdminSession();
  if (!admin) throw new Error("Unauthorized trainer session.");
  return admin;
}
async function requireMaterialAccess(milestoneId: string) {
  if (await getAdminSession()) return;
  const trainee = await getTraineeSession();
  if (!trainee || !await prisma.planNode.findFirst({ where: { libraryMilestoneId: milestoneId, planVersion: { assignments: { some: { traineeId: trainee.id, status: "ACTIVE" } } } }, select: { id: true } })) throw new Error("You do not have access to this course material.");
}
function refreshMaterials() { revalidatePath("/trainer/plans", "layout"); revalidatePath("/trainee/dashboard", "layout"); }
function message(error: unknown) { return error instanceof Error ? error.message : "Course material request failed. Please retry."; }

type UploadTicket = { purpose: string; adminId: string; materialId: string; storagePath: string; input: UploadRequest };
async function readTicket(ticket: string) {
  const admin = await requireTrainer();
  const data = await decryptSession<UploadTicket>(ticket);
  if (!data || data.purpose !== "material-upload" || data.adminId !== admin.id) throw new Error("Upload authorization expired. Please upload again.");
  uploadRequestSchema.parse(data.input);
  return data;
}
export async function requestUploadUrlAction(input: UploadRequest) {
  try {
    const admin = await requireTrainer();
    const validated = uploadRequestSchema.parse(input);
    const milestone = await prisma.milestoneDefinition.findUniqueOrThrow({ where: { id: validated.milestoneId } });
    const materialId = randomUUID();
    const safeName = validated.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const safeCode = milestone.code.replace(/[^a-zA-Z0-9_-]/g, "_");
    const storagePath = `${safeCode}/${materialId}/${safeName}`;
    const { data, error } = await getSupabaseAdmin().storage.from(MATERIAL_BUCKET).createSignedUploadUrl(storagePath, { upsert: false });
    if (error) throw new Error("Could not authorize storage upload. Check the course-materials bucket configuration.");
    const ticket = await encryptSession({ purpose: "material-upload", adminId: admin.id, materialId, storagePath, input: validated }, "2h");
    return { success: true as const, data: { signedUrl: data.signedUrl, storagePath, materialId, ticket } };
  } catch (error) { return { success: false as const, error: message(error) }; }
}
export async function confirmUploadAction(ticket: string) {
  try {
    const data = await readTicket(ticket);
    const existing = await prisma.courseMaterial.findUnique({ where: { id: data.materialId } });
    if (existing) return { success: true as const };
    const { data: object, error } = await getSupabaseAdmin().storage.from(MATERIAL_BUCKET).info(data.storagePath);
    if (error || !object) throw new Error("The uploaded file was not found. Please retry the upload.");
    if (object.size !== data.input.fileSizeBytes || object.contentType !== data.input.mimeType) {
      await getSupabaseAdmin().storage.from(MATERIAL_BUCKET).remove([data.storagePath]);
      throw new Error("Uploaded file size or type did not match. Please upload again.");
    }
    const fileType = validateFile({ name: data.input.fileName, type: object.contentType, size: object.size }).fileType!;
    await createCourseMaterial({ id: data.materialId, milestoneId: data.input.milestoneId, fileName: data.input.fileName, fileType, mimeType: data.input.mimeType, fileSizeBytes: data.input.fileSizeBytes, storagePath: data.storagePath, uploadedById: data.adminId });
    refreshMaterials();
    return { success: true as const };
  } catch (error) { return { success: false as const, error: message(error) }; }
}
export async function cancelUploadAction(ticket: string) {
  try {
    const data = await readTicket(ticket);
    if (await prisma.courseMaterial.findUnique({ where: { id: data.materialId } })) return { success: true as const };
    const { error } = await getSupabaseAdmin().storage.from(MATERIAL_BUCKET).remove([data.storagePath]);
    if (error) throw new Error("Could not remove the incomplete upload. Please retry.");
    return { success: true as const };
  } catch (error) { return { success: false as const, error: message(error) }; }
}
export async function deleteMaterialAction(materialId: string) {
  try {
    await requireTrainer();
    const material = await prisma.courseMaterial.findUnique({ where: { id: materialId } });
    if (!material) return { success: true as const };
    // Retain metadata on storage failure so deletion can be retried.
    const { error } = await getSupabaseAdmin().storage.from(MATERIAL_BUCKET).remove([material.storagePath]);
    if (error) throw new Error("Could not delete the stored file. No metadata was removed; please retry.");
    await deleteCourseMaterial(materialId);
    refreshMaterials();
    return { success: true as const };
  } catch (error) { return { success: false as const, error: message(error) }; }
}
export async function getMaterialsForMilestoneAction(milestoneId: string) {
  try { await requireMaterialAccess(milestoneId); return { success: true as const, data: await getMaterialsForMilestone(milestoneId) }; }
  catch (error) { return { success: false as const, error: message(error) }; }
}
export async function getMaterialSignedUrlAction(materialId: string, download = false) {
  try {
    const material = await prisma.courseMaterial.findUniqueOrThrow({ where: { id: materialId } });
    await requireMaterialAccess(material.milestoneId);
    const { data, error } = await getSupabaseAdmin().storage.from(MATERIAL_BUCKET).createSignedUrl(material.storagePath, 3600, download ? { download: material.fileName } : undefined);
    if (error) throw new Error("Could not open course material. Please retry.");
    return { success: true as const, data: { signedUrl: data.signedUrl } };
  } catch (error) { return { success: false as const, error: message(error) }; }
}
export async function reorderMaterialsAction(milestoneId: string, orderedIds: string[]) {
  try { await requireTrainer(); await reorderMaterials(milestoneId, orderedIds); refreshMaterials(); return { success: true as const }; }
  catch (error) { return { success: false as const, error: message(error) }; }
}
