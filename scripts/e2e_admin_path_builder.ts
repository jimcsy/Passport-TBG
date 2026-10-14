import assert from "node:assert/strict";
import { prisma } from "../lib/db/prisma";
import {
  createTrainingPlan,
  savePlanVersion,
  publishPlanVersion,
  listTrainingPlans,
  getTrainingPlanById,
  getLibraryMilestones,
} from "../lib/db/repositories/plans";
import { assignPlanToTrainee } from "../lib/db/repositories/assignments";
import { getTraineePassportData } from "../lib/db/repositories/trainee";
import { DevelopmentPath, MilestoneStatus } from "../lib/types/models";

async function runE2EAdminPathBuilder() {
  console.log("🚀 Starting E2E Test: Admin Path Builder Full Workflow (Issue 5.1)...\n");

  // Step 1: Admin session lookup / fixture
  console.log("1️⃣ Finding or creating Admin Trainer...");
  let trainer = await prisma.adminUser.findFirst({
    where: { employeeId: "EMP-1001" },
  });
  if (!trainer) {
    trainer = await prisma.adminUser.create({
      data: {
        employeeId: "EMP-1001",
        fullName: "Chef Marco Reyes (Master Trainer)",
        email: "trainer@bistro.com.ph",
        passwordHash: "fixture-hash",
        role: "TRAINER",
      },
    });
  }
  console.log(`   ✓ Trainer active: ${trainer.fullName} (${trainer.employeeId})`);

  // Step 2: Create new Training Plan for "Barista Specialist"
  console.log("\n2️⃣ Admin creates new Training Plan for 'BARISTA' role...");
  const plan = await createTrainingPlan({
    title: "Specialty Barista Certification",
    roleIdentifier: "BARISTA",
    restaurantBrand: "TGI Fridays",
    description: "Advanced espresso extraction, latte art, and guest communication.",
    isDefault: false,
    createdById: trainer.id,
  });
  assert.ok(plan.id, "Plan ID must be generated");
  assert.equal(plan.versions.length, 1, "Initial draft version 1 created");
  const draftVersion = plan.versions[0];
  console.log(`   ✓ Created plan "${plan.title}" with Draft Version ${draftVersion.versionNumber}`);

  // Step 3: Fetch standard milestones catalog (Library Drawer)
  console.log("\n3️⃣ Inspecting Milestone Library Drawer...");
  const catalog = await getLibraryMilestones();
  assert.ok(catalog.length >= 10, "Standard catalog must contain library milestones");
  const onboardingMilestones = catalog.filter((m) => m.path === DevelopmentPath.ONBOARDING).slice(0, 3);
  assert.equal(onboardingMilestones.length, 3, "Found 3 onboarding library milestones");
  console.log(`   ✓ Selected 3 Onboarding competencies from Library Drawer.`);

  // Step 4: Simulate Canvas drag & drop of 3 library milestones + 2 custom milestones
  console.log("\n4️⃣ Simulating Canvas Node & Edge placement with auto-layout...");
  const nodesToSave = [
    // 3 from Library
    ...onboardingMilestones.map((m, idx) => ({
      path: DevelopmentPath.ONBOARDING,
      orderIndex: idx + 1,
      code: m.code,
      title: m.title,
      description: m.description,
      libraryMilestoneId: m.id,
      posX: 250,
      posY: 100 + idx * 120,
      isCustom: false,
    })),
    // 2 Custom milestones for Technical
    {
      path: DevelopmentPath.TECHNICAL,
      orderIndex: 1,
      code: "BAR-TECH-01",
      title: "Espresso Dial-In & Extraction Ratio",
      description: "Master grind calibration, tamp pressure, and 28-32s extraction window.",
      posX: 500,
      posY: 100,
      isCustom: true,
    },
    {
      path: DevelopmentPath.TECHNICAL,
      orderIndex: 2,
      code: "BAR-TECH-02",
      title: "Microfoam Texturing & Rosetta Pour",
      description: "Steaming glossy microfoam and executing clean rosetta latte art.",
      posX: 500,
      posY: 220,
      isCustom: true,
    },
  ];

  const edgesToSave = [
    {
      sourceNodeId: "BAR-TECH-01",
      targetNodeId: "BAR-TECH-02",
      edgeType: "SEQUENCE_HINT" as const,
    },
  ];

  const savedVersion = await savePlanVersion({
    planId: plan.id,
    publishedById: trainer.id,
    status: "DRAFT",
    changelog: "Configured 3 library + 2 custom milestones",
    nodes: nodesToSave,
    edges: edgesToSave,
  });
  assert.equal(savedVersion.nodes.length, 5, "Saved version must contain 5 nodes");
  assert.equal(savedVersion.edges.length, 1, "Saved version must contain 1 sequence edge");
  console.log(`   ✓ Saved canvas with 5 nodes across 2 paths and 1 dependency edge.`);

  // Step 5: Verify Plan Detail & Listing queries
  console.log("\n5️⃣ Verifying Plan status on admin directory...");
  const planDetail = await getTrainingPlanById(plan.id);
  assert.ok(planDetail, "Plan detail retrieved");
  assert.equal(planDetail.latestVersion?.nodes.length, 5);
  const planList = await listTrainingPlans({ roleIdentifier: "BARISTA" });
  assert.ok(planList.some((p) => p.id === plan.id), "Plan appears in filtered admin list");
  console.log(`   ✓ Plan verified in directory listing with draft status.`);

  // Step 6: Publish Plan as Version 1
  console.log("\n6️⃣ Admin publishes Plan Version 1...");
  const publishResult = await publishPlanVersion({
    versionId: savedVersion.id,
    changelog: "Official v1 release for Barista cohort training.",
    syncTrainees: false,
  });
  assert.equal((publishResult as any).version.status, "PUBLISHED");
  console.log(`   ✓ Plan Version 1 officially published.`);

  // Step 7: Create a test trainee & assign the new published plan
  console.log("\n7️⃣ Assigning Barista Plan to test trainee...");
  const traineeCode = `TBG-BARISTA-${Date.now()}`;
  const trainee = await prisma.trainee.create({
    data: {
      traineeCode,
      fullName: "Chloe Mendoza",
      email: `chloe.${Date.now()}@bistro.com.ph`,
      jobRole: "Barista",
      restaurantBrand: "TGI Fridays",
      branchLocation: "Bonifacio High Street",
      cohortBatch: "Cohort-2026-Barista",
      hireDate: new Date(),
    },
  });

  const assignResult = await assignPlanToTrainee({
    traineeId: trainee.id,
    planVersionId: savedVersion.id,
    assignedById: trainer.id,
  });
  assert.equal(assignResult.assignment.status, "ACTIVE");
  assert.equal(assignResult.reconcileStats.injected, 5, "Progress records initialized for all 5 nodes");
  console.log(`   ✓ Enrolled ${trainee.fullName} into ${plan.title} (5 active competencies).`);

  // Step 8: Verify Trainee Passport view reflects the custom plan
  console.log("\n8️⃣ Verifying Trainee Digital Passport reflects dynamic plan...");
  const passport = await getTraineePassportData(trainee.id);
  assert.ok(passport, "Passport view data returned");
  assert.ok(passport.plan, "Plan metadata present");
  assert.equal(passport.plan?.title, "Specialty Barista Certification");
  assert.equal(passport.plan?.versionNumber, 1);
  assert.equal(passport.stats.totalMilestones, 5, "Total milestones matches custom plan count (5, not 20!)");

  // Check Onboarding has 3 milestones, Technical has 2, others have 0 (Exempt)
  const onboarding = passport.paths.find((p) => p.path === DevelopmentPath.ONBOARDING);
  const technical = passport.paths.find((p) => p.path === DevelopmentPath.TECHNICAL);
  const leadership = passport.paths.find((p) => p.path === DevelopmentPath.LEADERSHIP);

  assert.equal(onboarding?.total, 3, "Onboarding has exactly 3 competencies");
  assert.equal(technical?.total, 2, "Technical has exactly 2 competencies");
  assert.equal(leadership?.total, 0, "Leadership has 0 competencies (Exempt for Barista role)");
  console.log(`   ✓ Onboarding: ${onboarding?.total} competencies`);
  console.log(`   ✓ Technical: ${technical?.total} competencies`);
  console.log(`   ✓ Leadership: ${leadership?.total} competencies (Exempt)`);
  console.log(`   ✓ Trainee passport dynamically adapts to assigned role plan.`);

  console.log("\n🎉 ISSUE 5.1 E2E ADMIN PATH BUILDER SUITE PASSED WITH 100% SUCCESS!\n");
}

runE2EAdminPathBuilder()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
