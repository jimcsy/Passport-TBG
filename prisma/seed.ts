import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DevelopmentPath, MilestoneStatus, Role } from "../lib/types/models";

const prisma = new PrismaClient();

// ============================================================================
// 1. BEAT STANDARD CORPORATE MILESTONE LIBRARY
// ============================================================================

// Core Shared Milestones across all corporate tracks
const SHARED_CORE_MILESTONES = [
  // 1. Onboarding
  {
    path: DevelopmentPath.ONBOARDING,
    orderIndex: 1,
    code: "ONB-01",
    title: "The Bistro Group Corporate Orientation & Heritage",
    description: "Overview of The Bistro Group culture, corporate governance, multi-brand restaurant portfolio, and organizational values.",
  },
  {
    path: DevelopmentPath.ONBOARDING,
    orderIndex: 2,
    code: "ONB-02",
    title: "Data Privacy, Information Security & Compliance",
    description: "Data Privacy Act (DPA), handling sensitive business data, confidentiality agreements, and acceptable IT use policies.",
  },
  {
    path: DevelopmentPath.ONBOARDING,
    orderIndex: 3,
    code: "ONB-03",
    title: "Corporate Tools & Workplace Systems Setup",
    description: "Configuration of corporate email, HRIS self-service portal, internal communications, and IT service desk workflows.",
  },
  {
    path: DevelopmentPath.ONBOARDING,
    orderIndex: 4,
    code: "ONB-04",
    title: "First 30 Days Check-in & Corporate Buddy Alignment",
    description: "Structured check-in with department manager, corporate buddy alignment, and Growth Passport milestone review.",
  },

  // 2. Communication Skills
  {
    path: DevelopmentPath.COMMUNICATION,
    orderIndex: 1,
    code: "COMM-01",
    title: "Professional Business Communication & Email Etiquette",
    description: "High-standard corporate correspondence, email response SLAs, clear documentation, and brand voice consistency.",
  },
  {
    path: DevelopmentPath.COMMUNICATION,
    orderIndex: 2,
    code: "COMM-02",
    title: "Cross-Department Collaboration & Active Listening",
    description: "Effective cross-functional alignment, requirements gathering, stakeholder empathy, and collaborative problem-solving.",
  },
  {
    path: DevelopmentPath.COMMUNICATION,
    orderIndex: 3,
    code: "COMM-03",
    title: "Internal Customer Service & Service Recovery",
    description: "Partnering with restaurant branches and corporate units as internal clients, handling urgent requests with the LAST model.",
  },
  {
    path: DevelopmentPath.COMMUNICATION,
    orderIndex: 4,
    code: "COMM-04",
    title: "Team Briefings, Status Reporting & Alignment",
    description: "Active participation in standups, weekly department KPI reporting, and transparent roadblock escalations.",
  },

  // 4. Personal Effectiveness & Culture
  {
    path: DevelopmentPath.CULTURE,
    orderIndex: 1,
    code: "CUL-01",
    title: "Living The Bistro Core Values & Service Heart",
    description: "Demonstrating passion for hospitality excellence, workplace integrity, and pride in supporting restaurant teams.",
  },
  {
    path: DevelopmentPath.CULTURE,
    orderIndex: 2,
    code: "CUL-02",
    title: "Cross-Functional Synergy & Team Accountability",
    description: "Supporting peer departments during peak operational campaigns, product launches, and company-wide initiatives.",
  },
  {
    path: DevelopmentPath.CULTURE,
    orderIndex: 3,
    code: "CUL-03",
    title: "Professional Work Ethics & Corporate Standards",
    description: "Punctuality, professional dress code, workplace etiquette, time management, and commitment to corporate deliverables.",
  },
  {
    path: DevelopmentPath.CULTURE,
    orderIndex: 4,
    code: "CUL-04",
    title: "Peer Recognition & BEAT Spirit Champion",
    description: "Celebrating colleague achievements, fostering high team morale, and actively promoting the BEAT recognition culture.",
  },

  // 5. Leadership Skills
  {
    path: DevelopmentPath.LEADERSHIP,
    orderIndex: 1,
    code: "LEAD-01",
    title: "Peer Mentorship & New Hire Buddy Coaching",
    description: "Guiding incoming corporate team members through their initial weeks and providing constructive support.",
  },
  {
    path: DevelopmentPath.LEADERSHIP,
    orderIndex: 2,
    code: "LEAD-02",
    title: "Project Ownership & Cross-Team Coordination",
    description: "Leading an assigned department project workstream, tracking deliverables, and coordinating with stakeholders.",
  },
  {
    path: DevelopmentPath.LEADERSHIP,
    orderIndex: 3,
    code: "LEAD-03",
    title: "Process Optimization & Operational Excellence",
    description: "Identifying workflow bottlenecks, drafting standard operating procedures (SOP), and proposing productivity enhancements.",
  },
  {
    path: DevelopmentPath.LEADERSHIP,
    orderIndex: 4,
    code: "LEAD-04",
    title: "Capstone Presentation & Growth Passport Defense",
    description: "Presenting key corporate milestones, learnings, and personal growth goals to the department leadership.",
  },
];

