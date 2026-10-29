// node --env-file=.env --import tsx scripts/test_individual_publish.ts
// Entire fixture set lives in a disposable PostgreSQL schema.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { seedFoundationPlan } from "../lib/db/repositories/foundation";
import { createRoleVariant, getVariantEnrollmentCounts } from "../lib/db/repositories/learning-paths";
import { assignPlanToTrainee } from "../lib/db/repositories/assignments";
import { savePlanVersion, publishPlanVersion } from "../lib/db/repositories/plans";
import { commitIndividualPublish, previewIndividualPublish, getIndividualPublishContext } from "../lib/db/repositories/individual-publish";
import type { IndividualPublishInput } from "../lib/validations/individual-publish";
import type { EditableGraph } from "../lib/plans/merge";
import type { PlanNodeInput } from "../lib/validations/plans";
import { verificationData } from "../lib/stamps/hash";

async function main() {
  const schema = `scope_test_${Date.now()}`, connection = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL!);
  const root = new PrismaClient({ datasourceUrl: connection.toString() });
  connection.searchParams.set("schema", schema);
  const db = new PrismaClient({ datasourceUrl: connection.toString() });
  try {
    await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "db", "push", "--skip-generate"], { env: { ...process.env, DATABASE_URL: connection.toString(), DIRECT_URL: connection.toString() }, stdio: "pipe" });
    const trainer = await db.adminUser.create({ data: { employeeId: "SCOPE", fullName: "Scope Trainer", email: "scope@example.invalid", passwordHash: "fixture" } });
    await seedFoundationPlan(db, trainer.id);
    const variant = await createRoleVariant({ title: "Shared ICT Track", targetDepartment: "ICT Department", targetPosition: "Application Developer" }, trainer.id, db);
    const v1 = await db.planVersion.findFirstOrThrow({ where: { planId: variant.planId } });
    // Compact mode exercises the same scopes/rollback with four core nodes for a faster final regression.
    if (process.env.SCOPE_TEST_COMPACT === "1") await db.planNode.deleteMany({ where: { planVersionId: v1.id, path: { not: "ONBOARDING" } } });
    await publishPlanVersion({ versionId: v1.id, syncTrainees: false }, trainer.id, db);
    const trainees = [];
    for (const name of ["Alice", "Bob", "Carol"]) {
      const trainee = await db.trainee.create({ data: { traineeCode: name.toUpperCase(), fullName: name, email: `${name}@example.invalid`, department: "ICT Department", position: "Application Developer", restaurantBrand: "Test", branchLocation: "Test", cohortBatch: "Test", hireDate: new Date() } });
      await assignPlanToTrainee({ traineeId: trainee.id, planVersionId: v1.id, assignedById: trainer.id }, db); trainees.push(trainee);
    }
    const [a, b, c] = trainees;
    const active = async (id: string) => db.traineePlanAssignment.findFirstOrThrow({ where: { traineeId: id, status: "ACTIVE" }, include: { planVersion: { include: { nodes: true, edges: true } } } });
    const graph = (version: Awaited<ReturnType<typeof active>>["planVersion"]): EditableGraph => ({ nodes: version.nodes.map(node => ({ ...node, path: node.path as PlanNodeInput["path"] })), edges: version.edges.map(edge => ({ sourceNodeId: edge.sourceNodeId, targetNodeId: edge.targetNodeId, edgeType: edge.edgeType as "PARENT_CHILD" })), pathTitles: {} });
    const extra = (code: string): PlanNodeInput => ({ code, title: `${code} title`, description: `${code} custom requirement`, path: "TECHNICAL", orderIndex: 5, posX: 0, posY: 0, isCustom: true });
    const aa = await active(a.id), bb = await active(b.id), cc = await active(c.id);
    const bGraph = graph(bb.planVersion); bGraph.nodes = bGraph.nodes.map(node => node.code === "ONB-01" ? { ...node, title: "Bob's individual orientation" } : node).concat(extra("BOB-ONLY"));
    const bDraft = await savePlanVersion({ ...bGraph, planId: bb.planVersion.planId, publishedById: trainer.id, status: "DRAFT" }, db);
    await publishPlanVersion({ versionId: bDraft.id, syncTrainees: true }, trainer.id, db);
    const aProgress = await db.traineeProgress.findMany({ where: { traineeId: a.id }, include: { planNode: true } });
    const stamps = [];
    for (const code of ["ONB-01", "ONB-02"]) {
      const row = aProgress.find(record => record.planNode.code === code)!;
      stamps.push(await db.traineeProgress.update({ where: { id: row.id }, data: verificationData(a.id, row.planNodeId, trainer.id, new Date(), "Original award") }));
    }
    const pendingRow = aProgress.find(record => record.planNode.code === "ONB-03")!;
    const pending = await db.traineeProgress.update({ where: { id: pendingRow.id }, data: { status: "READY_FOR_REVIEW", requestedAt: new Date(), traineeNote: "Reflection" } });
    const context = await getIndividualPublishContext(aa.planVersion.planId, db);
    assert.equal(context.enrolledCount, 3); assert.equal(context.sharedAvailable, true);
    let edited = graph(aa.planVersion); edited.nodes = edited.nodes.filter(node => node.code !== "ONB-02").map(node => node.code === "ONB-01" ? { ...node, title: "Alice-only orientation" } : node).concat(extra("ALICE-ONLY"));
    let input: IndividualPublishInput = { planId: aa.planVersion.planId, graph: edited, scope: "individual", selectedTraineeIds: [] };
    let preview = await previewIndividualPublish(input, db);
    assert.equal(preview.impacts.length, 1); assert.equal(preview.impacts[0].archivedProgress, 1);
    // A stamp/note change after preview invalidates the confirmation and changes no assignments.
    await db.traineeProgress.update({ where: { id: pending.id }, data: { traineeNote: "New reflection after preview" } });
    await assert.rejects(() => commitIndividualPublish(input, preview.token, trainer.id, db), /fresh preview/);
    assert.equal((await active(a.id)).planVersionId, aa.planVersionId);
    preview = await previewIndividualPublish(input, db);
    const beforeB = await db.traineeProgress.findMany({ where: { traineeId: b.id }, orderBy: { id: "asc" } });
    await commitIndividualPublish(input, preview.token, trainer.id, db);
    assert.deepEqual(await db.traineeProgress.findMany({ where: { traineeId: b.id }, orderBy: { id: "asc" } }), beforeB);
    assert.equal((await active(c.id)).planVersionId, cc.planVersionId);
    assert.equal(await db.planVersion.count({ where: { planId: variant.planId } }), 1);
    assert.equal((await db.traineeProgress.findUniqueOrThrow({ where: { id: stamps[1].id } })).isArchived, true);
    assert.equal((await db.traineeProgress.findUniqueOrThrow({ where: { id: stamps[1].id } })).status, "VERIFIED");
    console.log("PASS: default individual scope updates only the source trainee, archives removals without losing stamps, and rejects stale previews");

    const source = await active(a.id); edited = graph(source.planVersion);
    edited.nodes = edited.nodes.filter(node => node.code !== "ONB-04").map(node => node.code === "ONB-01" ? { ...node, title: "Shared ICT orientation" } : node).concat(extra("SHARED-NEW"));
    input = { planId: aa.planVersion.planId, graph: edited, scope: "shared_variant", selectedTraineeIds: [a.id, b.id] };
    await assert.rejects(() => previewIndividualPublish({ ...input, selectedTraineeIds: [b.id] }, db), /Include the trainee/);
    const bCurrent = await active(b.id);
    const unfinished = await savePlanVersion({ ...graph(bCurrent.planVersion), planId: bCurrent.planVersion.planId, publishedById: trainer.id, status: "DRAFT" }, db);
    await assert.rejects(() => previewIndividualPublish(input, db), /unfinished individual draft/);
    await db.planVersion.delete({ where: { id: unfinished.id } });
    preview = await previewIndividualPublish(input, db);
    assert.equal(preview.impacts.length, 2); assert.ok(preview.impacts.find(impact => impact.traineeId === b.id)?.conflicts.some(item => item.includes("individual title")));
    // Force failure after the variant and source snapshots have been written: everything must roll back.
    const beforeAssignments = await db.traineePlanAssignment.findMany({ orderBy: { id: "asc" } });
    const beforeVersions = await db.planVersion.findMany({ orderBy: { id: "asc" } });
    const beforeProgress = await db.traineeProgress.findMany({ orderBy: { id: "asc" } });
    await db.$executeRawUnsafe(`CREATE FUNCTION "${schema}".reject_b() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'Intentional fixture rollback'; END; $$ LANGUAGE plpgsql`);
    await db.$executeRawUnsafe(`CREATE TRIGGER reject_b BEFORE UPDATE ON "${schema}"."TraineeProgress" FOR EACH ROW WHEN (NEW."traineeId" = '${b.id}') EXECUTE FUNCTION "${schema}".reject_b()`);
    await assert.rejects(() => commitIndividualPublish(input, preview.token, trainer.id, db));
    assert.deepEqual(await db.traineePlanAssignment.findMany({ orderBy: { id: "asc" } }), beforeAssignments);
    assert.deepEqual(await db.planVersion.findMany({ orderBy: { id: "asc" } }), beforeVersions);
    assert.deepEqual(await db.traineeProgress.findMany({ orderBy: { id: "asc" } }), beforeProgress);
    await db.$executeRawUnsafe(`DROP TRIGGER reject_b ON "${schema}"."TraineeProgress"`);
    await db.$executeRawUnsafe(`DROP FUNCTION "${schema}".reject_b()`);
    await commitIndividualPublish(input, preview.token, trainer.id, db);
    const bUpdated = await active(b.id);
    assert.equal(bUpdated.planVersion.nodes.find(node => node.code === "ONB-01")?.title, "Bob's individual orientation");
    assert.ok(bUpdated.planVersion.nodes.some(node => node.code === "BOB-ONLY"));
    assert.ok(bUpdated.planVersion.nodes.some(node => node.code === "SHARED-NEW"));
    assert.ok(bUpdated.planVersion.nodes.some(node => node.code === "ALICE-ONLY"));
    assert.equal((await active(c.id)).planVersionId, cc.planVersionId);
    const newShared = await db.planVersion.findFirstOrThrow({ where: { planId: variant.planId, status: "PUBLISHED" }, include: { nodes: true } });
    assert.equal(newShared.nodes.find(node => node.code === "ONB-01")?.title, "Shared ICT orientation");
    assert.ok(!newShared.nodes.some(node => node.code === "BOB-ONLY"));
    console.log("PASS: shared updates require explicit recipients, preserve local customizations, exclude unselected trainees, reject unfinished drafts, and roll back all changes on failure");

    const latest = await active(a.id); edited = graph(latest.planVersion); edited.nodes.push(extra("CURATED-ONLY"));
    input = { planId: aa.planVersion.planId, graph: edited, scope: "new_variant", variantTitle: "ICT Track — Alice", department: "ICT Department", position: "Application Developer" };
    preview = await previewIndividualPublish(input, db);
    const result = await commitIndividualPublish(input, preview.token, trainer.id, db);
    assert.ok(result.newVariantId);
    const ownerPath = await db.learningPath.findUniqueOrThrow({ where: { planId: aa.planVersion.planId } });
    assert.equal(ownerPath.parentId, result.newVariantId); assert.equal(ownerPath.title, "ICT Track — Alice");
    assert.equal((await getVariantEnrollmentCounts([variant.id, result.newVariantId!], db)).get(variant.id), 2);
    assert.equal((await getVariantEnrollmentCounts([variant.id, result.newVariantId!], db)).get(result.newVariantId!), 1);
    assert.equal((await active(b.id)).planVersionId, bUpdated.planVersionId);
    assert.equal(await db.traineeProgress.count({ where: { planNode: { planVersion: { planId: result.newVariantId } } } }), 0);
    for (const stamp of stamps) { const kept = await db.traineeProgress.findUniqueOrThrow({ where: { id: stamp.id } }); assert.equal(kept.verificationHash, stamp.verificationHash); assert.deepEqual(kept.verifiedAt, stamp.verifiedAt); assert.equal(kept.status, stamp.status); }
    assert.equal((await db.traineeProgress.findUniqueOrThrow({ where: { id: pending.id } })).status, "READY_FOR_REVIEW");
    console.log("PASS: curated variant publication relinks only its trainee, enrollment counts move correctly, and all original stamps/pending progress survive every scope");
    const legacy = await db.trainee.create({ data: { traineeCode: "LEGACY-SHARED", fullName: "Legacy recipient", email: "legacy@example.invalid", restaurantBrand: "Test", branchLocation: "Test", cohortBatch: "Test", hireDate: new Date() } });
    await db.traineePlanAssignment.create({ data: { traineeId: legacy.id, planVersionId: newShared.id, assignedById: trainer.id } });
    await db.traineeProgress.createMany({ data: newShared.nodes.map(node => ({ traineeId: legacy.id, planNodeId: node.id, status: "IN_PROGRESS" })) });
    const oldLegacyProgress = await db.traineeProgress.findFirstOrThrow({ where: { traineeId: legacy.id } });
    const legacyStamp = await db.traineeProgress.update({ where: { id: oldLegacyProgress.id }, data: verificationData(legacy.id, oldLegacyProgress.planNodeId, trainer.id, new Date(), "Legacy award") });
    const beforeLegacyA = (await active(a.id)).planVersionId;
    const bSource = await active(b.id);
    const legacyGraph = graph(bSource.planVersion); legacyGraph.nodes.push(extra("LEGACY-SHARED-NEW"));
    const legacyInput: IndividualPublishInput = { planId: bSource.planVersion.planId, graph: legacyGraph, scope: "shared_variant", selectedTraineeIds: [b.id, legacy.id] };
    const legacyPreview = await previewIndividualPublish(legacyInput, db);
    await commitIndividualPublish(legacyInput, legacyPreview.token, trainer.id, db);
    assert.equal((await db.learningPath.findFirstOrThrow({ where: { traineeId: legacy.id, type: "INSTANCE" } })).parentId, variant.id);
    assert.equal((await db.traineeProgress.findUniqueOrThrow({ where: { id: legacyStamp.id } })).verificationHash, legacyStamp.verificationHash);
    assert.equal((await active(a.id)).planVersionId, beforeLegacyA);
    assert.equal((await active(c.id)).planVersionId, cc.planVersionId);
    console.log("PASS: an explicitly selected legacy enrollment becomes a private instance during distribution, retains its stamp, and leaves all unselected trainees unchanged");
    const privateA = await active(a.id);
    const customNode = privateA.planVersion.nodes.find(node => node.code === "ALICE-ONLY")!;
    const customProgress = await db.traineeProgress.findUniqueOrThrow({ where: { traineeId_planNodeId: { traineeId: a.id, planNodeId: customNode.id } } });
    const customStamp = await db.traineeProgress.update({ where: { id: customProgress.id }, data: verificationData(a.id, customNode.id, trainer.id, new Date(), "Custom award") });
    const originalDefinition = await db.milestoneDefinition.findUniqueOrThrow({ where: { id: customNode.libraryMilestoneId! } });
    const renamedGraph = graph(privateA.planVersion); renamedGraph.nodes = renamedGraph.nodes.map(node => node.code === "ALICE-ONLY" ? { ...node, code: "ALICE-RENAMED", title: "Individual renamed competency" } : node);
    const renamedInput: IndividualPublishInput = { planId: privateA.planVersion.planId, graph: renamedGraph, scope: "individual" };
    const renamedPreview = await previewIndividualPublish(renamedInput, db);
    await commitIndividualPublish(renamedInput, renamedPreview.token, trainer.id, db);
    const customKept = await db.traineeProgress.findUniqueOrThrow({ where: { id: customStamp.id }, include: { planNode: true } });
    assert.equal(customKept.status, "VERIFIED"); assert.equal(customKept.isArchived, false); assert.equal(customKept.verificationHash, customStamp.verificationHash); assert.equal(customKept.planNode.code, "ALICE-RENAMED");
    assert.deepEqual(await db.milestoneDefinition.findUnique({ where: { id: originalDefinition.id } }), originalDefinition);
    console.log("PASS: private custom-code/title changes retain library identity, original active stamp and unchanged shared library metadata");


  } finally { await db.$disconnect(); await root.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await root.$disconnect(); }
}
main().catch(error => { console.error(error instanceof assert.AssertionError ? error.message : error.name + ": scope integration check failed (connection details redacted)"); process.exitCode = 1; });
