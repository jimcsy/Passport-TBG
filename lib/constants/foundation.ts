import { DevelopmentPath, DEVELOPMENT_PATHS } from "@/lib/types/models";

export const FOUNDATION_PLAN_ID = "plan-tbg-corporate-foundation-l1";
export const FOUNDATION_PLAN_TITLE = "Foundation Level 1: TBG Corporate Onboarding";
export const FOUNDATION_ROLE = "TBG_CORPORATE_FOUNDATION_L1";
/** Array order defines the universal pillar sequence. */
export const FOUNDATION_PILLARS = Object.values(DevelopmentPath).map((path, index) => ({ path, sequence: index + 1, title: DEVELOPMENT_PATHS[path].title }));

export const SHARED_CORE_MILESTONES = [
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


const UNIVERSAL_TECHNICAL_MILESTONES = [
  { path: DevelopmentPath.TECHNICAL, orderIndex: 1, code: "TECH-01", title: "Corporate Digital Tools & Productivity Fundamentals", description: "Use approved office tools, shared workspaces, and corporate systems for daily work." },
  { path: DevelopmentPath.TECHNICAL, orderIndex: 2, code: "TECH-02", title: "Data Handling & Records Management", description: "Maintain accurate records, apply data classification, and handle corporate information responsibly." },
  { path: DevelopmentPath.TECHNICAL, orderIndex: 3, code: "TECH-03", title: "Standard Workflows & Quality Assurance", description: "Follow standard operating procedures, document work, and check output quality." },
  { path: DevelopmentPath.TECHNICAL, orderIndex: 4, code: "TECH-04", title: "Problem Solving & Service Delivery", description: "Resolve common workflow issues, escalate appropriately, and deliver reliable internal service." },
];
export const FOUNDATION_MILESTONES = FOUNDATION_PILLARS.flatMap(({ path }) =>
  [...SHARED_CORE_MILESTONES, ...UNIVERSAL_TECHNICAL_MILESTONES].filter(module => module.path === path)
);
/** Custom nodes may be appended, but the universal twenty-module baseline must remain present. */
export function hasFoundationBaseline(nodes: readonly { code: string; path: string }[]) {
  return FOUNDATION_MILESTONES.every(module => nodes.some(node => node.code === module.code && node.path === module.path));
}

export const DEPARTMENT_TECHNICAL_MILESTONES = [
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