// Department-specific Technical Milestones
const DEPARTMENT_TECHNICAL_MILESTONES = [
  // IT & Tech Support
  {
    path: DevelopmentPath.TECHNICAL,
    orderIndex: 1,
    code: "TECH-IT-01",
    title: "Helpdesk Ticket & Incident Management",
    description: "SLA compliance, ticket triage, remote troubleshooting, and resolution tracking for store and head office users.",
  },
  {
    path: DevelopmentPath.TECHNICAL,
    orderIndex: 2,
    code: "TECH-IT-02",
    title: "POS & Restaurant Systems Infrastructure",
    description: "Network connectivity, POS terminal diagnostics, store server uptime, and peripheral equipment maintenance.",
  },
  {
    path: DevelopmentPath.TECHNICAL,
    orderIndex: 3,
    code: "TECH-IT-03",
    title: "Corporate Identity, Software & Access Control",
    description: "User provisioning, Google Workspace / Microsoft 365 administration, SSO credentials, and software licensing.",
  },
  {
    path: DevelopmentPath.TECHNICAL,
    orderIndex: 4,
    code: "TECH-IT-04",
    title: "System Backup, Disaster Recovery & Security Audits",
    description: "Data backup verification, security patch deployment, vulnerability scans, and IT asset inventory auditing.",
  },

  // HR & People Operations
  {
    path: DevelopmentPath.TECHNICAL,
    orderIndex: 1,
    code: "TECH-HR-01",
    title: "Talent Acquisition & Candidate Onboarding",
    description: "Job requisition management, candidate screening, pre-employment documentation, and corporate orientation logistics.",
  },
  {
    path: DevelopmentPath.TECHNICAL,
    orderIndex: 2,
    code: "TECH-HR-02",
    title: "HRIS & Employee Records Management",
    description: "201 file maintenance, master employee database administration, attendance tracking, and leave administration.",
  },
  {
    path: DevelopmentPath.TECHNICAL,
    orderIndex: 3,
    code: "TECH-HR-03",
    title: "Employee Relations & Policy Administration",
    description: "Company code of discipline, labor compliance fundamentals, grievance handling, and employee well-being initiatives.",
  },
  {
    path: DevelopmentPath.TECHNICAL,
    orderIndex: 4,
    code: "TECH-HR-04",
    title: "Performance Appraisal & Learning Administration",
    description: "Performance review cycles, BEAT passport tracking, training session scheduling, and HR metrics reporting.",
  },

  // Finance & Accounting
  {
    path: DevelopmentPath.TECHNICAL,
    orderIndex: 1,
    code: "TECH-FIN-01",
    title: "Accounts Payable & Invoice Processing",
    description: "3-way matching of purchase orders, vendor invoice verification, check voucher generation, and payment scheduling.",
  },
  {
    path: DevelopmentPath.TECHNICAL,
    orderIndex: 2,
    code: "TECH-FIN-02",
    title: "General Ledger, Sales Reconciliation & Journal Entries",
    description: "Daily store sales audits, petty cash verification, bank reconciliations, and month-end journal entries.",
  },
  {
    path: DevelopmentPath.TECHNICAL,
    orderIndex: 3,
    code: "TECH-FIN-03",
    title: "Tax Compliance & Statutory Remittances",
    description: "Withholding tax schedules, VAT filing preparation, BIR regulatory compliance, and statutory remittance checks.",
  },
  {
    path: DevelopmentPath.TECHNICAL,
    orderIndex: 4,
    code: "TECH-FIN-04",
    title: "Budget Monitoring & Financial Variance Analysis",
    description: "Department OPEX tracking, store cost variance analysis, financial statement schedules, and reporting pack preparation.",
  },

  // Marketing & Creative
  {
    path: DevelopmentPath.TECHNICAL,
    orderIndex: 1,
    code: "TECH-MKT-01",
    title: "Campaign Ideation & Brand Promotion Execution",
    description: "Multi-brand marketing calendars, promotional launch rollouts, in-store POP material distribution, and campaign timelines.",
  },
  {
    path: DevelopmentPath.TECHNICAL,
    orderIndex: 2,
    code: "TECH-MKT-02",
    title: "Social Media Management & Digital Engagement",
    description: "Content scheduling, social listening, diner community moderation, digital copywriting, and brand voice oversight.",
  },
  {
    path: DevelopmentPath.TECHNICAL,
    orderIndex: 3,
    code: "TECH-MKT-03",
    title: "Market Research, Menu Analytics & Customer Insights",
    description: "Guest feedback surveys, guest demographic analytics, campaign ROI evaluation, and competitor benchmark reviews.",
  },
  {
    path: DevelopmentPath.TECHNICAL,
    orderIndex: 4,
    code: "TECH-MKT-04",
    title: "Agency & Creative Asset Vendor Coordination",
    description: "Creative brief formulation, food photoshoot coordination, print vendor liaison, and digital asset library management.",
  },

  // Supply Chain & Logistics
  {
    path: DevelopmentPath.TECHNICAL,
    orderIndex: 1,
    code: "TECH-SCM-01",
    title: "Procurement & Purchase Order Management",
    description: "Requisition review, vendor purchase orders, price catalog adherence, supplier quotation analysis, and delivery SLAs.",
  },
  {
    path: DevelopmentPath.TECHNICAL,
    orderIndex: 2,
    code: "TECH-SCM-02",
    title: "Central Commissary & Warehouse Inventory Control",
    description: "Stock movement monitoring, cold chain storage audits, FIFO stock rotation, and inventory shrinkage minimization.",
  },
  {
    path: DevelopmentPath.TECHNICAL,
    orderIndex: 3,
    code: "TECH-SCM-03",
    title: "Store Delivery Logistics & Route Coordination",
    description: "Daily branch dispatch schedules, multi-drop route optimization, delivery turnaround tracking, and discrepancy claims.",
  },
  {
    path: DevelopmentPath.TECHNICAL,
    orderIndex: 4,
    code: "TECH-SCM-04",
    title: "Supplier Quality Assurance & Vendor Scorecards",
    description: "Raw ingredient quality inspection standards, supplier performance evaluations, and HACCP transport compliance.",
  },
];

