import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "../prisma";
import { validateRegistration, type RegistrationInput, type RegistrationErrors } from "@/lib/trainee-registration";

export type RegistrationResult =
  | { success: true; trainee: { id: string; traineeCode: string; fullName: string; email: string } }
  | { success: false; error: string; errors?: RegistrationErrors };

export async function createRegisteredTrainee(input: RegistrationInput, db: PrismaClient = prisma): Promise<RegistrationResult> {
  const { values, errors, valid } = validateRegistration(input);
  if (!valid) return { success: false as const, errors, error: "Please check the highlighted fields." };
  try {
    const trainee = await db.$transaction(async tx => {
      let nodes = await tx.planNode.findMany({
        where: {
          planVersion: {
            plan: { isDefault: true },
            status: "PUBLISHED",
          },
        },
        select: { id: true, planVersionId: true },
      });

      if (!nodes.length) {
        nodes = await tx.planNode.findMany({
          where: { planVersion: { status: "PUBLISHED" } },
          select: { id: true, planVersionId: true },
        });
      }

      if (!nodes.length) throw new Error("NO_MILESTONES");

      const planVersionId = nodes[0].planVersionId;
      const defaultAdmin = await tx.adminUser.findFirst({ select: { id: true } });

      return tx.trainee.create({
        data: {
          ...values,
          hireDate: new Date(`${values.hireDate}T00:00:00.000Z`),
          planAssignments: defaultAdmin ? {
            create: {
              planVersionId,
              assignedById: defaultAdmin.id,
              status: "ACTIVE",
            },
          } : undefined,
          progressRecords: {
            create: nodes.map(n => ({
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
