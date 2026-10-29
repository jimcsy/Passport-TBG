// node --env-file=.env --import tsx scripts/test_learning_paths.ts
// Uses an isolated PostgreSQL schema and drops it in finally; no live profile/progress records are changed.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { seedFoundationPlan } from "../lib/db/repositories/foundation";
import { getVariantEnrollmentCounts, createRoleVariant, editRoleVariant, deleteRoleVariant, promotePathInstance, ensureTraineePathInstance } from "../lib/db/repositories/learning-paths";
import { assignPlanToTrainee } from "../lib/db/repositories/assignments";
import { savePlanVersion, publishPlanVersion } from "../lib/db/repositories/plans";
import { FOUNDATION_PLAN_ID } from "../lib/constants/foundation";
import { getTraineePassportData } from "../lib/db/repositories/trainee";
import { verifyAssignedMilestones } from "../lib/db/repositories/verification";
import { verificationData } from "../lib/stamps/hash";
import type { PlanNodeInput } from "../lib/validations/plans";

async function main() {
  const schema = `learning_paths_test_${Date.now()}`;
  const base = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!base) throw new Error("Database environment required");
  const connection = new URL(base);
  const root = new PrismaClient({ datasourceUrl: connection.toString() });
  connection.searchParams.set("schema", schema);
  const db = new PrismaClient({ datasourceUrl: connection.toString() });
  try {
    await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "db", "push", "--skip-generate"], { env: { ...process.env, DATABASE_URL: connection.toString(), DIRECT_URL: connection.toString() }, stdio: "pipe" });
    const trainer = await db.adminUser.create({ data: { employeeId: "PATH-TEST", fullName: "Path Trainer", email: "paths@example.invalid", passwordHash: "fixture" } });
    await seedFoundationPlan(db, trainer.id);
    const master = await db.learningPath.findUniqueOrThrow({ where: { planId: FOUNDATION_PLAN_ID } });
    assert.equal(master.type, "MASTER"); assert.equal(master.isTemplate, true);
    const metadata = { title: "ERP Analyst Track", targetDepartment: "ERP Department", targetPosition: "Junior ERP Analyst" };
    const variant = await createRoleVariant(metadata, trainer.id, db);
    assert.equal(variant.parentId, master.id); assert.equal(variant.type, "VARIANT");
    assert.equal((await getVariantEnrollmentCounts([variant.id], db)).get(variant.id), 0);
    const original = await db.planVersion.findFirstOrThrow({ where: { planId: variant.planId }, include: { nodes: true, edges: true } });
    assert.equal(original.nodes.length, 20); assert.equal(original.status, "DRAFT");
    await assert.rejects(() => editRoleVariant({ ...metadata, targetPosition: "President", variantId: variant.id }, trainer.id, db));
    await publishPlanVersion({ versionId: original.id, syncTrainees: false }, trainer.id, db);
    const makeTrainee = (code: string) => db.trainee.create({ data: { traineeCode: code, fullName: code, email: `${code}@example.invalid`, department: "ERP Department", position: "Junior ERP Analyst", restaurantBrand: "Test", branchLocation: "Test", cohortBatch: "Test", hireDate: new Date() } });
    const a = await makeTrainee("PATH-A"), b = await makeTrainee("PATH-B");
    const unassigned = await getTraineePassportData(a.id, db);
    assert.equal(unassigned?.plan, null);
    assert.equal(await db.traineePlanAssignment.count({ where: { traineeId: a.id } }), 0);

    const first = await assignPlanToTrainee({ traineeId: a.id, planVersionId: original.id, assignedById: trainer.id }, db);
    const second = await assignPlanToTrainee({ traineeId: b.id, planVersionId: original.id, assignedById: trainer.id }, db);
    assert.equal((await getVariantEnrollmentCounts([variant.id], db)).get(variant.id), 2);
    const legacyCountTrainee = await makeTrainee("COUNT-LEGACY");
    await db.traineePlanAssignment.create({ data: { traineeId: legacyCountTrainee.id, planVersionId: original.id, assignedById: trainer.id } });
    assert.equal((await getVariantEnrollmentCounts([variant.id], db)).get(variant.id), 3);
    await ensureTraineePathInstance(legacyCountTrainee.id, db);
    assert.equal((await getVariantEnrollmentCounts([variant.id], db)).get(variant.id), 3);
    const foundationVersion = await db.planVersion.findFirstOrThrow({ where: { planId: FOUNDATION_PLAN_ID, status: "PUBLISHED" } });
    await assignPlanToTrainee({ traineeId: legacyCountTrainee.id, planVersionId: foundationVersion.id, assignedById: trainer.id }, db);
    assert.equal((await getVariantEnrollmentCounts([variant.id], db)).get(variant.id), 2);
    console.log("PASS: enrollment counts include active private and legacy assignments; conversion is counted once; reassignment excludes historical instances");
    assert.notEqual(first.assignment.planVersionId, original.id); assert.notEqual(first.assignment.planVersionId, second.assignment.planVersionId);
    const instance = await db.learningPath.findUniqueOrThrow({ where: { planId: first.assignment.planVersion.planId } });
    assert.equal(instance.type, "INSTANCE"); assert.equal(instance.traineeId, a.id); assert.equal(instance.parentId, variant.id);
    const nodes = await db.planNode.findMany({ where: { planVersionId: first.assignment.planVersionId }, orderBy: { code: "asc" } });
    const progress = await db.traineeProgress.findMany({ where: { traineeId: a.id }, orderBy: { id: "asc" } });
    const stamp = await db.traineeProgress.update({ where: { id: progress[0].id }, data: verificationData(a.id, progress[0].planNodeId, trainer.id, new Date(), "Original approval") });
    const pending = await db.traineeProgress.update({ where: { id: progress[1].id }, data: { status: "READY_FOR_REVIEW", requestedAt: new Date(), traineeNote: "Keep pending review" } });
    await editRoleVariant({ ...metadata, variantId: variant.id, title: "Renamed ERP Track" }, trainer.id, db);
    assert.equal((await db.learningPath.findUniqueOrThrow({ where: { id: variant.id } })).title, "Renamed ERP Track");
    assert.equal((await db.trainingPlan.findUniqueOrThrow({ where: { id: variant.planId } })).title, "Renamed ERP Track");
    assert.equal((await db.learningPath.findUniqueOrThrow({ where: { id: instance.id } })).title, "ERP Analyst Track");
    assert.deepEqual(await db.traineeProgress.findUnique({ where: { id: stamp.id } }), stamp);
    // Variant node editing creates a draft, never edits a published snapshot or private instance.
    const graphNodes = original.nodes.map(node => ({ ...node, path: node.path as PlanNodeInput["path"], orderIndex: node.code === "ONB-01" ? 2 : node.code === "ONB-02" ? 1 : node.orderIndex }));
    await editRoleVariant({ ...metadata, variantId: variant.id, title: "Renamed ERP Track", graph: { nodes: graphNodes, edges: [] } }, trainer.id, db);
    assert.deepEqual(await db.planNode.findMany({ where: { planVersionId: first.assignment.planVersionId }, orderBy: { code: "asc" } }), nodes);
    assert.equal((await db.planNode.findFirstOrThrow({ where: { planVersionId: original.id, code: "ONB-01" } })).orderIndex, 1);
    await assert.rejects(() => editRoleVariant({ ...metadata, variantId: variant.id, title: "Must roll back", graph: { nodes: [graphNodes[0], graphNodes[0]], edges: [] } }, trainer.id, db));
    assert.equal((await db.learningPath.findUniqueOrThrow({ where: { id: variant.id } })).title, "Renamed ERP Track");
    console.log("PASS: master/variant hierarchy, independent trainee instances, rename isolation, atomic metadata/node editing and published snapshot preservation");

    const custom: PlanNodeInput = { code: "ERP-EXTRA", title: "ERP custom competency", description: "Additional individual requirement", path: "TECHNICAL", orderIndex: 5, posX: 0, posY: 0, isCustom: true };
    const modified = await savePlanVersion({ planId: instance.planId, publishedById: trainer.id, status: "DRAFT", nodes: [...nodes.map(node => ({ ...node, path: node.path as PlanNodeInput["path"] })), custom], edges: [{ sourceNodeId: nodes[0].id, targetNodeId: nodes[1].id, edgeType: "SEQUENCE_HINT" }] }, db);
    await publishPlanVersion({ versionId: modified.id, syncTrainees: true }, trainer.id, db);
    const kept = await db.traineeProgress.findUniqueOrThrow({ where: { id: stamp.id } });
    assert.equal(kept.status, stamp.status); assert.equal(kept.verificationHash, stamp.verificationHash); assert.deepEqual(kept.verifiedAt, stamp.verifiedAt); assert.equal(kept.trainerNote, stamp.trainerNote);
    const keptPending = await db.traineeProgress.findUniqueOrThrow({ where: { id: pending.id } });
    assert.equal(keptPending.status, pending.status); assert.deepEqual(keptPending.requestedAt, pending.requestedAt);
    assert.equal(await db.traineeProgress.count({ where: { traineeId: a.id } }), 21);
    assert.equal(await db.traineeProgress.count({ where: { traineeId: b.id } }), 20);
    const beforePromote = await db.traineeProgress.findMany({ where: { traineeId: a.id }, orderBy: { id: "asc" } });
    const promoted = await promotePathInstance({ instanceId: instance.id, variantTitle: "Custom ERP Track", department: metadata.targetDepartment, position: metadata.targetPosition }, trainer.id, db);
    const promotedVersion = await db.planVersion.findFirstOrThrow({ where: { planId: promoted.planId }, include: { nodes: true, edges: true } });
    assert.equal(promoted.parentId, master.id); assert.equal(promotedVersion.status, "DRAFT"); assert.equal(promotedVersion.nodes.length, 21); assert.equal(promotedVersion.edges.length, 1);
    assert.ok(promotedVersion.nodes.every(node => !modified.nodes.some(old => old.id === node.id)));
    assert.equal(await db.traineeProgress.count({ where: { planNode: { planVersionId: promotedVersion.id } } }), 0);
    assert.deepEqual(await db.traineeProgress.findMany({ where: { traineeId: a.id }, orderBy: { id: "asc" } }), beforePromote);
    await assert.rejects(() => promotePathInstance({ instanceId: variant.id, variantTitle: "Invalid promotion", department: metadata.targetDepartment, position: metadata.targetPosition }, trainer.id, db));
    await assert.rejects(() => deleteRoleVariant(master.id, db)); await assert.rejects(() => deleteRoleVariant(instance.id, db));
    await deleteRoleVariant(variant.id, db);
    await assert.rejects(() => assignPlanToTrainee({ traineeId: b.id, planVersionId: original.id, assignedById: trainer.id }, db));
    assert.deepEqual(await db.traineeProgress.findMany({ where: { traineeId: a.id }, orderBy: { id: "asc" } }), beforePromote);
    assert.equal((await db.traineePlanAssignment.findFirstOrThrow({ where: { traineeId: a.id, status: "ACTIVE" } })).planVersionId, modified.id);
    console.log("PASS: individual append/publish preserves stamps and pending reviews, promotion copies definitions/edges only, deletion archives without affecting existing instances");

    const legacy = await makeTrainee("LEGACY");
    const masterVersion = await db.planVersion.findFirstOrThrow({ where: { planId: FOUNDATION_PLAN_ID } });
    const masterNodes = await db.planNode.findMany({ where: { planVersionId: masterVersion.id } });
    await db.traineePlanAssignment.create({ data: { traineeId: legacy.id, planVersionId: masterVersion.id, assignedById: trainer.id } });
    await db.traineeProgress.createMany({ data: masterNodes.map(node => ({ traineeId: legacy.id, planNodeId: node.id, status: "IN_PROGRESS" })) });
    const legacyProgress = await db.traineeProgress.findFirstOrThrow({ where: { traineeId: legacy.id } });
    const legacyStamp = await db.traineeProgress.update({ where: { id: legacyProgress.id }, data: verificationData(legacy.id, legacyProgress.planNodeId, trainer.id, new Date(), "Legacy stamp") });
    const converted = await ensureTraineePathInstance(legacy.id, db);
    assert.ok(converted); assert.equal(converted.type, "INSTANCE");
    assert.equal((await ensureTraineePathInstance(legacy.id, db))?.id, converted.id);
    const legacyKept = await db.traineeProgress.findUniqueOrThrow({ where: { id: legacyStamp.id } });
    assert.equal(legacyKept.verificationHash, legacyStamp.verificationHash); assert.equal(legacyKept.status, legacyStamp.status);
    assert.equal(await db.learningPath.count({ where: { traineeId: legacy.id } }), 1);
    assert.equal(await db.traineeProgress.count({ where: { traineeId: legacy.id } }), 20);
    await assert.rejects(() => assignPlanToTrainee({ traineeId: b.id, planVersionId: modified.id, assignedById: trainer.id }, db));
    console.log("PASS: idempotent legacy conversion retains original progress IDs/hashes; another trainee's instance cannot be assigned");
    const assignedNodes = await db.planNode.findMany({ where: { planVersionId: modified.id } });
    const available = await db.traineeProgress.findFirstOrThrow({ where: { traineeId: a.id, status: "IN_PROGRESS", planNode: { libraryMilestoneId: { not: null }, code: { not: "ERP-EXTRA" } } }, include: { planNode: true } });
    await verifyAssignedMilestones([a.id, b.id], available.planNode.libraryMilestoneId!, trainer.id, "Batch approval", db);
    for (const traineeId of [a.id, b.id]) {
      const active = await db.traineePlanAssignment.findFirstOrThrow({ where: { traineeId, status: "ACTIVE" } });
      const approval = await db.traineeProgress.findFirstOrThrow({ where: { traineeId, status: "VERIFIED", planNode: { planVersionId: active.planVersionId, code: available.planNode.code } } });
      assert.ok(approval.verificationHash); assert.notEqual(approval.planNodeId, original.nodes.find(node => node.code === available.planNode.code)?.id);
    }
    const approved = await db.traineeProgress.findUniqueOrThrow({ where: { id: available.id } });
    await verifyAssignedMilestones([a.id], available.planNodeId, trainer.id, "Should retain original award", db);
    assert.deepEqual(await db.traineeProgress.findUnique({ where: { id: available.id } }), approved);
    const beforeBatch = await db.traineeProgress.findMany({ where: { traineeId: { in: [a.id, b.id] } }, orderBy: { id: "asc" } });
    await assert.rejects(() => verifyAssignedMilestones([a.id, b.id], assignedNodes.find(node => node.code === "ERP-EXTRA")!.id, trainer.id, "Must roll back", db));
    assert.deepEqual(await db.traineeProgress.findMany({ where: { traineeId: { in: [a.id, b.id] } }, orderBy: { id: "asc" } }), beforeBatch);
    console.log("PASS: batch sign-off resolves each private node, repeat approval retains original stamp, and incompatible batches roll back atomically");

  } finally {
    await db.$disconnect(); await root.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await root.$disconnect();
  }
}
main().catch(error => { console.error(error instanceof assert.AssertionError ? error.message : "Learning-path test failed; connection details redacted."); process.exitCode = 1; });