// ============================================================================
// 2. THE 5 CORPORATE SUPPORT TRAINING TRACKS
// ============================================================================

interface CorporateTrackDefinition {
  planId: string;
  title: string;
  roleIdentifier: string;
  jobRole: string;
  description: string;
  isDefault: boolean;
  technicalMilestoneCodes: string[];
}

const CORPORATE_TRACKS: CorporateTrackDefinition[] = [
  {
    planId: "plan-it-tech-support",
    title: "IT & Tech Support Track",
    roleIdentifier: "IT_TECH_SUPPORT",
    jobRole: "IT Support Specialist",
    description: "Covers corporate systems administration, POS infrastructure, helpdesk management, and network security standards.",
    isDefault: true,
    technicalMilestoneCodes: ["TECH-IT-01", "TECH-IT-02", "TECH-IT-03", "TECH-IT-04"],
  },
  {
    planId: "plan-hr-people-ops",
    title: "HR & People Operations Track",
    roleIdentifier: "HR_PEOPLE_OPS",
    jobRole: "HR Specialist",
    description: "Development track covering talent acquisition, HRIS maintenance, employee relations, and learning administration.",
    isDefault: false,
    technicalMilestoneCodes: ["TECH-HR-01", "TECH-HR-02", "TECH-HR-03", "TECH-HR-04"],
  },
  {
    planId: "plan-finance-accounting",
    title: "Finance & Accounting Track",
    roleIdentifier: "FINANCE_ACCOUNTING",
    jobRole: "Accounting Associate",
    description: "Focuses on accounts payable, store sales reconciliations, tax compliance, and financial variance monitoring.",
    isDefault: false,
    technicalMilestoneCodes: ["TECH-FIN-01", "TECH-FIN-02", "TECH-FIN-03", "TECH-FIN-04"],
  },
  {
    planId: "plan-marketing-creative",
    title: "Marketing & Creative Track",
    roleIdentifier: "MARKETING_CREATIVE",
    jobRole: "Marketing Specialist",
    description: "Designed for marketing and creative support in brand promotion, digital engagement, campaign analytics, and agency coordination.",
    isDefault: false,
    technicalMilestoneCodes: ["TECH-MKT-01", "TECH-MKT-02", "TECH-MKT-03", "TECH-MKT-04"],
  },
  {
    planId: "plan-supply-chain-logistics",
    title: "Supply Chain & Logistics Track",
    roleIdentifier: "SUPPLY_CHAIN_LOGISTICS",
    jobRole: "Supply Chain Specialist",
    description: "Focuses on procurement management, central warehouse inventory, delivery logistics, and supplier quality assurance.",
    isDefault: false,
    technicalMilestoneCodes: ["TECH-SCM-01", "TECH-SCM-02", "TECH-SCM-03", "TECH-SCM-04"],
  },
];

