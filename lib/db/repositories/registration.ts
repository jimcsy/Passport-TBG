import { Prisma, type PrismaClient } from "@prisma/client";
import { FOUNDATION_PLAN_ID, hasFoundationBaseline } from "@/lib/constants/foundation";
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
      const version = await tx.planVersion.findFirst({
        where: { planId: FOUNDATION_PLAN_ID, status: "PUBLISHED", plan: { status: "PUBLISHED" } },
        orderBy: { versionNumber: "desc" }, include: { nodes: true },
      });
      if (!version || !hasFoundationBaseline(version.nodes)) throw new Error("FOUNDATION_NOT_CONFIGURED");
      const nodes = version.nodes;
      const planVersionId = version.id;
      const adminId = assignedById || version.publishedById;

      return tx.trainee.create({
        data: {
          traineeCode: values.traineeCode,
          fullName: values.fullName,
          email: values.email,
          department: values.department,
          position: values.position,
          jobRole: values.position, // Compatibility for existing directory/passport consumers.
          restaurantBrand: values.restaurantBrand,
          branchLocation: values.branchLocation,
          cohortBatch: values.cohortBatch,
          hireDate: new Date(`${values.hireDate}T00:00:00.000Z`),
          planAssignments: {
            create: { planVersionId, assignedById: adminId, status: "ACTIVE" },
          },
          progressRecords: {
            create: nodes.map((n) => ({
              planNodeId: n.id,
              status: "IN_PROGRESS",
            })),
          },
        },
        select: { id: true, traineeCode: true, fullName: true, email: true },
      });
    }, { timeout: 30_000 });
    return { success: true as const, trainee };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false as const, errors: { traineeCode: "This trainee code is already registered." }, error: "Use a different trainee code." };
    }
    if (error instanceof Error && error.message === "FOUNDATION_NOT_CONFIGURED") return { success: false as const, error: "The corporate foundation plan is not configured or its baseline is incomplete. Contact your administrator." };
    console.error("Trainee registration failed; check database connectivity and configuration.");
    return { success: false as const, error: "Unable to register this trainee. Please try again." };
  }
}
