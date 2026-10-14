import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DevelopmentPath, MilestoneStatus, Role } from "../lib/types/models";

const prisma = new PrismaClient();

const CANONICAL_MILESTONES = [
  // 1. Onboarding
  {
    path: DevelopmentPath.ONBOARDING,
    orderIndex: 1,
    code: "ONB-01",
    title: "Orientation & Bistro Group Company History",
    description: "Overview of The Bistro Group culture, company heritage, and restaurant brands.",
  },
  {
    path: DevelopmentPath.ONBOARDING,
    orderIndex: 2,
    code: "ONB-02",
    title: "Food Safety, Sanitation & Hygiene Standards",
    description: "HACCP principles, cross-contamination prevention, sanitization schedules, and personal hygiene.",
  },
  {
    path: DevelopmentPath.ONBOARDING,
    orderIndex: 3,
    code: "ONB-03",
    title: "Store Tour, Safety Equipment & Emergency Protocols",
    description: "Walkthrough of fire exits, first aid kits, emergency shut-offs, and store safety readiness.",
  },
  {
    path: DevelopmentPath.ONBOARDING,
    orderIndex: 4,
    code: "ONB-04",
    title: "First 30 Days Check-in & Buddy Alignment",
    description: "Formal check-in with store trainer, buddy feedback evaluation, and passport orientation.",
  },

  // 2. Communication Skills
  {
    path: DevelopmentPath.COMMUNICATION,
    orderIndex: 1,
    code: "COMM-01",
    title: "Guest Welcoming & Table Greetings Etiquette",
    description: "Warm hospitality, 30-second table greeting standard, and positive first impressions.",
  },
  {
    path: DevelopmentPath.COMMUNICATION,
    orderIndex: 2,
    code: "COMM-02",
    title: "Active Listening & Order Clarification",
    description: "Order confirmation, special requests, allergy cross-checks, and proactive table attentiveness.",
  },
  {
    path: DevelopmentPath.COMMUNICATION,
    orderIndex: 3,
    code: "COMM-03",
    title: "Service Recovery & Resolving Guest Concerns",
    description: "Applying the LAST principle (Listen, Apologize, Solve, Thank) during dining concerns.",
  },
  {
    path: DevelopmentPath.COMMUNICATION,
    orderIndex: 4,
    code: "COMM-04",
    title: "Shift Handovers & Team Briefings",
    description: "Effective pre-shift briefing participation and station status handovers.",
  },

  // 3. Technical Skills
  {
    path: DevelopmentPath.TECHNICAL,
    orderIndex: 1,
    code: "TECH-01",
    title: "POS & Order Entry Competency",
    description: "Accurate order punching, seat numbering, modifier entries, and bill splitting.",
  },
  {
    path: DevelopmentPath.TECHNICAL,
    orderIndex: 2,
    code: "TECH-02",
    title: "Menu Knowledge, Allergen Guide & Recipe Specs",
    description: "Ingredient mastery, flavor profiles, allergen cross-references, and signature drink specs.",
  },
  {
    path: DevelopmentPath.TECHNICAL,
    orderIndex: 3,
    code: "TECH-03",
    title: "Table Service Sequence & Station Prep",
    description: "Mise en place standards, beverage delivery timing, food pacing, and plate clearing.",
  },
  {
    path: DevelopmentPath.TECHNICAL,
    orderIndex: 4,
    code: "TECH-04",
    title: "Station Closing, Auditing & Inventory Logs",
    description: "End-of-shift station teardown, sanitation sweep, waste logs, and stock replenishment.",
  },

  // 4. Personal Effectiveness & Culture
  {
    path: DevelopmentPath.CULTURE,
    orderIndex: 1,
    code: "CUL-01",
    title: "Core Bistro Values & Hospitality Heart",
    description: "Demonstrating passion for hospitality, integrity, positive energy, and pride in craft.",
  },
  {
    path: DevelopmentPath.CULTURE,
    orderIndex: 2,
    code: "CUL-02",
    title: "Teamwork Spirit & Cross-Station Support",
    description: "Collaboration during peak rushes, helping bussers/runners, and team synergy.",
  },
  {
    path: DevelopmentPath.CULTURE,
    orderIndex: 3,
    code: "CUL-03",
    title: "Grooming, Uniform Standards & Brand Ambassadorship",
    description: "Impeccable uniform presentation, grooming code compliance, and brand representation.",
  },
  {
    path: DevelopmentPath.CULTURE,
    orderIndex: 4,
    code: "CUL-04",
    title: "Peer Recognition & BEAT Spirit Champion",
    description: "Upholding team morale, recognizing colleagues' contributions, and living the BEAT spirit.",
  },

  // 5. Leadership Skills
  {
    path: DevelopmentPath.LEADERSHIP,
    orderIndex: 1,
    code: "LEAD-01",
    title: "Peer Mentorship & New Hire Buddying",
    description: "Guiding incoming trainees through their first shifts and providing supportive feedback.",
  },
  {
    path: DevelopmentPath.LEADERSHIP,
    orderIndex: 2,
    code: "LEAD-02",
    title: "Shift Rush Coordination & Station Ownership",
    description: "Maintaining calmness, pacing station queues, and guiding peers during sudden volume spikes.",
  },
  {
    path: DevelopmentPath.LEADERSHIP,
    orderIndex: 3,
    code: "LEAD-03",
    title: "Store Auditing & Quality Standard Enforcement",
    description: "Conducting pre-opening audits, line-checks, sanitation verification, and safety walk-throughs.",
  },
  {
    path: DevelopmentPath.LEADERSHIP,
    orderIndex: 4,
    code: "LEAD-04",
    title: "Capstone Presentation & Growth Passport Defense",
    description: "Presenting key development milestones, learnings, and personal growth goals to the general manager.",
  },
];

