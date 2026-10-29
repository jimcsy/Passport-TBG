import { createInstanceForVersion } from "../lib/db/services/learning-paths";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedFoundationPlan } from "../lib/db/repositories/foundation";
import { DEPARTMENT_TECHNICAL_MILESTONES } from "../lib/constants/foundation";

const prisma = new PrismaClient();

async function main() {
  if (process.env.FORCE_RESET === "true") {
    throw new Error("Destructive seeding is disabled. Run the normal seed to preserve progress and awarded stamps.");
  }
  // Never reset an existing trainer's password or overwrite existing profile data.
  const trainer = await prisma.adminUser.upsert({
    where: { employeeId: "EMP-1001" }, update: {},
    create: { employeeId: "EMP-1001", fullName: "Chef Marco Reyes (Master Trainer)", email: "trainer@bistro.com.ph", passwordHash: await bcrypt.hash("password123", 10), role: "TRAINER" },
  });
  const plan = await seedFoundationPlan(prisma, trainer.id);
  // Keep optional specialist modules available for trainers to append, never auto-assign a specialist track.
  for (const module of DEPARTMENT_TECHNICAL_MILESTONES) {
    await prisma.milestoneDefinition.upsert({ where: { code: module.code }, update: {}, create: { ...module, isStandard: true } });
  }
  const trainee = await prisma.trainee.upsert({
    where: { traineeCode: "TBG-2024-001" }, update: {},
    create: { traineeCode: "TBG-2024-001", fullName: "Juan Dela Cruz", email: "trainee@bistro.com.ph",
      restaurantBrand: "Corporate Head Office", branchLocation: "Bistro Support Center", cohortBatch: "Cohort-2024-Q4",
      department: "ICT Department", position: "Technical Support Engineer", jobRole: "Technical Support Engineer", hireDate: new Date("2024-10-01T00:00:00Z") },
  });
  await prisma.$transaction(async tx => {
    const assignment = await tx.traineePlanAssignment.findFirst({ where: { traineeId: trainee.id, status: "ACTIVE" } });
    // Existing trainees keep their assignment and every progress record, even when the default changes.
    if (assignment) return;
    const version = await tx.planVersion.findFirstOrThrow({ where: { planId: plan.id, status: "PUBLISHED" }, orderBy: { versionNumber: "desc" }, include: { nodes: true } });
    // Do not silently replace an existing trainee's historical assignment/progress.
    if (await tx.traineePlanAssignment.count({ where: { traineeId: trainee.id } }) || await tx.traineeProgress.count({ where: { traineeId: trainee.id } })) return;
    const instance = await createInstanceForVersion(tx, trainee.id, version.id, trainer.id);
    await tx.traineePlanAssignment.create({ data: { traineeId: trainee.id, planVersionId: instance.id, assignedById: trainer.id } });
    await tx.traineeProgress.createMany({ data: instance.nodes.map(node => ({ traineeId: trainee.id, planNodeId: node.id, status: "IN_PROGRESS" })) });
  }, { timeout: 60_000 });
  console.log("Seed complete: universal foundation and optional specialist library available; existing profiles, versions, assignments and stamps preserved.");
}
main().catch(() => { console.error("Seed failed. Check database connectivity and seed configuration; no credentials are logged."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
