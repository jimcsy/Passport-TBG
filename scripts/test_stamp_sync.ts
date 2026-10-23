import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { prisma } from "../lib/db/prisma";
import { generateVerificationHash, verificationData } from "../lib/stamps/hash";
import { resolveStampDesign, STAMP_DESIGNS } from "../lib/stamps/catalog";
import { savePlanVersion } from "../lib/db/repositories/plans";
import { PlanNodeInputSchema } from "../lib/validations/plans";

async function main() {
  const at = new Date("2026-10-23T02:30:00.000Z");
  const expected = createHash("sha256").update(`trainee:node:trainer:${at.toISOString()}`).digest("hex");
  assert.equal(generateVerificationHash("trainee", "node", "trainer", at), expected);
  assert.notEqual(generateVerificationHash("other", "node", "trainer", at), expected);
  assert.equal(Object.keys(STAMP_DESIGNS).length, 8);
  for (const [path, design] of Object.entries({ ONBOARDING: "ONBOARDING_SEAL", COMMUNICATION: "COMMUNICATION_BADGE", TECHNICAL: "TECHNICAL_GEAR", CULTURE: "CULTURE_STAR", LEADERSHIP: "LEADERSHIP_CREST" })) assert.equal(resolveStampDesign(undefined, path), design);
  assert.equal(resolveStampDesign("BARISTA_BADGE", "TECHNICAL"), "BARISTA_BADGE");
  assert.equal(resolveStampDesign("toString", "TECHNICAL"), "TECHNICAL_GEAR");
  assert.equal(PlanNodeInputSchema.safeParse({ path: "TECHNICAL", code: "TS-01", title: "Testing", description: "Testing design validation", stampDesign: "INVALID" }).success, false);
  const trainer = await prisma.adminUser.findFirstOrThrow();
  let planId: string | undefined;
  let traineeId: string | undefined;
  try {
    const plan = await prisma.trainingPlan.create({ data: { title: "Stamp acceptance fixture", roleIdentifier: "STAMP_TEST", createdById: trainer.id } });
    planId = plan.id;
    const input = { planId, publishedById: trainer.id, status: "DRAFT" as const, nodes: [
      { path: "TECHNICAL" as const, code: "STAMP-TEST-01", title: "Stamp persistence", description: "Validate selected stamp persistence", orderIndex: 1, posX: 0, posY: 0, isCustom: false, stampDesign: "BARISTA_BADGE" },
      { path: "LEADERSHIP" as const, code: "STAMP-TEST-02", title: "Default stamp", description: "Validate path default persistence", orderIndex: 2, posX: 0, posY: 100, isCustom: false },
    ], edges: [] };
    const v1 = await savePlanVersion(input);
    assert.equal(v1.nodes.find(node => node.code === "STAMP-TEST-01")?.stampDesign, "BARISTA_BADGE");
    assert.equal(v1.nodes.find(node => node.code === "STAMP-TEST-02")?.stampDesign, "LEADERSHIP_CREST");
    await prisma.planVersion.update({ where: { id: v1.id }, data: { status: "PUBLISHED" } });
    const v2 = await savePlanVersion({ ...input, nodes: input.nodes.map(node => ({ ...node, stampDesign: "SERVICE_BADGE" })) });
    assert.equal((await prisma.planNode.findUniqueOrThrow({ where: { id: v1.nodes[0].id } })).stampDesign, v1.nodes[0].stampDesign);
    assert.ok(v2.nodes.every(node => node.stampDesign === "SERVICE_BADGE"));
    const trainee = await prisma.trainee.create({ data: { traineeCode: `STAMP-${Date.now()}`, fullName: "Stamp test", email: "stamp-test@example.invalid", restaurantBrand: "Test", branchLocation: "Test", cohortBatch: "Stamp test", hireDate: at } });
    traineeId = trainee.id;
    const approval = verificationData(trainee.id, v1.nodes[0].id, trainer.id, at, " Good work ");
    const progress = await prisma.traineeProgress.create({ data: { traineeId: trainee.id, planNodeId: v1.nodes[0].id, ...approval } });
    assert.equal(progress.verificationHash, generateVerificationHash(trainee.id, progress.planNodeId, trainer.id, progress.verifiedAt!));
    assert.equal(progress.trainerNote, "Good work");
    assert.equal(progress.status, "VERIFIED");
    assert.equal((await prisma.traineeProgress.findUniqueOrThrow({ where: { id: progress.id } })).verificationHash, progress.verificationHash);
    console.log("Stamp checks passed: hashes, all path defaults, validation, persisted designs, immutable versions, and persisted approval metadata.");
  } finally {
    if (traineeId) await prisma.trainee.delete({ where: { id: traineeId } });
    if (planId) await prisma.trainingPlan.delete({ where: { id: planId } });
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
