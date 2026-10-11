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
    code: "CULT-01",
    title: "Living Bistro Core Values & Teamwork Spirit",
    description: "Demonstrating passion for service, mutual respect, and collaborative store teamwork.",
  },
  {
    path: DevelopmentPath.CULTURE,
    orderIndex: 2,
    code: "CULT-02",
    title: "Punctuality, Grooming & Uniform Standards",
    description: "Adherence to immaculate uniform standards, grooming policies, and shift attendance.",
  },
  {
    path: DevelopmentPath.CULTURE,
    orderIndex: 3,
    code: "CULT-03",
    title: "Stress Management & High-Pace Service Agility",
    description: "Composure and resilience during peak rush lunch and dinner seatings.",
  },
  {
    path: DevelopmentPath.CULTURE,
    orderIndex: 4,
    code: "CULT-04",
    title: "Peer Support & Recognition Culture",
    description: "Encouraging team members and actively celebrating store wins.",
  },

  // 5. Leadership Skills
  {
    path: DevelopmentPath.LEADERSHIP,
    orderIndex: 1,
    code: "LEAD-01",
    title: "Peer Mentorship & Buddy Coaching",
    description: "Shadowing and mentoring newer team members on store standards.",
  },
  {
    path: DevelopmentPath.LEADERSHIP,
    orderIndex: 2,
    code: "LEAD-02",
    title: "Station Supervision & Shift Rush Support",
    description: "Floater duties, bottleneck relief, and assisting under-pressure stations.",
  },
  {
    path: DevelopmentPath.LEADERSHIP,
    orderIndex: 3,
    code: "LEAD-03",
    title: "Daily Briefing Facilitation",
    description: "Leading or co-leading an upbeat pre-shift motivational huddle.",
  },
  {
    path: DevelopmentPath.LEADERSHIP,
    orderIndex: 4,
    code: "LEAD-04",
    title: "Growth Passport Capstone Evaluation",
    description: "Final comprehensive evaluation with General Manager and BEAT Program Trainer.",
  },
];

async function main() {
  console.log("🌱 Seeding The Bistro Group Growth Passport Database...");

  // 1. Seed Admin Trainer
  const adminPasswordHash = await bcrypt.hash("password123", 10);
  const trainer = await prisma.adminUser.upsert({
    where: { employeeId: "EMP-1001" },
    update: {
      passwordHash: adminPasswordHash,
      fullName: "Chef Marco Reyes (Master Trainer)",
      role: Role.TRAINER,
    },
    create: {
      employeeId: "EMP-1001",
      fullName: "Chef Marco Reyes (Master Trainer)",
      email: "trainer@bistro.com.ph",
      passwordHash: adminPasswordHash,
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
    },
    create: {
      traineeCode: "TBG-2024-001",
      fullName: "Juan Dela Cruz",
      email: "trainee@bistro.com.ph",
      restaurantBrand: "TGI Fridays",
      branchLocation: "Bonifacio High Street",
      cohortBatch: "Cohort-2024-Q4",
      hireDate: new Date("2024-10-01"),
    },
  });
  console.log(`✓ Trainee seeded: ${trainee.fullName} (${trainee.traineeCode})`);

  // 3. Seed Milestone Definitions
  console.log("⏳ Seeding 20 canonical milestones across 5 paths...");
  const milestoneMap = new Map<string, string>();

  for (const m of CANONICAL_MILESTONES) {
    const record = await prisma.milestoneDefinition.upsert({
      where: { code: m.code },
      update: {
        title: m.title,
        description: m.description,
        path: m.path,
        orderIndex: m.orderIndex,
      },
      create: {
        code: m.code,
        title: m.title,
        description: m.description,
        path: m.path,
        orderIndex: m.orderIndex,
      },
    });
    milestoneMap.set(m.code, record.id);
  }
  console.log(`✓ Seeded ${milestoneMap.size} milestones.`);

  // 4. Seed Trainee Progress Records
  // - ONB-01: VERIFIED (Stamped by trainer)
  // - ONB-02: READY_FOR_REVIEW (With trainee reflection note)
  // - Others: IN_PROGRESS
  for (const m of CANONICAL_MILESTONES) {
    const milestoneId = milestoneMap.get(m.code)!;

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
        traineeId_milestoneId: {
          traineeId: trainee.id,
          milestoneId: milestoneId,
        },
      },
      update: {
        status,
        verifiedBy,
        verifiedAt,
        traineeNote,
        requestedAt,
      },
      create: {
        traineeId: trainee.id,
        milestoneId,
        status,
        verifiedBy,
        verifiedAt,
        traineeNote,
        requestedAt,
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
