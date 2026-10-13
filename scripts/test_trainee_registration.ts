import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { createRegisteredTrainee } from "../lib/db/repositories/registration";
import { validateRegistration } from "../lib/trainee-registration";

async function main() {
  const input = { traineeCode: " tbg-2026-test ", fullName: " Maria Santos ", email: " MARIA@EXAMPLE.COM ", restaurantBrand: "TGI Fridays", branchLocation: "BGC", cohortBatch: "Cohort-2026-Q4", hireDate: "2026-10-13" };
  assert.equal(validateRegistration(input).values.email, "maria@example.com");
  assert.equal(validateRegistration({ ...input, email: "invalid" }).valid, false);
  assert.equal(validateRegistration({ ...input, hireDate: "2026-02-30" }).valid, false);
  assert.equal(validateRegistration({ ...input, fullName: " " }).valid, false);
  const url = `file:${join(mkdtempSync(join(tmpdir(), "passport-registration-")), "test.db")}`;
  writeFileSync(url.slice(5), "");
  execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "db", "push", "--skip-generate"], { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  const db = new PrismaClient({ datasourceUrl: url });
  try {
    const notConfigured = await createRegisteredTrainee(input, db);
    assert.equal(notConfigured.success, false);
    assert.equal(await db.trainee.count(), 0);
    for (const path of ["ONBOARDING", "TECHNICAL"]) await db.milestoneDefinition.create({ data: { path, orderIndex: 1, code: `${path}-01`, title: path, description: "Test milestone" } });
    const result = await createRegisteredTrainee(input, db);
    assert.equal(result.success, true);
    const trainee = await db.trainee.findUniqueOrThrow({ where: { id: result.trainee.id }, include: { progressRecords: true } });
    assert.equal(trainee.traineeCode, "TBG-2026-TEST");
    assert.equal(trainee.fullName, "Maria Santos");
    assert.equal(trainee.email, "maria@example.com");
    assert.equal(trainee.progressRecords.length, 2);
    assert(trainee.progressRecords.every(p => p.status === "IN_PROGRESS" && !p.verifiedBy));
    const duplicate = await createRegisteredTrainee(input, db);
    assert.equal(duplicate.success, false);
    if (!duplicate.success) assert(duplicate.errors?.traineeCode);
    assert.equal(await db.trainee.count(), 1);
    const invalid = await createRegisteredTrainee({ ...input, traineeCode: "different", email: "invalid" }, db);
    assert.equal(invalid.success, false);
    assert.equal(await db.trainee.count(), 1);
    console.log("Registration checks passed: normalization, invalid fields/dates, missing configuration, milestone initialization, duplicate rejection, and no partial records. Existing database untouched.");
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
