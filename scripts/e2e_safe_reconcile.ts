import assert from "node:assert/strict";
import { prisma } from "../lib/db/prisma";
import {
  createTrainingPlan,
  savePlanVersion,
  publishPlanVersion,
} from "../lib/db/repositories/plans";
import { assignPlanToTrainee } from "../lib/db/repositories/assignments";
import { getTraineePassportData } from "../lib/db/repositories/trainee";
import { reconcilePlanVersionSubscribers } from "../lib/db/services/reconcile";
import { DevelopmentPath, MilestoneStatus } from "../lib/types/models";

async function runE2ESafeReconcile() {
  console.log("🚀 Starting E2E Test: Safe Reconcile Cascading Engine (Issue 5.2)...\n");

  const trainer = await prisma.adminUser.findFirstOrThrow({
    where: { employeeId: "EMP-1001" },
  });

  // 1. Plan v1 published with 8 milestones across 3 paths
  console.log("1️⃣ Setting up Plan v1 with 8 milestones across Onboarding, Technical, and Culture...");
  const plan = await createTrainingPlan({
    title: "Kitchen Staff Master Track",
    roleIdentifier: "KITCHEN",
    restaurantBrand: "Italianni's",
    description: "Line cook and kitchen safety curriculum.",
    isDefault: false,
    createdById: trainer.id,
  });
  const draftV1 = plan.versions[0];

  const nodesV1 = [
    // 3 Onboarding
    { path: DevelopmentPath.ONBOARDING, orderIndex: 1, code: "KIT-ONB-01", title: "Kitchen Safety & PPE", description: "Slip-resistant footwear and cut gloves.", posX: 100, posY: 100 },
    { path: DevelopmentPath.ONBOARDING, orderIndex: 2, code: "KIT-ONB-02", title: "Chemical Sanitation Standards", description: "Dishwashing sanitizers and SDS sheets.", posX: 100, posY: 200 },
    { path: DevelopmentPath.ONBOARDING, orderIndex: 3, code: "KIT-ONB-03", title: "HACCP Food Safety", description: "Food storage temps and cross-contamination.", posX: 100, posY: 300 },
    // 3 Technical
    { path: DevelopmentPath.TECHNICAL, orderIndex: 1, code: "KIT-TECH-01", title: "Knife Skills: Brunoise & Julienne", description: "Precision vegetable cuts under 5 minutes.", posX: 350, posY: 100 },
    { path: DevelopmentPath.TECHNICAL, orderIndex: 2, code: "KIT-TECH-02", title: "Saute Station Expediting", description: "Operating 4 pans concurrently during rush.", posX: 350, posY: 200 },
    { path: DevelopmentPath.TECHNICAL, orderIndex: 3, code: "KIT-TECH-03", title: "Stock & Sauce Foundation", description: "Béchamel, marinara, and demi-glace bases.", posX: 350, posY: 300 },
    // 2 Culture
    { path: DevelopmentPath.CULTURE, orderIndex: 1, code: "KIT-CUL-01", title: "Kitchen Brigade Communication", description: "'Behind', 'Hot pan', and 'Heard' call-backs.", posX: 600, posY: 100 },
    { path: DevelopmentPath.CULTURE, orderIndex: 2, code: "KIT-CUL-02", title: "Shift Closing Team Cleanliness", description: "Line breakdown and prep list handoff.", posX: 600, posY: 200 },
  ];

  const v1Saved = await savePlanVersion({
    planId: plan.id,
    publishedById: trainer.id,
    status: "DRAFT",
    changelog: "Kitchen Staff Track initial release v1.",
    nodes: nodesV1.map((n) => ({ ...n, isCustom: false })),
    edges: [],
  });
  await publishPlanVersion({
    versionId: v1Saved.id,
    syncTrainees: false,
    changelog: "Kitchen Staff Track initial release v1.",
  });
  console.log(`   ✓ Published v1 with 8 milestones.`);

  // 2. Trainee assigned to v1
  console.log("\n2️⃣ Assigning test trainee to Plan v1...");
  const traineeCode = `TBG-KITCHEN-${Date.now()}`;
  const trainee = await prisma.trainee.create({
    data: {
      traineeCode,
      fullName: "Rafael Santos",
      email: `rafael.${Date.now()}@bistro.com.ph`,
      jobRole: "Kitchen Staff",
      restaurantBrand: "Italianni's",
      branchLocation: "Greenbelt 2",
      cohortBatch: "Cohort-2026-Cooks",
      hireDate: new Date(),
    },
  });

  const assignV1 = await assignPlanToTrainee({
    traineeId: trainee.id,
    planVersionId: v1Saved.id,
    assignedById: trainer.id,
  });
  assert.equal(assignV1.reconcileStats.injected, 8);
  console.log(`   ✓ Enrolled ${trainee.fullName} with 8 milestones in v1.`);

  // 3 & 4. Trainee marks 2 as READY_FOR_REVIEW, Trainer verifies 1 as VERIFIED
  console.log("\n3️⃣ Simulating trainee progress on v1...");
  const progressRecords = await prisma.traineeProgress.findMany({
    where: { traineeId: trainee.id, isArchived: false },
    include: { planNode: true },
  });

  const nodeVerified = progressRecords.find((p) => p.planNode.code === "KIT-ONB-01")!;
  const nodeReview1 = progressRecords.find((p) => p.planNode.code === "KIT-ONB-02")!;
  const nodeReview2 = progressRecords.find((p) => p.planNode.code === "KIT-TECH-01")!;

  // Verify KIT-ONB-01
  await prisma.traineeProgress.update({
    where: { id: nodeVerified.id },
    data: {
      status: MilestoneStatus.VERIFIED,
      verifiedBy: trainer.id,
      verifiedAt: new Date(),
      trainerNote: "Passed cut-glove and slip-shoe inspection with excellence.",
    },
  });

  // Ready for Review for KIT-ONB-02 and KIT-TECH-01
  await prisma.traineeProgress.update({
    where: { id: nodeReview1.id },
    data: {
      status: MilestoneStatus.READY_FOR_REVIEW,
      traineeNote: "Memorized all SDS sheets and proper quaternary sanitizing ppm levels.",
      requestedAt: new Date(),
    },
  });

  await prisma.traineeProgress.update({
    where: { id: nodeReview2.id },
    data: {
      status: MilestoneStatus.READY_FOR_REVIEW,
      traineeNote: "Demonstrated fine brunoise cuts to sous chef.",
      requestedAt: new Date(),
    },
  });

  console.log(`   ✓ KIT-ONB-01: VERIFIED`);
  console.log(`   ✓ KIT-ONB-02: READY_FOR_REVIEW`);
  console.log(`   ✓ KIT-TECH-01: READY_FOR_REVIEW`);

  // Admin edits plan:
  // 1. Removes the verified milestone (KIT-ONB-01) from canvas
  // 2. Adds 2 new milestones to Communication path (KIT-COMM-01, KIT-COMM-02)
  // 3. Modifies title of an existing milestone (KIT-ONB-02 -> "Advanced Chemical Sanitation & Safety")
  // 4. Publishes as v2 with "Sync Active Trainees" enabled
  console.log("\n4️⃣ Admin creates Version 2 modifications...");
  const v2Nodes = [
    // KIT-ONB-01 is REMOVED!
    // KIT-ONB-02 has modified title!
    { path: DevelopmentPath.ONBOARDING, orderIndex: 1, code: "KIT-ONB-02", title: "Advanced Chemical Sanitation & Safety (Updated)", description: "Chemical sanitizers, SDS sheets, and wash basin ppm logs.", posX: 100, posY: 100 },
    { path: DevelopmentPath.ONBOARDING, orderIndex: 2, code: "KIT-ONB-03", title: "HACCP Food Safety", description: "Food storage temps and cross-contamination.", posX: 100, posY: 200 },
    // Technical nodes kept
    { path: DevelopmentPath.TECHNICAL, orderIndex: 1, code: "KIT-TECH-01", title: "Knife Skills: Brunoise & Julienne", description: "Precision vegetable cuts under 5 minutes.", posX: 350, posY: 100 },
    { path: DevelopmentPath.TECHNICAL, orderIndex: 2, code: "KIT-TECH-02", title: "Saute Station Expediting", description: "Operating 4 pans concurrently during rush.", posX: 350, posY: 200 },
    { path: DevelopmentPath.TECHNICAL, orderIndex: 3, code: "KIT-TECH-03", title: "Stock & Sauce Foundation", description: "Béchamel, marinara, and demi-glace bases.", posX: 350, posY: 300 },
    // 2 New Communication milestones added!
    { path: DevelopmentPath.COMMUNICATION, orderIndex: 1, code: "KIT-COMM-01", title: "Expo Ticket Communication", description: "Order timing coordination with front-of-house.", posX: 600, posY: 100 },
    { path: DevelopmentPath.COMMUNICATION, orderIndex: 2, code: "KIT-COMM-02", title: "Allergen Alert Protocol", description: "Severe allergy kitchen handling protocols.", posX: 600, posY: 200 },
    // Culture kept
    { path: DevelopmentPath.CULTURE, orderIndex: 1, code: "KIT-CUL-01", title: "Kitchen Brigade Communication", description: "'Behind', 'Hot pan', and 'Heard' call-backs.", posX: 850, posY: 100 },
    { path: DevelopmentPath.CULTURE, orderIndex: 2, code: "KIT-CUL-02", title: "Shift Closing Team Cleanliness", description: "Line breakdown and prep list handoff.", posX: 850, posY: 200 },
  ]; // Total = 9 active nodes in v2

  const savedV2 = await savePlanVersion({
    planId: plan.id,
    publishedById: trainer.id,
    status: "DRAFT",
    changelog: "v2: Removed basic PPE, updated sanitation standards, and added 2 communication competencies.",
    nodes: v2Nodes.map((n) => ({ ...n, isCustom: false })),
    edges: [],
  });
  assert.equal(savedV2.versionNumber, 2);

  console.log("\n5️⃣ Publishing Version 2 with 'Sync Active Trainees' (Safe Reconcile)...");
  const publishV2Result = await publishPlanVersion({
    versionId: savedV2.id,
    changelog: "v2: Removed basic PPE, updated sanitation standards, and added 2 communication competencies.",
    syncTrainees: true,
  });

  assert.ok(publishV2Result.reconcileResult, "Reconcile result must be returned");
  console.log(`   ✓ Reconcile executed: ${publishV2Result.reconcileResult?.migratedTraineesCount} trainees migrated.`);
  console.log(`     - Preserved: ${publishV2Result.reconcileResult?.preservedProgressCount}`);
  console.log(`     - Archived: ${publishV2Result.reconcileResult?.archivedProgressCount}`);
  console.log(`     - Injected: ${publishV2Result.reconcileResult?.injectedProgressCount}`);

  // 6. Verify reconciliation results in database
  console.log("\n6️⃣ Verifying Trainee Database State after Reconcile...");

  // a. The verified milestone (KIT-ONB-01) is preserved with isArchived = true
  const archivedRecord = await prisma.traineeProgress.findFirst({
    where: { traineeId: trainee.id, isArchived: true },
    include: { planNode: true },
  });
  assert.ok(archivedRecord, "Archived record must exist");
  assert.equal(archivedRecord.planNode.code, "KIT-ONB-01");
  assert.equal(archivedRecord.status, MilestoneStatus.VERIFIED);
  assert.equal(archivedRecord.trainerNote, "Passed cut-glove and slip-shoe inspection with excellence.");
  console.log(`   ✓ Removed milestone KIT-ONB-01 safely archived with VERIFIED status and trainer note intact!`);

  // b. The READY_FOR_REVIEW milestone is remapped to new version node with trainee note
  const remappedReview = await prisma.traineeProgress.findFirst({
    where: { traineeId: trainee.id, isArchived: false, planNode: { code: "KIT-ONB-02" } },
    include: { planNode: true },
  });
  assert.ok(remappedReview, "KIT-ONB-02 must be active in v2");
  assert.equal(remappedReview.status, MilestoneStatus.READY_FOR_REVIEW);
  assert.equal(remappedReview.traineeNote, "Memorized all SDS sheets and proper quaternary sanitizing ppm levels.");
  assert.equal(remappedReview.planNode.planVersionId, savedV2.id, "Remapped to v2 node");
  console.log(`   ✓ In-review milestone successfully remapped to v2 node with trainee note intact!`);

  // c. 2 new progress records created with IN_PROGRESS status
  const newInjected = await prisma.traineeProgress.findMany({
    where: {
      traineeId: trainee.id,
      isArchived: false,
      planNode: { code: { in: ["KIT-COMM-01", "KIT-COMM-02"] } },
    },
  });
  assert.equal(newInjected.length, 2);
  assert(newInjected.every((p) => p.status === MilestoneStatus.IN_PROGRESS));
  console.log(`   ✓ 2 new Communication competencies injected with IN_PROGRESS status.`);

  // d. Assignments: Old is SUPERSEDED, new is ACTIVE
  const assignments = await prisma.traineePlanAssignment.findMany({
    where: { traineeId: trainee.id },
    orderBy: { assignedAt: "asc" },
  });
  assert.equal(assignments.length, 2);
  assert.equal(assignments[0].status, "SUPERSEDED", "v1 assignment marked SUPERSEDED");
  assert.equal(assignments[1].status, "ACTIVE", "v2 assignment is ACTIVE");
  assert.equal(assignments[1].planVersionId, savedV2.id);
  console.log(`   ✓ Old assignment SUPERSEDED, new v2 assignment ACTIVE.`);

  // e. Trainee digital passport reflection
  console.log("\n7️⃣ Auditing Trainee Digital Passport Data & Endorsements...");
  const passport = await getTraineePassportData(trainee.id);
  assert.ok(passport);
  assert.equal(passport.plan?.versionNumber, 2, "Passport shows v2");
  assert.equal(passport.stats.totalMilestones, 9, "Active milestone count is 9 (excludes archived)");
  assert.equal(passport.archivedMilestones.length, 1, "Exactly 1 preserved milestone on endorsement page");
  assert.equal(passport.archivedMilestones[0].code, "KIT-ONB-01");
  assert.equal(passport.archivedMilestones[0].status, MilestoneStatus.VERIFIED);

  // Check updated title
  const onbTrack = passport.paths.find((p) => p.path === DevelopmentPath.ONBOARDING);
  const updatedNode = onbTrack?.milestones.find((m) => m.code === "KIT-ONB-02");
  assert.equal(updatedNode?.title, "Advanced Chemical Sanitation & Safety (Updated)");
  console.log(`   ✓ Passport shows updated milestone title in live view.`);
  console.log(`   ✓ Preserved milestone visible in archivedMilestones for Notes & Endorsements page.`);

  // 8. Edge cases: Reconcile with 0 active trainees
  console.log("\n8️⃣ Testing Edge Cases...");
  const emptyPlan = await createTrainingPlan({
    title: "Empty Track Test",
    roleIdentifier: "TEST_EMPTY",
    isDefault: false,
    createdById: trainer.id,
  });
  const emptySaved = await savePlanVersion({
    planId: emptyPlan.id,
    publishedById: trainer.id,
    status: "DRAFT",
    changelog: "Empty plan test",
    nodes: [{ path: DevelopmentPath.ONBOARDING, orderIndex: 1, code: "EMP-01", title: "Emp", description: "Emp", posX: 0, posY: 0, isCustom: false }],
    edges: [],
  });
  const emptyReconcile = await reconcilePlanVersionSubscribers(emptySaved.id, emptySaved.id, trainer.id);
  assert.equal(emptyReconcile.migratedTraineesCount, 0, "No-op when 0 subscribers");
  console.log(`   ✓ Edge case passed: Reconcile with zero active trainees handled safely (no-op).`);

  console.log("\n🎉 ISSUE 5.2 SAFE RECONCILE E2E SUITE PASSED WITH 100% SUCCESS!\n");
}

runE2ESafeReconcile()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
