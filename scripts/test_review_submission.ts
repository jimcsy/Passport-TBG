import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { queueMilestoneForReview } from "../lib/db/repositories/progress";

async function main() {
  const directory = mkdtempSync(join(tmpdir(), "passport-review-"));
  const db = new PrismaClient({ datasources: { db: { url: `file:${join(directory, "test.db")}` } } });
  try {
    const migration = readFileSync(new URL("../prisma/migrations/20261011052118_init/migration.sql", import.meta.url), "utf8");
    for (const statement of migration.split(";").filter(sql => sql.trim())) await db.$executeRawUnsafe(statement);
    const trainee = await db.trainee.create({ data: { traineeCode: "TEST-001", fullName: "Test Trainee", email: "test@example.com", restaurantBrand: "Test Brand", branchLocation: "Test Branch", cohortBatch: "Test Batch", hireDate: new Date() } });
    const trainer = await db.adminUser.create({ data: { employeeId: "TEST-TRAINER", fullName: "Test Trainer", email: "trainer@example.com", passwordHash: "fixture" } });
    const [fresh, active, locked] = await Promise.all(["new", "active", "locked"].map((code, orderIndex) => db.milestoneDefinition.create({ data: { code, orderIndex, path: "ONBOARDING", title: code, description: "Test milestone" } })));
    await db.traineeProgress.create({ data: { traineeId: trainee.id, milestoneId: active.id, status: "IN_PROGRESS" } });
    await db.traineeProgress.create({ data: { traineeId: trainee.id, milestoneId: locked.id, status: "LOCKED" } });
    assert.equal((await queueMilestoneForReview(trainee.id, fresh.id, "  Practiced orientation  ", db)).success, true);
    assert.equal((await queueMilestoneForReview(trainee.id, active.id, "", db)).success, true);
    const queue = await db.traineeProgress.findMany({ where: { status: "READY_FOR_REVIEW" }, include: { trainee: true, milestone: true } });
    assert.equal(queue.length, 2);
    const submitted = queue.find(item => item.milestoneId === fresh.id)!;
    assert.equal(submitted.traineeNote, "Practiced orientation");
    assert.equal(submitted.trainee.id, trainee.id);
    assert.ok(submitted.requestedAt);
    assert.equal(queue.find(item => item.milestoneId === active.id)!.traineeNote, null);
    assert.equal((await queueMilestoneForReview(trainee.id, fresh.id, "duplicate note", db)).success, false);
    const afterDuplicate = await db.traineeProgress.findUniqueOrThrow({ where: { id: submitted.id } });
    assert.equal(afterDuplicate.traineeNote, submitted.traineeNote);
    assert.deepEqual(afterDuplicate.requestedAt, submitted.requestedAt);
    assert.equal((await queueMilestoneForReview(trainee.id, locked.id, "", db)).success, false);
    assert.equal((await queueMilestoneForReview(trainee.id, "missing", "", db)).success, false);
    const approvedAt = new Date();
    await db.traineeProgress.update({ where: { id: submitted.id }, data: { status: "VERIFIED", verifiedBy: trainer.id, verifiedAt: approvedAt, trainerNote: "Observed and approved" } });
    assert.equal((await queueMilestoneForReview(trainee.id, fresh.id, "overwrite", db)).success, false);
    const approved = await db.traineeProgress.findUniqueOrThrow({ where: { id: submitted.id } });
    assert.equal(approved.status, "VERIFIED");
    assert.equal(approved.verifiedBy, trainer.id);
    assert.deepEqual(approved.verifiedAt, approvedAt);
    assert.equal(approved.trainerNote, "Observed and approved");
    assert.equal(approved.traineeNote, "Practiced orientation");
    console.log("Review submission checks passed: trainer queue, reflection, duplicate protection, locked state, and preserved approvals.");
  } finally {
    await db.$disconnect();
    rmSync(directory, { recursive: true, force: true });
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