async function main() {
  console.log("🌱 Seeding The Bistro Group Growth Passport Database (Corporate Support Edition)...");

  const isForceReset = process.env.FORCE_RESET === "true";

  // 1. Wipe records ONLY if FORCE_RESET=true is explicitly requested
  if (isForceReset) {
    console.log("⚠️ FORCE_RESET detected: Performing complete database wipe and fresh re-initialization...");
    await prisma.traineeProgress.deleteMany({});
    await prisma.traineePlanAssignment.deleteMany({});
    await prisma.trainee.deleteMany({
      where: { traineeCode: { not: "TBG-2024-001" } },
    });
    await prisma.planEdge.deleteMany({});
    await prisma.planNode.deleteMany({});
    await prisma.planVersion.deleteMany({});
    await prisma.trainingPlan.deleteMany({});
    console.log("✓ Cleaned up old database records.");
  } else {
    console.log("🛡️ Running in Safe Idempotent Mode: Preserving existing versions, custom drafts, and trainee progress.");
  }

  // 2. Seed Admin Trainer
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

  // 3. Seed Single Trainee: Juan Dela Cruz (Corporate IT Support Specialist)
  const trainee = await prisma.trainee.upsert({
    where: { traineeCode: "TBG-2024-001" },
    update: {
      fullName: "Juan Dela Cruz",
      email: "trainee@bistro.com.ph",
      restaurantBrand: "Corporate Head Office",
      branchLocation: "Bistro Support Center",
      cohortBatch: "Cohort-2024-Q4",
      jobRole: "IT Support Specialist",
      hireDate: new Date("2024-10-01T00:00:00Z"),
    },
    create: {
      traineeCode: "TBG-2024-001",
      fullName: "Juan Dela Cruz",
      email: "trainee@bistro.com.ph",
      restaurantBrand: "Corporate Head Office",
      branchLocation: "Bistro Support Center",
      cohortBatch: "Cohort-2024-Q4",
      jobRole: "IT Support Specialist",
      hireDate: new Date("2024-10-01T00:00:00Z"),
    },
  });
  console.log(`✓ Single Trainee seeded: ${trainee.fullName} (${trainee.traineeCode}, Role: ${trainee.jobRole})`);

  // 4. Seed BEAT Standard Corporate Milestone Library
  console.log("⏳ Seeding BEAT Standard Corporate Milestones Library...");
  const allLibraryMilestones = [...SHARED_CORE_MILESTONES, ...DEPARTMENT_TECHNICAL_MILESTONES];
  const libraryMap = new Map<string, { id: string; code: string; title: string; description: string; path: string; orderIndex: number }>();

  for (const m of allLibraryMilestones) {
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
    libraryMap.set(m.code, { ...m, id: record.id });
  }
  console.log(`✓ Seeded ${libraryMap.size} corporate milestones into BEAT Library.`);

  // 5. Seed the 5 Ready-Made Corporate Training Plans & Plan Versions
  console.log("⏳ Seeding 5 Corporate Support Training Plans...");
  const trackVersionMap = new Map<string, string>();
  let itSupportPlanVersionId = "";

  for (const track of CORPORATE_TRACKS) {
    const plan = await prisma.trainingPlan.upsert({
      where: { id: track.planId },
      update: {
        title: track.title,
        roleIdentifier: track.roleIdentifier,
        description: track.description,
        isDefault: track.isDefault,
        status: "PUBLISHED",
        createdById: trainer.id,
      },
      create: {
        id: track.planId,
        title: track.title,
        roleIdentifier: track.roleIdentifier,
        description: track.description,
        isDefault: track.isDefault,
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
        id: `${track.planId}-v1`,
        planId: plan.id,
        versionNumber: 1,
        status: "PUBLISHED",
        publishedById: trainer.id,
        changelog: `Initial corporate development track for ${track.title}`,
      },
    });

    trackVersionMap.set(track.planId, version.id);
    if (track.planId === "plan-it-tech-support") {
      itSupportPlanVersionId = version.id;
    }

    // Build the 20 milestones for this track:
    // 4 Onboarding + 4 Communication + 4 Track Technical + 4 Culture + 4 Leadership
    const trackMilestones = [
      ...SHARED_CORE_MILESTONES.filter((m) => m.path === DevelopmentPath.ONBOARDING),
      ...SHARED_CORE_MILESTONES.filter((m) => m.path === DevelopmentPath.COMMUNICATION),
      ...track.technicalMilestoneCodes.map((techCode, idx) => {
        const libM = libraryMap.get(techCode)!;
        return {
          path: DevelopmentPath.TECHNICAL,
          orderIndex: idx + 1,
          code: `TECH-0${idx + 1}`, // Standard TECH-01..04 code on the plan node
          title: libM.title,
          description: libM.description,
          libraryMilestoneId: libM.id,
        };
      }),
      ...SHARED_CORE_MILESTONES.filter((m) => m.path === DevelopmentPath.CULTURE),
      ...SHARED_CORE_MILESTONES.filter((m) => m.path === DevelopmentPath.LEADERSHIP),
    ];

    for (const m of trackMilestones) {
      const libraryMilestone = "libraryMilestoneId" in m
        ? { id: m.libraryMilestoneId }
        : libraryMap.get(m.code)!;

      const nodeId = `${track.planId}-node-${m.code}`;

      await prisma.planNode.upsert({
        where: { id: nodeId },
        update: {
          planVersionId: version.id,
          libraryMilestoneId: libraryMilestone.id,
          path: m.path,
          code: m.code,
          title: m.title,
          description: m.description,
          orderIndex: m.orderIndex,
        },
        create: {
          id: nodeId,
          planVersionId: version.id,
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
    }
  }
  console.log("✓ Seeded 5 ready-made corporate tracks (IT, HR, Finance, Marketing, Supply Chain).");

  // 7. Assign Juan Dela Cruz to IT & Tech Support Track (Safe Idempotent)
  console.log("⏳ Checking Juan Dela Cruz plan assignment...");
  const existingAssignment = await prisma.traineePlanAssignment.findFirst({
    where: { traineeId: trainee.id, status: "ACTIVE" },
  });

  const activePlanVersionId = existingAssignment?.planVersionId || itSupportPlanVersionId;

  if (!existingAssignment) {
    await prisma.traineePlanAssignment.create({
      data: {
        id: `assign_${trainee.id}`,
        traineeId: trainee.id,
        planVersionId: itSupportPlanVersionId,
        assignedById: trainer.id,
        status: "ACTIVE",
      },
    });
    console.log("✓ Assigned Juan Dela Cruz to IT & Tech Support Track (v1).");
  } else {
    console.log(`✓ Preserved existing assignment for Juan Dela Cruz (Version: ${existingAssignment.planVersionId}).`);
  }

  if (isForceReset) {
    await prisma.traineePlanAssignment.deleteMany({
      where: {
        traineeId: trainee.id,
        planVersionId: { not: itSupportPlanVersionId },
      },
    });
  }

  // 8. Progress State for Juan Dela Cruz (Preserving stamps unless FORCE_RESET)
  console.log("⏳ Syncing progress state for Juan Dela Cruz...");
  if (isForceReset) {
    await prisma.traineeProgress.deleteMany({
      where: { traineeId: trainee.id },
    });
  }

  const assignedNodes = await prisma.planNode.findMany({
    where: { planVersionId: activePlanVersionId },
    orderBy: [{ path: "asc" }, { orderIndex: "asc" }],
  });

  let initializedCount = 0;
  for (const node of assignedNodes) {
    const existingProgress = await prisma.traineeProgress.findUnique({
      where: {
        traineeId_planNodeId: {
          traineeId: trainee.id,
          planNodeId: node.id,
        },
      },
    });

    if (!existingProgress) {
      await prisma.traineeProgress.create({
        data: {
          traineeId: trainee.id,
          planNodeId: node.id,
          status: MilestoneStatus.IN_PROGRESS,
          verifiedBy: null,
          verifiedAt: null,
          traineeNote: null,
          requestedAt: null,
          isArchived: false,
        },
      });
      initializedCount++;
    }
  }

  if (initializedCount > 0) {
    console.log(`✓ Initialized ${initializedCount} missing milestone progress records for Juan Dela Cruz.`);
  } else {
    console.log(`✓ Preserved all existing stamps and verification progress for Juan Dela Cruz.`);
  }

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
