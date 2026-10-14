import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "../prisma";
import { validateRegistration, type RegistrationInput, type RegistrationErrors } from "@/lib/trainee-registration";

export type RegistrationResult =
  | { success: true; trainee: { id: string; traineeCode: string; fullName: string; email: string } }
  | { success: false; error: string; errors?: RegistrationErrors };

export async function createRegisteredTrainee(
  input: RegistrationInput,
  db: PrismaClient = prisma,
  assignedById?: string
): Promise<RegistrationResult> {
  const { values, errors, valid } = validateRegistration(input);
  if (!valid) return { success: false as const, errors, error: "Please check the highlighted fields." };
  try {
    const trainee = await db.$transaction(async (tx) => {
      let targetPlanVersionId = values.planVersionId;
      let nodes: Array<{ id: string; planVersionId: string }> = [];

      if (targetPlanVersionId) {
        nodes = await tx.planNode.findMany({
          where: { planVersionId: targetPlanVersionId },
          select: { id: true, planVersionId: true },
        });
      }

      // If no nodes found via specific version ID, try matching jobRole to a published plan
      if (!nodes.length && values.jobRole) {
        const rolePlan = await tx.trainingPlan.findFirst({
          where: {
            roleIdentifier: values.jobRole.toUpperCase().replace(/\s+/g, "_"),
            status: "PUBLISHED",
          },
          include: {
            versions: {
              where: { status: "PUBLISHED" },
              orderBy: { versionNumber: "desc" },
              take: 1,
            },
          },
        });

        if (rolePlan?.versions[0]) {
          targetPlanVersionId = rolePlan.versions[0].id;
          nodes = await tx.planNode.findMany({
            where: { planVersionId: targetPlanVersionId },
            select: { id: true, planVersionId: true },
          });
        }
      }

      // Fallback to default published plan
      if (!nodes.length) {
        nodes = await tx.planNode.findMany({
          where: {
            planVersion: {
              plan: { isDefault: true },
              status: "PUBLISHED",
            },
          },
          select: { id: true, planVersionId: true },
        });
      }

      // Fallback to any published plan
      if (!nodes.length) {
        nodes = await tx.planNode.findMany({
          where: { planVersion: { status: "PUBLISHED" } },
          select: { id: true, planVersionId: true },
        });
      }

      if (!nodes.length) throw new Error("NO_MILESTONES");

      const planVersionId = targetPlanVersionId || nodes[0].planVersionId;
      const admin = assignedById
        ? { id: assignedById }
        : await tx.adminUser.findFirst({ select: { id: true } });

      return tx.trainee.create({
        data: {
          traineeCode: values.traineeCode,
          fullName: values.fullName,
          email: values.email,
          jobRole: values.jobRole || null,
          restaurantBrand: values.restaurantBrand,
          branchLocation: values.branchLocation,
          cohortBatch: values.cohortBatch,
          hireDate: new Date(`${values.hireDate}T00:00:00.000Z`),
          planAssignments: admin
            ? {
                create: {
                  planVersionId,
                  assignedById: admin.id,
                  status: "ACTIVE",
                },
              }
            : undefined,
          progressRecords: {
            create: nodes.map((n) => ({
              planNodeId: n.id,
              status: "IN_PROGRESS",
            })),
          },
        },
        select: { id: true, traineeCode: true, fullName: true, email: true },
      });
    });
    return { success: true as const, trainee };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false as const, errors: { traineeCode: "This trainee code is already registered." }, error: "Use a different trainee code." };
    }
    if (error instanceof Error && error.message === "NO_MILESTONES") return { success: false as const, error: "Training milestones are not configured. Contact your administrator." };
    console.error("Trainee registration failed", error);
    return { success: false as const, error: "Unable to register this trainee. Please try again." };
  }
}
