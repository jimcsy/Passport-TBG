// node --env-file=.env --import tsx scripts/test_trainee_registration.ts
// All database operations use a temporary PostgreSQL schema, removed in finally.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { createRegisteredTrainee } from "../lib/db/repositories/registration";
import { seedFoundationPlan } from "../lib/db/repositories/foundation";
import { validateRegistration } from "../lib/trainee-registration";
import { TBG_ORG } from "../lib/constants/tbg-org";
import { FOUNDATION_PLAN_ID, FOUNDATION_PLAN_TITLE, FOUNDATION_PILLARS } from "../lib/constants/foundation";
import { assignPlanToTrainee } from "../lib/db/repositories/assignments";
import { reconcileTraineeToPlanVersion } from "../lib/db/services/reconcile";

async function main() {
  const input = { traineeCode: " tbg-2026-test ", fullName: " Maria Santos ", email: " MARIA@EXAMPLE.COM ", department: "ICT Department", position: "Application Developer", restaurantBrand: "Corporate Head Office", branchLocation: "BGC", cohortBatch: "Cohort-2026-Q4", hireDate: "2026-10-13" };
  assert.equal(Object.keys(TBG_ORG).length, 18);
  for (const [department, positions] of Object.entries(TBG_ORG)) {
    for (const position of positions) assert.equal(validateRegistration({ ...input, department, position }).valid, true);
  }
  assert.equal(validateRegistration(input).values.email, "maria@example.com");
  for (const changes of [{ email: "invalid" }, { hireDate: "2026-02-30" }, { fullName: " " }, { department: "" }, { position: "" }, { department: "Unknown" }, { position: "President" }, { department: "toString" }]) {
    assert.equal(validateRegistration({ ...input, ...changes }).valid, false);
  }
  console.log("PASS: complete 18-department dictionary, required fields, membership validation and normalization");
  const schema = `registration_test_${Date.now()}`;
  const base = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!base) throw new Error("Database environment is required");
  const connection = new URL(base);
  const root = new PrismaClient({ datasourceUrl: connection.toString() });
  connection.searchParams.set("schema", schema);
  const testUrl = connection.toString();
  const db = new PrismaClient({ datasourceUrl: testUrl });
  try {
    await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "db", "push", "--skip-generate"], {
      env: { ...process.env, DATABASE_URL: testUrl, DIRECT_URL: testUrl }, stdio: "pipe",
    });
    assert.equal((await createRegisteredTrainee(input, db)).success, false);
    assert.equal(await db.trainee.count(), 0);
    const trainer = await db.adminUser.create({ data: { employeeId: "EMP-TEST", fullName: "Admin", email: "admin@test.invalid", passwordHash: "fixture" } });
    const bait = await db.trainingPlan.create({ data: { title: "Role-specific bait", roleIdentifier: "APPLICATION_DEVELOPER", createdById: trainer.id, isDefault: true, status: "PUBLISHED", versions: { create: { versionNumber: 1, publishedById: trainer.id } } }, include: { versions: true } });
    assert.equal((await createRegisteredTrainee({ ...input, planVersionId: bait.versions[0].id }, db)).success, false);
    await seedFoundationPlan(db, trainer.id);
    const version = await db.planVersion.findFirstOrThrow({ where: { planId: FOUNDATION_PLAN_ID }, include: { nodes: true, plan: true } });
    assert.equal(version.plan.title, FOUNDATION_PLAN_TITLE);
    assert.equal(version.nodes.length, 20);
    assert.deepEqual(FOUNDATION_PILLARS.map(pillar => pillar.sequence), [1, 2, 3, 4, 5]);
    for (const pillar of FOUNDATION_PILLARS) {
      const nodes = version.nodes.filter(node => node.path === pillar.path).sort((a, b) => a.orderIndex - b.orderIndex);
      assert.deepEqual(nodes.map(node => node.orderIndex), [1, 2, 3, 4]);
    }
    const result = await createRegisteredTrainee({ ...input, planVersionId: bait.versions[0].id }, db, trainer.id);
    assert.equal(result.success, true);
    if (!result.success) throw new Error("Registration unexpectedly failed");
    const trainee = await db.trainee.findUniqueOrThrow({ where: { id: result.trainee.id }, include: { progressRecords: true, planAssignments: true } });
    assert.equal(trainee.traineeCode, "TBG-2026-TEST");
    assert.equal(trainee.fullName, "Maria Santos");
    assert.equal(trainee.email, "maria@example.com");
    assert.equal(trainee.department, input.department);
    assert.equal(trainee.position, input.position);
    assert.equal(trainee.jobRole, input.position);
    assert.equal(trainee.planAssignments.length, 1);
    const instance = await db.learningPath.findFirstOrThrow({ where: { traineeId: trainee.id, type: "INSTANCE" } });
    assert.equal(instance.parentId, FOUNDATION_PLAN_ID);
    assert.notEqual(trainee.planAssignments[0].planVersionId, version.id);
    assert.equal(trainee.progressRecords.length, 20);
    assert(trainee.progressRecords.every(p => p.status === "IN_PROGRESS" && !p.verifiedBy && !p.isArchived));
    for (const [index, [department, positions]] of Object.entries(TBG_ORG).map((entry, index) => [index, entry] as const)) {
      const next = await createRegisteredTrainee({ ...input, traineeCode: `ORG-${index}`, department, position: positions[0] }, db);
      assert.equal(next.success, true);
    }
    assert.equal(await db.traineePlanAssignment.count({ where: { planVersion: { plan: { learningPath: { parentId: FOUNDATION_PLAN_ID, type: "INSTANCE" } } } } }), 19);
    assert.equal((await createRegisteredTrainee(input, db)).success, false);
    assert.equal((await createRegisteredTrainee({ ...input, traineeCode: "BAD-DEPT", position: "President" }, db)).success, false);
    assert.equal(await db.trainee.count(), 19);
    console.log("PASS: atomic persistence, all departments receive only the foundation, override ignored, duplicates/mismatches rejected");

    const stamp = await db.traineeProgress.update({ where: { id: trainee.progressRecords[0].id }, data: { status: "VERIFIED", verifiedBy: trainer.id, verifiedAt: new Date(), verificationHash: "original-awarded-stamp", traineeNote: "Reflection", trainerNote: "Feedback" } });
    const pending = await db.traineeProgress.update({ where: { id: trainee.progressRecords[1].id }, data: { status: "READY_FOR_REVIEW", requestedAt: new Date(), traineeNote: "Awaiting review" } });
    const snapshot = await db.planNode.findMany({ where: { planVersionId: version.id }, orderBy: { id: "asc" } });
    const draft = await db.planVersion.create({ data: { planId: FOUNDATION_PLAN_ID, versionNumber: 2, status: "DRAFT", publishedById: trainer.id, nodes: { create: [...version.nodes.map(({ id, planVersionId, createdAt, ...node }) => node), { path: "TECHNICAL", code: "ROLE-NEW", title: "Position-specific task", description: "Custom appended module", orderIndex: 5, posX: 0, posY: 0, isCustom: true }] } }, include: { nodes: true } });
    await seedFoundationPlan(db, trainer.id);
    assert.deepEqual(await db.planNode.findMany({ where: { planVersionId: version.id }, orderBy: { id: "asc" } }), snapshot);
    assert.deepEqual(await db.traineeProgress.findUnique({ where: { id: stamp.id } }), stamp);
    assert.deepEqual(await db.planVersion.findUnique({ where: { id: draft.id }, include: { nodes: true } }), draft);
    assert.equal(await db.trainingPlan.count({ where: { id: FOUNDATION_PLAN_ID } }), 1);
    assert.equal(await db.planVersion.count({ where: { planId: FOUNDATION_PLAN_ID } }), 2);
    console.log("PASS: repeat seeding preserves published snapshots, custom drafts, progress and stamps");
    // Drafts are never auto-assigned; after publishing, newly registered trainees receive the latest version and appended nodes.
    const prePublish = await createRegisteredTrainee({ ...input, traineeCode: "BEFORE-PUBLISH" }, db);
    assert.equal(prePublish.success, true);
    await db.planVersion.update({ where: { id: version.id }, data: { status: "SUPERSEDED" } });
    await db.planVersion.update({ where: { id: draft.id }, data: { status: "PUBLISHED" } });
    const next = await createRegisteredTrainee({ ...input, traineeCode: "AFTER-PUBLISH" }, db);
    assert.equal(next.success, true);
    if (!next.success) throw new Error("Registration unexpectedly failed");
    assert.equal(await db.traineeProgress.count({ where: { traineeId: next.trainee.id } }), 21);
    assert.equal((await db.learningPath.findFirstOrThrow({ where: { traineeId: next.trainee.id } })).sourceVersionId, draft.id);
    await assignPlanToTrainee({ traineeId: trainee.id, planVersionId: draft.id, assignedById: trainer.id }, db);
    const kept = await db.traineeProgress.findUniqueOrThrow({ where: { id: stamp.id } });
    assert.equal(kept.status, stamp.status); assert.equal(kept.verificationHash, stamp.verificationHash);
    assert.deepEqual(kept.verifiedAt, stamp.verifiedAt); assert.equal(kept.trainerNote, stamp.trainerNote);
    const keptPending = await db.traineeProgress.findUniqueOrThrow({ where: { id: pending.id } });
    assert.equal(keptPending.status, pending.status); assert.deepEqual(keptPending.requestedAt, pending.requestedAt);
    assert.equal(await db.traineeProgress.count({ where: { traineeId: trainee.id } }), 21);
    console.log("PASS: latest published version only, custom append assignment and reconciliation preserve awarded stamps/pending progress");
    const runSeed = (force = false) => execFileSync(process.execPath, ["--import", "tsx", "prisma/seed.ts"], {
      env: { ...process.env, DATABASE_URL: testUrl, DIRECT_URL: testUrl, FORCE_RESET: String(force) }, stdio: "pipe",
    });
    runSeed();
    const beforeReseed = {
      trainees: await db.trainee.findMany({ orderBy: { id: "asc" } }),
      assignments: await db.traineePlanAssignment.findMany({ orderBy: { id: "asc" } }),
      progress: await db.traineeProgress.findMany({ orderBy: { id: "asc" } }),
      versions: await db.planVersion.findMany({ orderBy: { id: "asc" } }),
      nodes: await db.planNode.findMany({ orderBy: { id: "asc" } }),
      trainers: await db.adminUser.findMany({ orderBy: { id: "asc" } }),
    };
    runSeed();
    assert.deepEqual({
      trainees: await db.trainee.findMany({ orderBy: { id: "asc" } }),
      assignments: await db.traineePlanAssignment.findMany({ orderBy: { id: "asc" } }),
      progress: await db.traineeProgress.findMany({ orderBy: { id: "asc" } }),
      versions: await db.planVersion.findMany({ orderBy: { id: "asc" } }),
      nodes: await db.planNode.findMany({ orderBy: { id: "asc" } }),
      trainers: await db.adminUser.findMany({ orderBy: { id: "asc" } }),
    }, beforeReseed);
    assert.throws(() => runSeed(true));
    assert.deepEqual(await db.traineeProgress.findMany({ orderBy: { id: "asc" } }), beforeReseed.progress);
    console.log("PASS: full seed rerun leaves profiles, credentials, versions, assignments and stamps unchanged; destructive reset rejected");
    // Incomplete baseline must fail closed, without partial trainee records.
    const missing = await db.planNode.findFirstOrThrow({ where: { planVersionId: draft.id, code: "ONB-01" } });
    await db.planNode.update({ where: { id: missing.id }, data: { code: "MISSING-BASELINE" } });
    assert.equal((await createRegisteredTrainee({ ...input, traineeCode: "INCOMPLETE" }, db)).success, false);
    assert.equal(await db.trainee.count({ where: { traineeCode: "INCOMPLETE" } }), 0);
  } finally {
    await db.$disconnect();
    await root.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await root.$disconnect();
  }
}
main().catch(error => { console.error(error instanceof assert.AssertionError ? error.message : "Registration test failed; connection details redacted. Check database access or test setup."); process.exitCode = 1; });
