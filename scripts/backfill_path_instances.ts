// node --env-file=.env --import tsx scripts/backfill_path_instances.ts
import { prisma } from "../lib/db/prisma";
import { ensureTraineePathInstance } from "../lib/db/repositories/learning-paths";
async function main() {
  const assignments = await prisma.traineePlanAssignment.findMany({ where: { status: "ACTIVE", NOT: { planVersion: { plan: { learningPath: { type: "INSTANCE" } } } } }, select: { traineeId: true }, distinct: ["traineeId"] });
  for (const { traineeId } of assignments) await ensureTraineePathInstance(traineeId);
  console.log(`Converted ${assignments.length} legacy assignments to private instances; existing progress IDs, approvals and stamp hashes retained.`);
}
main().catch(() => { console.error("Instance backfill failed. Completed conversions are safe to rerun; credentials are not logged."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
