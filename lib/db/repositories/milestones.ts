import { Prisma, type MilestoneDefinition, type PrismaClient } from "@prisma/client";
import { prisma } from "../prisma";
import { customMilestoneSchema } from "@/lib/validations/milestones";

export type CreateLibraryMilestoneResult =
  | { success: true; data: MilestoneDefinition }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

const duplicateCode = (): CreateLibraryMilestoneResult => ({
  success: false,
  error: "This milestone code already exists in the shared library.",
  fieldErrors: { code: "This code already exists in the shared library. Choose another code or add the existing milestone." },
});

/** Create only: even concurrent requests must never update a reused code. */
export async function createCustomLibraryMilestone(input: unknown, db: PrismaClient = prisma): Promise<CreateLibraryMilestoneResult> {
  const parsed = customMilestoneSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] || "form")] = issue.message;
    return { success: false, error: "Check the milestone details and try again.", fieldErrors };
  }
  try {
    if (await db.milestoneDefinition.findUnique({ where: { code: parsed.data.code }, select: { id: true } })) return duplicateCode();
    const milestone = await db.milestoneDefinition.create({ data: { ...parsed.data, isStandard: false } });
    return { success: true, data: milestone };
  } catch (error) {
    // The unique database constraint arbitrates requests that pass the check together.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return duplicateCode();
    return { success: false, error: "Could not save the milestone to the shared library. Please try again." };
  }
}