// Defined Role Plan Templates
const ROLE_TEMPLATES = [
  {
    planId: "plan-barista",
    title: "Specialty Barista Training Track",
    roleIdentifier: "BARISTA",
    description: "Tailored path focusing on beverage station excellence, hospitality greeting, and food safety.",
    isDefault: false,
    milestoneCodes: [
      "ONB-01", "ONB-02", "ONB-03", "ONB-04", // Full onboarding
      "COMM-01", "COMM-02",                   // Guest greeting & listening
      "TECH-01", "TECH-02", "TECH-04",        // POS, menu specs, station closing
      "CUL-01", "CUL-03",                     // Culture & grooming
      "LEAD-01",                              // Buddy mentorship
    ],
  },
  {
    planId: "plan-kitchen-staff",
    title: "Culinary & Kitchen Staff Track",
    roleIdentifier: "KITCHEN_STAFF",
    description: "Kitchen operations focusing on recipe specifications, line checks, HACCP safety, and station closing.",
    isDefault: false,
    milestoneCodes: [
      "ONB-01", "ONB-02", "ONB-03",           // Core safety & orientation
      "COMM-04",                              // Shift handovers & briefings
      "TECH-01", "TECH-02", "TECH-03", "TECH-04", // Full technical line skills
      "CUL-01", "CUL-02", "CUL-03",           // Teamwork, hygiene, values
      "LEAD-02",                              // Shift rush coordination
    ],
  },
  {
    planId: "plan-floor-server",
    title: "Dining Floor & Guest Service Specialist",
    roleIdentifier: "FLOOR_SERVER",
    description: "Front-of-house excellence focusing on table service sequence, guest hospitality, and service recovery.",
    isDefault: false,
    milestoneCodes: [
      "ONB-01", "ONB-02", "ONB-03", "ONB-04", // Full onboarding
      "COMM-01", "COMM-02", "COMM-03", "COMM-04", // Full communication & LAST method
      "TECH-01", "TECH-02", "TECH-03",        // POS, allergen guide, table sequence
      "CUL-01", "CUL-02", "CUL-04",           // Values, cross-station help, BEAT spirit
      "LEAD-01",                              // Peer mentorship
    ],
  },
  {
    planId: "plan-supervisor",
    title: "Store Supervisor & Shift Leader Track",
    roleIdentifier: "STORE_SUPERVISOR",
    description: "Comprehensive development path spanning all 5 paths with intensive leadership, quality audits, and capstone.",
    isDefault: false,
    milestoneCodes: CANONICAL_MILESTONES.map((m) => m.code), // All 20 milestones
  },
];

