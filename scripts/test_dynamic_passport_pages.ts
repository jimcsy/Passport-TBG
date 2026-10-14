import assert from "node:assert/strict";
import { buildDynamicPassportPages } from "../lib/passport/book";
import { DevelopmentPath, MilestoneStatus } from "../lib/types/models";
import type { PathProgressSummary, EnrichedMilestone } from "../lib/db/repositories/trainee";

function mockMilestone(code: string, path: DevelopmentPath, orderIndex: number): EnrichedMilestone {
  return {
    id: `node-${code}`,
    code,
    title: `Competency ${code}`,
    description: `Description for ${code}`,
    path,
    orderIndex,
    status: MilestoneStatus.IN_PROGRESS,
    isArchived: false,
  };
}

function mockPath(path: DevelopmentPath, count: number): PathProgressSummary {
  const milestones = Array.from({ length: count }, (_, i) =>
    mockMilestone(`${path}-${i + 1}`, path, i + 1)
  );
  return {
    path,
    title: `${path} Track`,
    description: `Description for ${path}`,
    color: "#C29B38",
    total: count,
    verified: 0,
    percent: 0,
    milestones,
  };
}

async function runTests() {
  console.log("🧪 Testing buildDynamicPassportPages Algorithm...\n");

  // Scenario 1: Universal 20-milestone plan (4 milestones per path across 5 paths)
  console.log("1️⃣ Testing Standard 4-milestones-per-path plan...");
  const paths20 = [
    mockPath(DevelopmentPath.ONBOARDING, 4),
    mockPath(DevelopmentPath.COMMUNICATION, 4),
    mockPath(DevelopmentPath.TECHNICAL, 4),
    mockPath(DevelopmentPath.CULTURE, 4),
    mockPath(DevelopmentPath.LEADERSHIP, 4),
  ];
  const pages20 = buildDynamicPassportPages(paths20, { roleName: "Floor Server" });
  // Page 1: Cover, Page 2: Profile
  // 5 paths * (1 overview + 1 stamps page [ceil(4/4)=1]) = 10 pages
  // Total = 2 + 10 = 12 pages. Since 12 is even, no padding needed.
  assert.equal(pages20.length % 2, 0, "Total pages must always be even");
  assert.equal(pages20[0].kind, "cover");
  assert.equal(pages20[1].kind, "profile");
  assert.equal(pages20[1].roleName, "Floor Server");
  console.log(`   ✓ Standard 20-milestone plan produced ${pages20.length} pages (${pages20.length / 2} spreads).`);

  // Scenario 2: Role with Exempt Track (0 milestones in Leadership)
  console.log("\n2️⃣ Testing Plan with Exempt Path (0 milestones)...");
  const pathsWithExempt = [
    mockPath(DevelopmentPath.ONBOARDING, 4),
    mockPath(DevelopmentPath.COMMUNICATION, 4),
    mockPath(DevelopmentPath.TECHNICAL, 4),
    mockPath(DevelopmentPath.CULTURE, 4),
    mockPath(DevelopmentPath.LEADERSHIP, 0), // Exempt!
  ];
  const pagesExempt = buildDynamicPassportPages(pathsWithExempt, { roleName: "Barista" });
  assert.equal(pagesExempt.length % 2, 0, "Total pages must be even");
  const exemptPage = pagesExempt.find((p) => p.kind === "exempt_stamp");
  assert.ok(exemptPage, "Must include an exempt_stamp page for zero-milestone track");
  assert.equal(exemptPage.path?.path, DevelopmentPath.LEADERSHIP);
  assert.equal(exemptPage.roleName, "Barista");
  console.log(`   ✓ Exempt track correctly rendered with kind='exempt_stamp' for ${exemptPage.roleName}.`);

  // Scenario 3: Odd Page Count Calculation & Auto-Padding
  console.log("\n3️⃣ Testing Odd Page Padding with Notes & Endorsements...");
  // Let's create an odd count: 1 path with 5 milestones (ceil(5/4) = 2 stamp pages) + 4 paths with 4 milestones
  const pathsOdd = [
    mockPath(DevelopmentPath.ONBOARDING, 5), // 1 overview + 2 stamps = 3 pages
    mockPath(DevelopmentPath.COMMUNICATION, 4), // 1 overview + 1 stamp = 2 pages
    mockPath(DevelopmentPath.TECHNICAL, 4), // 2 pages
    mockPath(DevelopmentPath.CULTURE, 4), // 2 pages
    mockPath(DevelopmentPath.LEADERSHIP, 4), // 2 pages
  ];
  // Raw = 2 (cover+profile) + 3 + 2 + 2 + 2 + 2 = 13 pages (ODD!)
  const pagesOdd = buildDynamicPassportPages(pathsOdd);
  assert.equal(pagesOdd.length % 2, 0, "Odd page count must be padded to even");
  assert.equal(pagesOdd.length, 14, "13 raw pages should be padded to 14");
  const lastPage = pagesOdd[pagesOdd.length - 1];
  assert.equal(lastPage.kind, "notes_endorsements", "Padded page must be notes_endorsements");
  console.log(`   ✓ 13 raw pages successfully padded with notes_endorsements to ${pagesOdd.length} pages.`);

  // Scenario 4: Preserved Archived Milestones
  console.log("\n4️⃣ Testing Preserved Archived Milestones in Notes & Endorsements...");
  const archived = [
    { ...mockMilestone("OLD-TECH-01", DevelopmentPath.TECHNICAL, 1), isArchived: true, status: MilestoneStatus.VERIFIED },
    { ...mockMilestone("OLD-TECH-02", DevelopmentPath.TECHNICAL, 2), isArchived: true, status: MilestoneStatus.VERIFIED },
  ];
  const pagesWithArchived = buildDynamicPassportPages(paths20, {
    roleName: "Store Supervisor",
    archivedMilestones: archived,
  });
  assert.equal(pagesWithArchived.length % 2, 0, "Pages must be even with archived milestones");
  const endorsementPages = pagesWithArchived.filter((p) => p.kind === "notes_endorsements");
  assert.ok(endorsementPages.length > 0, "Must include notes_endorsements page for archived milestones");
  const allArchived = endorsementPages.flatMap((p) => p.archivedMilestones || []);
  assert.equal(allArchived.length, 2, "All archived milestones must be present on endorsement pages");
  console.log(`   ✓ Archived milestones correctly assigned to notes_endorsements spread.`);

  // Scenario 5: Large Technical Path (10 milestones -> ceil(10/4) = 3 stamp pages)
  console.log("\n5️⃣ Testing Large Path Expansion (10 milestones in Technical)...");
  const pathsLarge = [
    mockPath(DevelopmentPath.ONBOARDING, 2),
    mockPath(DevelopmentPath.COMMUNICATION, 2),
    mockPath(DevelopmentPath.TECHNICAL, 10), // 1 overview + 3 stamps pages = 4 pages
    mockPath(DevelopmentPath.CULTURE, 2),
    mockPath(DevelopmentPath.LEADERSHIP, 2),
  ];
  const pagesLarge = buildDynamicPassportPages(pathsLarge);
  assert.equal(pagesLarge.length % 2, 0, "Pages must be even");
  const techStamps = pagesLarge.filter((p) => p.kind === "stamps" && p.path?.path === DevelopmentPath.TECHNICAL);
  assert.equal(techStamps.length, 3, "10 milestones in 4-per-page grid must produce 3 stamp pages");
  assert.equal(techStamps[0].milestones.length, 4);
  assert.equal(techStamps[1].milestones.length, 4);
  assert.equal(techStamps[2].milestones.length, 2);
  console.log(`   ✓ 10 milestones partitioned into 3 stamp pages (4, 4, 2) matching 2x2 grid.`);

  console.log("\n🎉 ALL DYNAMIC PAGINATION & FLIP-BOOK TESTS PASSED WITH 100% SUCCESS!\n");
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
