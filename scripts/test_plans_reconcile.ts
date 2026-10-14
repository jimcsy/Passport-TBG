import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import {
  createTrainingPlan,
  savePlanVersion,
  publishPlanVersion,
  getTrainingPlanById,
  listTrainingPlans,
  getLibraryMilestones,
} from "../lib/db/repositories/plans";
import {
  assignPlanToTrainee,
  bulkAssignPlanToCohort,
  getTraineeActivePlan,
} from "../lib/db/repositories/assignments";
import { DevelopmentPath, MilestoneStatus } from "../lib/types/models";

const prisma = new PrismaClient();

async function main() {
  console.log("🧪 Starting Comprehensive Test Suite for Dynamic Plans & Safe Reconcile...\n");

  // 1. Get or create a Trainer and Trainee for testing
  const trainer = await prisma.adminUser.findFirstOrThrow();
  const testTrainee = await prisma.trainee.upsert({
    where: { traineeCode: "TBG-RECONCILE-TEST" },
    update: {},
    create: {
      traineeCode: "TBG-RECONCILE-TEST",
      fullName: "Alex Rivera",
      email: "alex.rivera@test.bistro.com",
      restaurantBrand: "Italianni's",
      branchLocation: "Greenbelt",
      cohortBatch: "Cohort-2026-Test",
      hireDate: new Date(),
    },
  });

  // Clean up any prior test records for this test trainee
  await prisma.traineeProgress.deleteMany({ where: { traineeId: testTrainee.id } });
  await prisma.traineePlanAssignment.deleteMany({ where: { traineeId: testTrainee.id } });

  console.log(`✓ Using Trainer: ${trainer.fullName} (${trainer.employeeId})`);
  console.log(`✓ Using Test Trainee: ${testTrainee.fullName} (${testTrainee.traineeCode})\n`);

  // 2. Test getLibraryMilestones
  console.log("1️⃣ Testing BEAT Standard Milestone Library lookup...");
  const library = await getLibraryMilestones();
  assert(library.length >= 20, "Should load at least 20 canonical library milestones");
  const onboardingOnly = await getLibraryMilestones(DevelopmentPath.ONBOARDING);
  assert(onboardingOnly.length >= 4, "Should load Onboarding milestones");
  assert(onboardingOnly.every((m) => m.path === DevelopmentPath.ONBOARDING));
  console.log(`   ✓ Loaded ${library.length} standard BEAT milestones from catalog.`);

  // 3. Test createTrainingPlan
  console.log("\n2️⃣ Testing Plan Creation & Draft Version 1 Initialization...");
  const plan = await createTrainingPlan({
    title: "Specialty Barista Track",
    roleIdentifier: "BARISTA",
    restaurantBrand: "Italianni's",
    description: "Specialized coffee crafting and guest service track",
    isDefault: false,
    createdById: trainer.id,
  });

  assert.equal(plan.title, "Specialty Barista Track");
  assert.equal(plan.roleIdentifier, "BARISTA");
  assert.equal(plan.status, "DRAFT");
  assert.equal(plan.versions.length, 1);
  assert.equal(plan.versions[0].versionNumber, 1);
  assert.equal(plan.versions[0].status, "DRAFT");
  console.log(`   ✓ Created plan "${plan.title}" with Draft Version 1.`);

  // 4. Test savePlanVersion (Canvas State Persistence)
  console.log("\n3️⃣ Testing Canvas Node & Edge Persistence for Version 1...");
  const v1Saved = await savePlanVersion({
    planId: plan.id,
    publishedById: trainer.id,
    changelog: "Configured initial Barista track milestones",
    status: "PUBLISHED",
    nodes: [
      {
        path: DevelopmentPath.ONBOARDING,
        code: "BAR-ONB-01",
        title: "Barista Orientation",
        description: "Coffee station tour and safety protocols",
        orderIndex: 1,
        posX: 100,
        posY: 100,
        isCustom: true,
      },
      {
        path: DevelopmentPath.TECHNICAL,
        code: "BAR-TECH-01",
        title: "Espresso Machine Calibration",
        description: "Grind size, dose weight, and extraction time settings",
        orderIndex: 1,
        posX: 200,
        posY: 100,
        isCustom: true,
      },
      {
        path: DevelopmentPath.TECHNICAL,
        code: "BAR-TECH-02",
        title: "Milk Steaming & Microfoam Texturing",
        description: "Vortex technique and temperature control for latte art",
        orderIndex: 2,
        posX: 200,
        posY: 200,
        isCustom: true,
      },
    ],
    edges: [
      {
        sourceNodeId: "BAR-TECH-01",
        targetNodeId: "BAR-TECH-02",
        edgeType: "SEQUENCE_HINT",
      },
    ],
  });

  assert.equal(v1Saved.nodes.length, 3);
  assert.equal(v1Saved.edges.length, 1);
  console.log(`   ✓ Version 1 saved with 3 nodes and 1 sequence edge.`);

  // 5. Test publishPlanVersion
  console.log("\n4️⃣ Publishing Plan Version 1...");
  const { version: publishedV1 } = await publishPlanVersion(
    { versionId: v1Saved.id, syncTrainees: false, changelog: "Official Release v1" },
    trainer.id
  );
  assert.equal((publishedV1 as { status: string }).status, "PUBLISHED");
  console.log("   ✓ Version 1 officially published.");

  // 6. Test assignPlanToTrainee
  console.log("\n5️⃣ Testing Trainee Assignment & Progress Initialization...");
  const assignmentRes = await assignPlanToTrainee({
    traineeId: testTrainee.id,
    planVersionId: v1Saved.id,
    assignedById: trainer.id,
  });

  assert.equal(assignmentRes.assignment.status, "ACTIVE");
  assert.equal(assignmentRes.assignment.planVersionId, v1Saved.id);

  const initialProgress = await prisma.traineeProgress.findMany({
    where: { traineeId: testTrainee.id, isArchived: false },
  });
  assert.equal(initialProgress.length, 3, "Should seed 3 progress records for the 3 nodes");
  console.log(`   ✓ Enrolled ${testTrainee.fullName} with 3 active milestones.`);

  // 7. Simulate Trainee Work:
  // - BAR-TECH-01: Mark as VERIFIED
  // - BAR-TECH-02: Mark as READY_FOR_REVIEW
  // - BAR-ONB-01: Stays IN_PROGRESS
  console.log("\n6️⃣ Simulating Trainee Progress on Version 1...");
  const nodeTech01 = v1Saved.nodes.find((n) => n.code === "BAR-TECH-01")!;
  const nodeTech02 = v1Saved.nodes.find((n) => n.code === "BAR-TECH-02")!;

  await prisma.traineeProgress.update({
    where: {
      traineeId_planNodeId: {
        traineeId: testTrainee.id,
        planNodeId: nodeTech01.id,
      },
    },
    data: {
      status: MilestoneStatus.VERIFIED,
      verifiedBy: trainer.id,
      verifiedAt: new Date(),
      trainerNote: "Flawless calibration demonstrated.",
    },
  });

  await prisma.traineeProgress.update({
    where: {
      traineeId_planNodeId: {
        traineeId: testTrainee.id,
        planNodeId: nodeTech02.id,
      },
    },
    data: {
      status: MilestoneStatus.READY_FOR_REVIEW,
      traineeNote: "Practiced velvet microfoam for 2 hours.",
      requestedAt: new Date(),
    },
  });
  console.log("   ✓ BAR-TECH-01 marked VERIFIED.");
  console.log("   ✓ BAR-TECH-02 marked READY_FOR_REVIEW.");

  // 8. Test Safe Reconcile: Admin edits plan to create Version 2
  // Changes in Version 2:
  // - REMOVE: BAR-TECH-01 (the verified node!) -> should be preserved and soft-archived
  // - KEEP & UPDATE: BAR-TECH-02 (the ready for review node!)
  // - ADD NEW: BAR-COMM-01 (Guest Interaction)
  // - ADD NEW: BAR-LEAD-01 (Shift Station Lead)
  console.log("\n7️⃣ Admin Creates Version 2 with Removed, Modified, and New Nodes...");
  const v2Saved = await savePlanVersion({
    planId: plan.id,
    publishedById: trainer.id,
    changelog: "Version 2: Removed basic calibration, added Guest Service and Leadership",
    status: "DRAFT",
    nodes: [
      {
        path: DevelopmentPath.ONBOARDING,
        code: "BAR-ONB-01",
        title: "Barista Orientation",
        description: "Coffee station tour and safety protocols",
        orderIndex: 1,
        posX: 100,
        posY: 100,
        isCustom: true,
      },
      {
        path: DevelopmentPath.TECHNICAL,
        code: "BAR-TECH-02",
        title: "Milk Steaming & Advanced Latte Art",
        description: "Updated description for advanced microfoam texturing",
        orderIndex: 1,
        posX: 200,
        posY: 100,
        isCustom: true,
      },
      {
        path: DevelopmentPath.COMMUNICATION,
        code: "BAR-COMM-01",
        title: "Personalized Coffee Recommendations",
        description: "Engaging guests on bean origins and flavor profiles",
        orderIndex: 1,
        posX: 300,
        posY: 100,
        isCustom: true,
      },
      {
        path: DevelopmentPath.LEADERSHIP,
        code: "BAR-LEAD-01",
        title: "Beverage Station Shift Rush Lead",
        description: "Managing speed of service during peak morning rush",
        orderIndex: 1,
        posX: 400,
        posY: 100,
        isCustom: true,
      },
    ],
    edges: [],
  });

  assert.equal(v2Saved.versionNumber, 2, "Should create version 2");
  console.log(`   ✓ Created Version 2 with 4 nodes.`);

  // 9. Publish Version 2 with syncTrainees: true!
  console.log("\n8️⃣ Publishing Version 2 with 'Sync Active Trainees' (Safe Reconcile)...");
  const { reconcileResult } = await publishPlanVersion(
    {
      versionId: v2Saved.id,
      syncTrainees: true,
      changelog: "Publishing v2 with automatic trainee reconciliation",
    },
    trainer.id
  );

  assert(reconcileResult, "Reconcile result should be returned");
  assert.equal(reconcileResult.migratedTraineesCount, 1);
  console.log(
    `   ✓ Reconcile executed: ${reconcileResult.migratedTraineesCount} trainee migrated.`
  );
  console.log(`   - Preserved: ${reconcileResult.preservedProgressCount}`);
  console.log(`   - Archived: ${reconcileResult.archivedProgressCount}`);
  console.log(`   - Injected: ${reconcileResult.injectedProgressCount}`);

  // 10. Verify Safe Reconcile Guarantees
  console.log("\n9️⃣ Verifying Trainee Database State after Reconcile...");

  // Check assignment
  const activePlan = await getTraineeActivePlan(testTrainee.id);
  assert(activePlan);
  assert.equal(activePlan.planVersion.versionNumber, 2, "Active assignment must now point to v2");

  // Check verified milestone (BAR-TECH-01) was ARCHIVED, NOT DELETED
  const archivedTech01 = await prisma.traineeProgress.findFirst({
    where: {
      traineeId: testTrainee.id,
      planNodeId: nodeTech01.id,
    },
  });
  assert(archivedTech01, "Removed milestone progress must be preserved");
  assert.equal(archivedTech01.status, MilestoneStatus.VERIFIED);
  assert.equal(archivedTech01.isArchived, true);
  assert.equal(archivedTech01.archivedReason, "REMOVED_FROM_UPDATED_PLAN");
  assert.equal(archivedTech01.trainerNote, "Flawless calibration demonstrated.");
  console.log("   ✓ Verified milestone preserved with isArchived = true and audit log intact!");

  // Check READY_FOR_REVIEW milestone (BAR-TECH-02) was remapped to new v2 node
  const newTech02 = v2Saved.nodes.find((n) => n.code === "BAR-TECH-02")!;
  const remappedTech02 = await prisma.traineeProgress.findUnique({
    where: {
      traineeId_planNodeId: {
        traineeId: testTrainee.id,
        planNodeId: newTech02.id,
      },
    },
  });
  assert(remappedTech02, "BAR-TECH-02 must be remapped to the v2 node");
  assert.equal(remappedTech02.status, MilestoneStatus.READY_FOR_REVIEW);
  assert.equal(remappedTech02.traineeNote, "Practiced velvet microfoam for 2 hours.");
  console.log("   ✓ In-review milestone successfully remapped to v2 node with trainee note intact!");

  // Check newly added nodes were injected as IN_PROGRESS
  const newComm01 = v2Saved.nodes.find((n) => n.code === "BAR-COMM-01")!;
  const newLead01 = v2Saved.nodes.find((n) => n.code === "BAR-LEAD-01")!;

  const progressComm = await prisma.traineeProgress.findUnique({
    where: {
      traineeId_planNodeId: {
        traineeId: testTrainee.id,
        planNodeId: newComm01.id,
      },
    },
  });
  const progressLead = await prisma.traineeProgress.findUnique({
    where: {
      traineeId_planNodeId: {
        traineeId: testTrainee.id,
        planNodeId: newLead01.id,
      },
    },
  });
  assert(progressComm && progressComm.status === MilestoneStatus.IN_PROGRESS);
  assert(progressLead && progressLead.status === MilestoneStatus.IN_PROGRESS);
  console.log("   ✓ Newly added nodes injected with status = IN_PROGRESS.");

  // 11. Test listTrainingPlans & getTrainingPlanById
  console.log("\n🔟 Testing Plan Repository Listing & Detail Queries...");
  const allPlans = await listTrainingPlans();
  assert(allPlans.length >= 2, "Should list default plan and Barista plan");
  const baristaListed = allPlans.find((p) => p.roleIdentifier === "BARISTA");
  assert(baristaListed);
  assert.equal(baristaListed.latestVersionNumber, 2);
  assert.equal(baristaListed.assignedTraineesCount, 1);

  const planDetail = await getTrainingPlanById(plan.id);
  assert(planDetail);
  assert.equal(planDetail.versions.length, 2);
  assert.equal(planDetail.latestVersion?.versionNumber, 2);
  console.log(`   ✓ Plan list and detail queries returned accurate metadata.`);

  // 12. Test Bulk Cohort Assignment
  console.log("\n1️⃣1️⃣ Testing Bulk Cohort Assignment...");
  const bulkRes = await bulkAssignPlanToCohort({
    traineeIds: [testTrainee.id],
    planVersionId: v2Saved.id,
    assignedById: trainer.id,
  });
  assert.equal(bulkRes.assignedCount, 1);
  console.log(`   ✓ Bulk assignment successful (${bulkRes.assignedCount} assigned).`);

  console.log("\n🎉 ALL DYNAMIC PLANS & SAFE RECONCILE TESTS PASSED WITH 100% SUCCESS!");
}

main()
  .catch((e) => {
    console.error("❌ Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