async function main() {
  console.log("🌱 Seeding The Bistro Group Growth Passport Database with Role-Based Plans...");

  // 1. Seed Admin Trainer
  const passwordHash = await bcrypt.hash("password123", 10);
  const trainer = await prisma.adminUser.upsert({
    where: { employeeId: "EMP-1001" },
    update: {
      fullName: "Chef Marco Reyes (Master Trainer)",
      role: Role.TRAINER,
      email: "trainer@bistro.com.ph",
      passwordHash,
    },
    create: {
      employeeId: "EMP-1001",
      fullName: "Chef Marco Reyes (Master Trainer)",
      email: "trainer@bistro.com.ph",
      passwordHash,
      role: Role.TRAINER,
    },
  });
  console.log(`✓ Admin Trainer seeded: ${trainer.fullName} (${trainer.employeeId})`);

  // 2. Seed Trainee
  const trainee = await prisma.trainee.upsert({
    where: { traineeCode: "TBG-2024-001" },
    update: {
      fullName: "Juan Dela Cruz",
      email: "trainee@bistro.com.ph",
      restaurantBrand: "TGI Fridays",
      branchLocation: "Bonifacio High Street",
      cohortBatch: "Cohort-2024-Q4",
      jobRole: "Barista",
      hireDate: new Date("2024-10-01T00:00:00Z"),
    },
    create: {
      traineeCode: "TBG-2024-001",
      fullName: "Juan Dela Cruz",
      email: "trainee@bistro.com.ph",
      restaurantBrand: "TGI Fridays",
      branchLocation: "Bonifacio High Street",
      cohortBatch: "Cohort-2024-Q4",
      jobRole: "Barista",
      hireDate: new Date("2024-10-01T00:00:00Z"),
    },
  });
  console.log(`✓ Trainee seeded: ${trainee.fullName} (${trainee.traineeCode}, Role: ${trainee.jobRole})`);

  // 3. Seed Milestone Definitions (BEAT Standard Library)
  console.log("⏳ Seeding 20 canonical milestones in BEAT Standard Library...");
  const milestoneMap = new Map<string, typeof CANONICAL_MILESTONES[0] & { id: string }>();

  for (const m of CANONICAL_MILESTONES) {
    const record = await prisma.milestoneDefinition.upsert({
      where: { code: m.code },
      update: {
        title: m.title,
        description: m.description,
        path: m.path,
        orderIndex: m.orderIndex,
        isStandard: true,
      },
      create: {
        code: m.code,
        title: m.title,
        description: m.description,
        path: m.path,
        orderIndex: m.orderIndex,
        isStandard: true,
      },
    });
    milestoneMap.set(m.code, { ...m, id: record.id });
  }
  console.log(`✓ Seeded ${milestoneMap.size} milestones into BEAT Library.`);

  // 4. Seed Universal Baseline Default Plan
  console.log("⏳ Seeding Universal Baseline Plan...");
  const universalPlan = await prisma.trainingPlan.upsert({
    where: { id: "universal-default-plan" },
    update: {
      title: "Universal BEAT Development Track",
      roleIdentifier: "UNIVERSAL_DEFAULT",
      isDefault: true,
      status: "PUBLISHED",
      createdById: trainer.id,
    },
    create: {
      id: "universal-default-plan",
      title: "Universal BEAT Development Track",
      roleIdentifier: "UNIVERSAL_DEFAULT",
      isDefault: true,
      status: "PUBLISHED",
      createdById: trainer.id,
    },
  });

  const universalVersion = await prisma.planVersion.upsert({
    where: {
      planId_versionNumber: {
        planId: universalPlan.id,
        versionNumber: 1,
      },
    },
    update: {
      status: "PUBLISHED",
      publishedById: trainer.id,
    },
    create: {
      id: "universal-default-plan-v1",
      planId: universalPlan.id,
      versionNumber: 1,
      status: "PUBLISHED",
      publishedById: trainer.id,
      changelog: "Universal baseline development track covering all 5 paths",
    },
  });

  const universalNodeMap = new Map<string, string>();
  for (const m of CANONICAL_MILESTONES) {
    const libraryMilestone = milestoneMap.get(m.code)!;
    const nodeId = `node_${m.code}`;
    const node = await prisma.planNode.upsert({
      where: { id: nodeId },
      update: {
        planVersionId: universalVersion.id,
        libraryMilestoneId: libraryMilestone.id,
        path: m.path,
        code: m.code,
        title: m.title,
        description: m.description,
        orderIndex: m.orderIndex,
      },
      create: {
        id: nodeId,
        planVersionId: universalVersion.id,
        libraryMilestoneId: libraryMilestone.id,
        path: m.path,
        code: m.code,
        title: m.title,
        description: m.description,
        orderIndex: m.orderIndex,
        posX: 0,
        posY: 0,
        isCustom: false,
      },
    });
    universalNodeMap.set(m.code, node.id);
  }

  // 5. Seed Role-Specific Training Plans (Barista, Kitchen Staff, Floor Server, Supervisor)
  console.log("⏳ Seeding 4 Role-Specific Training Plans & Version Snapshots...");
  const roleVersionMap = new Map<string, string>();

  for (const role of ROLE_TEMPLATES) {
    const plan = await prisma.trainingPlan.upsert({
      where: { id: role.planId },
      update: {
        title: role.title,
        roleIdentifier: role.roleIdentifier,
        description: role.description,
        status: "PUBLISHED",
        createdById: trainer.id,
      },
      create: {
        id: role.planId,
        title: role.title,
        roleIdentifier: role.roleIdentifier,
        description: role.description,
        isDefault: false,
        status: "PUBLISHED",
        createdById: trainer.id,
      },
    });

    const version = await prisma.planVersion.upsert({
      where: {
        planId_versionNumber: {
          planId: plan.id,
          versionNumber: 1,
        },
      },
      update: {
        status: "PUBLISHED",
        publishedById: trainer.id,
      },
      create: {
        id: `${role.planId}-v1`,
        planId: plan.id,
        versionNumber: 1,
        status: "PUBLISHED",
        publishedById: trainer.id,
        changelog: `Initial published version for ${role.title}`,
      },
    });
    roleVersionMap.set(role.roleIdentifier, version.id);

    // Seed nodes for this role plan
    let orderCounter: Record<string, number> = {};
    for (const code of role.milestoneCodes) {
      const libraryMilestone = milestoneMap.get(code);
      if (!libraryMilestone) continue;

      orderCounter[libraryMilestone.path] = (orderCounter[libraryMilestone.path] || 0) + 1;
      const orderIndex = orderCounter[libraryMilestone.path];
      const nodeId = `${role.planId}-node-${code}`;

      await prisma.planNode.upsert({
        where: { id: nodeId },
        update: {
          planVersionId: version.id,
          libraryMilestoneId: libraryMilestone.id,
          path: libraryMilestone.path,
          code: libraryMilestone.code,
          title: libraryMilestone.title,
          description: libraryMilestone.description,
          orderIndex,
        },
        create: {
          id: nodeId,
          planVersionId: version.id,
          libraryMilestoneId: libraryMilestone.id,
          path: libraryMilestone.path,
          code: libraryMilestone.code,
          title: libraryMilestone.title,
          description: libraryMilestone.description,
          orderIndex,
          posX: 0,
          posY: 0,
          isCustom: false,
        },
      });
    }
  }
  console.log(`✓ Seeded 4 role templates (Barista, Kitchen Staff, Floor Server, Supervisor).`);

  // 6. Assign Juan Dela Cruz to the Universal Default Plan
  // (Ensuring backward compatibility with existing tests and mirrors)
  await prisma.traineePlanAssignment.upsert({
    where: {
      traineeId_planVersionId: {
        traineeId: trainee.id,
        planVersionId: universalVersion.id,
      },
    },
    update: { status: "ACTIVE" },
    create: {
      id: `assign_${trainee.id}`,
      traineeId: trainee.id,
      planVersionId: universalVersion.id,
      assignedById: trainer.id,
      status: "ACTIVE",
    },
  });

  // 7. Seed Trainee Progress Records
  // - ONB-01: VERIFIED (Stamped by trainer)
  // - ONB-02: READY_FOR_REVIEW (With trainee reflection note)
  // - Others: IN_PROGRESS
  for (const m of CANONICAL_MILESTONES) {
    const planNodeId = universalNodeMap.get(m.code)!;

    let status: MilestoneStatus = MilestoneStatus.IN_PROGRESS;
    let verifiedBy: string | null = null;
    let verifiedAt: Date | null = null;
    let traineeNote: string | null = null;
    let requestedAt: Date | null = null;

    if (m.code === "ONB-01") {
      status = MilestoneStatus.VERIFIED;
      verifiedBy = trainer.id;
      verifiedAt = new Date("2024-10-03T14:30:00Z");
      traineeNote = "Completed corporate orientation at Bistro Head Office.";
    } else if (m.code === "ONB-02") {
      status = MilestoneStatus.READY_FOR_REVIEW;
      requestedAt = new Date("2024-10-05T10:00:00Z");
      traineeNote = "Reviewed Food Safety and Sanitation checklist with store buddy. Ready for audit.";
    }

    await prisma.traineeProgress.upsert({
      where: {
        traineeId_planNodeId: {
          traineeId: trainee.id,
          planNodeId,
        },
      },
      update: {
        status,
        verifiedBy,
        verifiedAt,
        traineeNote,
        requestedAt,
        isArchived: false,
      },
      create: {
        traineeId: trainee.id,
        planNodeId,
        status,
        verifiedBy,
        verifiedAt,
        traineeNote,
        requestedAt,
        isArchived: false,
      },
    });
  }

  console.log("✓ Trainee progress seeded with 1 VERIFIED stamp and 1 READY_FOR_REVIEW submission.");
  console.log("✨ Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
