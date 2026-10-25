import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
export const materialSummarySelect = { id: true, milestoneId: true, fileName: true, fileType: true, mimeType: true, fileSizeBytes: true, displayOrder: true } as const;
export async function createCourseMaterial(data: Omit<Prisma.CourseMaterialUncheckedCreateInput, "displayOrder"> & { id: string }) {
  return prisma.$transaction(async tx => {
    const existing = await tx.courseMaterial.findUnique({ where: { id: data.id } });
    if (existing) return existing;
    const max = await tx.courseMaterial.aggregate({ where: { milestoneId: data.milestoneId }, _max: { displayOrder: true } });
    return tx.courseMaterial.create({ data: { ...data, displayOrder: (max._max.displayOrder ?? -1) + 1 } });
  });
}
export async function deleteCourseMaterial(id: string) {
  return prisma.courseMaterial.delete({ where: { id }, select: { storagePath: true } });
}
export async function getMaterialsForMilestone(milestoneId: string) {
  return prisma.courseMaterial.findMany({ where: { milestoneId }, select: materialSummarySelect, orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }] });
}
export async function reorderMaterials(milestoneId: string, orderedIds: string[]) {
  return prisma.$transaction(async tx => {
    const records = await tx.courseMaterial.findMany({ where: { milestoneId }, select: { id: true } });
    if (new Set(orderedIds).size !== orderedIds.length || records.length !== orderedIds.length || records.some(record => !orderedIds.includes(record.id))) throw new Error("Material list changed. Refresh and try again.");
    for (let displayOrder = 0; displayOrder < orderedIds.length; displayOrder++) await tx.courseMaterial.update({ where: { id: orderedIds[displayOrder] }, data: { displayOrder } });
  });
}
