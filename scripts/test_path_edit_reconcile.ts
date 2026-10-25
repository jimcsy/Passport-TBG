import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/db/prisma";
import { createTrainingPlan, savePlanVersion, publishPlanVersion, getPlanMilestoneProgressCounts } from "../lib/db/repositories/plans";
import { assignPlanToTrainee } from "../lib/db/repositories/assignments";
import { reconcileTraineeToPlanVersion } from "../lib/db/services/reconcile";
import { getTraineePassportData } from "../lib/db/repositories/trainee";
import { DevelopmentPath } from "../lib/types/models";
import { verificationData } from "../lib/stamps/hash";
import { buildDynamicPassportPages } from "../lib/passport/book";
import { SavePlanVersionSchema } from "../lib/validations/plans";
async function main() {
  const trainer = await prisma.adminUser.findFirstOrThrow();
  const suffix = String(Date.now()).slice(-8);
  const trainees: string[] = []; let planId: string | undefined;
  const definitions = Object.values(DevelopmentPath).flatMap(path => [1, 2, 3].map(index => ({ id: randomUUID(), code: `${suffix}-${path.slice(0, 3)}-${index}`, title: `${path} milestone ${index}`, description: "Isolated non-destructive path editing fixture", path, orderIndex: index, isStandard: false })));
  try {
    await prisma.milestoneDefinition.createMany({ data: definitions });
    const plan = await createTrainingPlan({ title: "Path editing regression fixture", roleIdentifier: "PATH_EDIT_TEST", isDefault: false, createdById: trainer.id }); planId = plan.id;
    const baseNodes = definitions.map(node => ({ id: `local-${node.id}`, libraryMilestoneId: node.id, code: node.code, title: node.title, description: node.description, path: node.path, orderIndex: node.orderIndex, posX: 0, posY: node.orderIndex * 200, isCustom: false }));
    const input = { planId, publishedById: trainer.id, status: "DRAFT" as const, nodes: baseNodes, edges: [] };
    assert.equal(SavePlanVersionSchema.safeParse({ ...input, nodes: [baseNodes[0], { ...baseNodes[1], code: baseNodes[0].code.toLowerCase() }] }).success, false);
    assert.equal(SavePlanVersionSchema.safeParse({ ...input, nodes: [baseNodes[0], { ...baseNodes[1], libraryMilestoneId: baseNodes[0].libraryMilestoneId }] }).success, false);
    const v1 = await savePlanVersion(input); await publishPlanVersion({ versionId: v1.id, syncTrainees: false }, trainer.id);
    for (let index = 0; index < 2; index++) {
      const trainee = await prisma.trainee.create({ data: { traineeCode: `PATH-${suffix}-${index}`, fullName: "Path edit fixture", email: "path-edit@example.invalid", restaurantBrand: "Test", branchLocation: "Test", cohortBatch: "Path editing regression", hireDate: new Date() } });
      trainees.push(trainee.id); await assignPlanToTrainee({ traineeId: trainee.id, planVersionId: v1.id, assignedById: trainer.id });
    }
    const verified = v1.nodes.find(node => node.path === "TECHNICAL" && node.orderIndex === 1)!;
    const removed = v1.nodes.find(node => node.path === "TECHNICAL" && node.orderIndex === 2)!;
    const pending = v1.nodes.find(node => node.path === "ONBOARDING" && node.orderIndex === 1)!;
    for (const traineeId of trainees) {
      for (const node of [verified, removed]) await prisma.traineeProgress.update({ where: { traineeId_planNodeId: { traineeId, planNodeId: node.id } }, data: { ...verificationData(traineeId, node.id, trainer.id, new Date("2026-10-25T02:30:00Z"), "Original trainer audit"), traineeNote: "Original verified reflection" } });
      await prisma.traineeProgress.update({ where: { traineeId_planNodeId: { traineeId, planNodeId: pending.id } }, data: { status: "READY_FOR_REVIEW", requestedAt: new Date("2026-10-25T01:00:00Z"), traineeNote: "Preserve pending review" } });
    }
    const original = await prisma.traineeProgress.findMany({ where: { traineeId: { in: trainees } } }); assert.equal(original.length, 30);
    const additions = [1, 2].map(index => ({ id: `added-${index}`, libraryMilestoneId: null, path: DevelopmentPath.TECHNICAL, code: `${suffix}-NEW-${index}`, title: `Added milestone ${index}`, description: "Fresh progress for newly introduced milestones", orderIndex: index + 3, posX: 0, posY: 800 + index * 200, isCustom: false }));
    const nodesV2 = baseNodes.filter(node => node.code !== removed.code && node.path !== "LEADERSHIP").map(node => ({ ...node, code: node.path === "COMMUNICATION" && node.orderIndex === 1 ? `${suffix}-COMM-RENAMED` : node.code, orderIndex: node.path === "ONBOARDING" && node.orderIndex < 3 ? 3 - node.orderIndex : node.orderIndex }));
    const v2 = await savePlanVersion({ ...input, nodes: [...nodesV2, ...additions], pathTitles: { TECHNICAL: "Operations", LEADERSHIP: "Team leadership" } });
    const result = await publishPlanVersion({ versionId: v2.id, syncTrainees: true }, trainer.id); assert.equal(result.reconcileResult?.migratedTraineesCount, 2);
    const after = await prisma.traineeProgress.findMany({ where: { traineeId: { in: trainees } } }); assert.equal(after.length, 34);
    for (const record of original) {
      const kept = after.find(next => next.id === record.id); assert.ok(kept, `Progress row ${record.id} must survive`);
      for (const key of ["status", "traineeNote", "trainerNote", "verifiedBy", "verificationHash"] as const) assert.equal(kept[key], record[key]);
      for (const key of ["createdAt", "verifiedAt", "requestedAt"] as const) assert.equal(kept[key]?.getTime(), record[key]?.getTime());
      const old = v1.nodes.find(node => node.id === record.planNodeId)!;
      if (old.id === removed.id || old.path === "LEADERSHIP") { assert.equal(kept.isArchived, true); assert.equal(kept.archivedReason, "REMOVED_FROM_UPDATED_PLAN"); }
      else { assert.equal(kept.isArchived, false); assert.ok(v2.nodes.some(node => node.id === kept.planNodeId)); }
    }
    for (const traineeId of trainees) {
      const assignments = await prisma.traineePlanAssignment.findMany({ where: { traineeId } }); assert.equal(assignments.find(row => row.planVersionId === v1.id)?.status, "SUPERSEDED"); assert.equal(assignments.find(row => row.planVersionId === v2.id)?.status, "ACTIVE");
      assert.ok(after.filter(row => row.traineeId === traineeId && v2.nodes.some(node => node.id === row.planNodeId && node.code.includes("-NEW-"))).every(row => row.status === "IN_PROGRESS"));
      const passport = await getTraineePassportData(traineeId); assert.ok(passport); assert.equal(passport.paths.find(path => path.path === "TECHNICAL")?.title, "Operations"); assert.equal(passport.paths.find(path => path.path === "LEADERSHIP")?.title, "Team leadership"); assert.equal(passport.paths.find(path => path.path === "LEADERSHIP")?.total, 0); assert.equal(passport.archivedMilestones.length, 4);
      assert.ok(buildDynamicPassportPages(passport.paths, { roleName: "Test role" }).some(page => page.kind === "exempt_stamp" && page.path?.title === "Team leadership"));
      assert.deepEqual(await reconcileTraineeToPlanVersion(traineeId, v2.id, trainer.id), { preserved: 0, archived: 0, injected: 0 });
    }
    console.log("PASS: rename, reorder, add two, remove verified and empty path; all row IDs, statuses, notes, dates and hashes preserved; passport labels/exemption and assignment pointers correct.");
    const v3 = await savePlanVersion({ ...input, nodes: [...nodesV2, ...additions], pathTitles: { TECHNICAL: "Daily operations", LEADERSHIP: "Team leadership" } }); await publishPlanVersion({ versionId: v3.id, syncTrainees: false }, trainer.id);
    const late = await prisma.trainee.create({ data: { traineeCode: `PATH-${suffix}-late`, fullName: "Later subscriber", email: "late@example.invalid", restaurantBrand: "Test", branchLocation: "Test", cohortBatch: "Path editing regression", hireDate: new Date() } }); trainees.push(late.id);
    await assignPlanToTrainee({ traineeId: late.id, planVersionId: v3.id, assignedById: trainer.id });
    const v4 = await savePlanVersion({ ...input, nodes: [...nodesV2, ...additions], pathTitles: { TECHNICAL: "Final operations", LEADERSHIP: "Team leadership" } });
    const catchup = await publishPlanVersion({ versionId: v4.id, syncTrainees: true }, trainer.id); assert.equal(catchup.reconcileResult?.migratedTraineesCount, 3);
    assert.equal(await prisma.traineePlanAssignment.count({ where: { traineeId: { in: trainees }, status: "ACTIVE", planVersionId: v4.id } }), 3);
    assert.equal(await prisma.traineeProgress.count({ where: { traineeId: { in: trainees } } }), 47);
    const preserved = await prisma.traineeProgress.findUniqueOrThrow({ where: { id: original.find(row => row.planNodeId === verified.id)!.id } }); assert.equal(preserved.status, "VERIFIED"); assert.equal(preserved.verificationHash, original.find(row => row.id === preserved.id)!.verificationHash);
    const counts = await getPlanMilestoneProgressCounts(planId); assert.equal(counts[`code:${verified.code.toUpperCase()}`], 3);
    console.log("PASS: sync catches trainees on both older versions, keeps audits intact, and exposes accurate progress-warning counts.");
    const v5 = await savePlanVersion({ ...input, nodes: [...nodesV2, ...additions] });
    const beforeRollback = await prisma.traineeProgress.findMany({ where: { traineeId: trainees[0] }, orderBy: { id: "asc" } });
    await assert.rejects(prisma.$transaction(async tx => { await reconcileTraineeToPlanVersion(trainees[0], v5.id, trainer.id, tx); throw new Error("Intentional rollback"); }, { timeout: 60_000 }), /Intentional rollback/);
    assert.deepEqual(await prisma.traineeProgress.findMany({ where: { traineeId: trainees[0] }, orderBy: { id: "asc" } }), beforeRollback);
    assert.equal((await prisma.traineePlanAssignment.findFirstOrThrow({ where: { traineeId: trainees[0], status: "ACTIVE" } })).planVersionId, v4.id);
    console.log("PASS: a failed reconcile rolls back both progress changes and assignment switches.");
  } finally {
    if (trainees.length) await prisma.trainee.deleteMany({ where: { id: { in: trainees } } });
    if (planId) await prisma.trainingPlan.delete({ where: { id: planId } });
    await prisma.milestoneDefinition.deleteMany({ where: { id: { in: definitions.map(node => node.id) } } });
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
