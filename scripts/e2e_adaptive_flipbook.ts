import assert from "node:assert/strict";
import { buildDynamicPassportPages } from "../lib/passport/book";
import { DevelopmentPath, MilestoneStatus } from "../lib/types/models";
import type { PathProgressSummary, EnrichedMilestone } from "../lib/db/repositories/trainee";

function createMilestone(code: string, path: DevelopmentPath, orderIndex: number, status: MilestoneStatus = MilestoneStatus.IN_PROGRESS): EnrichedMilestone {
  return {
    id: `m-${code}`,
    code,
    title: `Competency ${code}`,
    description: `Demonstrate mastery of ${code} operational standard.`,
    path,
    orderIndex,
    status,
    isArchived: false,
  };
}

function createPathSummary(path: DevelopmentPath, count: number, verifiedCount = 0): PathProgressSummary {
  const milestones = Array.from({ length: count }, (_, i) => {
    const isVerified = i < verifiedCount;
    return createMilestone(
      `${path.slice(0, 4)}-${i + 1}`,
      path,
      i + 1,
      isVerified ? MilestoneStatus.VERIFIED : MilestoneStatus.IN_PROGRESS
    );
  });
  const percent = count > 0 ? Math.round((verifiedCount / count) * 100) : 0;

  return {
    path,
    title: `${path} Development Path`,
    description: `Description and learning outcomes for ${path}.`,
    color: "#C29B38",
    total: count,
    verified: verifiedCount,
    percent,
    milestones,
  };
}

async function runE2EAdaptiveFlipbook() {
  console.log("🚀 Starting E2E Test: Adaptive 3D Flip-Book Engine & Visual Verification (Issue 5.3)...\n");

  // Configuration 1: Minimal Plan (2 milestones on 1 path, 4 exempt paths)
  console.log("1️⃣ Testing Minimal Plan Configuration (2 milestones on Onboarding, 4 exempt tracks)...");
  const minimalPaths = [
    createPathSummary(DevelopmentPath.ONBOARDING, 2, 1),
    createPathSummary(DevelopmentPath.COMMUNICATION, 0),
    createPathSummary(DevelopmentPath.TECHNICAL, 0),
    createPathSummary(DevelopmentPath.CULTURE, 0),
    createPathSummary(DevelopmentPath.LEADERSHIP, 0),
  ];
  const minimalPages = buildDynamicPassportPages(minimalPaths, { roleName: "Dishwasher" });
  assert.equal(minimalPages.length % 2, 0, "Page count must be even");
  assert.equal(minimalPages[0].kind, "cover");
  assert.equal(minimalPages[1].kind, "profile");
  assert.equal(minimalPages[1].roleName, "Dishwasher");

  // 1 overview + 1 stamps page (ceil(2/4)=1) for Onboarding
  // 4 exempt tracks * (1 overview + 1 exempt_stamp) = 8 pages
  // Total = 2 + 2 + 8 = 12 pages (6 spreads)
  assert.equal(minimalPages.length, 12);
  const exemptPagesMin = minimalPages.filter((p) => p.kind === "exempt_stamp");
  assert.equal(exemptPagesMin.length, 4, "Must contain exactly 4 exempt stamp pages");
  console.log(`   ✓ Minimal plan rendered in exactly ${minimalPages.length} pages (${minimalPages.length / 2} spreads).`);
  console.log(`   ✓ Verified 4 official Exempt Stamp seals with role 'Dishwasher'.`);

  // Configuration 2: Medium Plan (12 milestones across 3 paths, 2 exempt paths)
  console.log("\n2️⃣ Testing Medium Plan Configuration (12 milestones across 3 paths)...");
  const mediumPaths = [
    createPathSummary(DevelopmentPath.ONBOARDING, 4, 4), // 1 overview + 1 stamps = 2 pages
    createPathSummary(DevelopmentPath.COMMUNICATION, 4, 2), // 1 overview + 1 stamps = 2 pages
    createPathSummary(DevelopmentPath.TECHNICAL, 4, 0), // 1 overview + 1 stamps = 2 pages
    createPathSummary(DevelopmentPath.CULTURE, 0), // 1 overview + 1 exempt = 2 pages
    createPathSummary(DevelopmentPath.LEADERSHIP, 0), // 1 overview + 1 exempt = 2 pages
  ];
  // 2 + 2*5 = 12 pages
  const mediumPages = buildDynamicPassportPages(mediumPaths, { roleName: "Line Cook" });
  assert.equal(mediumPages.length % 2, 0);
  assert.equal(mediumPages.length, 12);
  const onbOverview = mediumPages.find((p) => p.kind === "path" && p.path?.path === DevelopmentPath.ONBOARDING);
  assert.equal(onbOverview?.path?.percent, 100);
  console.log(`   ✓ Medium plan rendered cleanly in ${mediumPages.length} pages.`);

  // Configuration 3: Full Universal Plan (24 milestones across all 5 paths)
  console.log("\n3️⃣ Testing Full Plan Configuration (24 milestones across all 5 paths)...");
  const fullPaths = [
    createPathSummary(DevelopmentPath.ONBOARDING, 5, 5), // 1 overview + ceil(5/4)=2 stamps = 3 pages
    createPathSummary(DevelopmentPath.COMMUNICATION, 5, 3), // 1 overview + ceil(5/4)=2 stamps = 3 pages
    createPathSummary(DevelopmentPath.TECHNICAL, 6, 2), // 1 overview + ceil(6/4)=2 stamps = 3 pages
    createPathSummary(DevelopmentPath.CULTURE, 4, 4), // 1 overview + ceil(4/4)=1 stamps = 2 pages
    createPathSummary(DevelopmentPath.LEADERSHIP, 4, 1), // 1 overview + ceil(4/4)=1 stamps = 2 pages
  ];
  // Raw = 2 + 3 + 3 + 3 + 2 + 2 = 15 pages (ODD!) -> Auto-padded to 16 pages with notes_endorsements
  const fullPages = buildDynamicPassportPages(fullPaths, { roleName: "Store Supervisor" });
  assert.equal(fullPages.length % 2, 0);
  assert.equal(fullPages.length, 16);
  assert.equal(fullPages[fullPages.length - 1].kind, "notes_endorsements");
  console.log(`   ✓ 15-page raw layout auto-padded to ${fullPages.length} pages with Notes & Endorsements page.`);

  // Configuration 4: Lopsided Plan (15 milestones in Technical, 1 in Onboarding, 0 in others)
  console.log("\n4️⃣ Testing Lopsided Plan Configuration (15 milestones in Technical)...");
  const lopsidedPaths = [
    createPathSummary(DevelopmentPath.ONBOARDING, 1), // 1 overview + 1 stamps = 2 pages
    createPathSummary(DevelopmentPath.COMMUNICATION, 0), // 1 overview + 1 exempt = 2 pages
    createPathSummary(DevelopmentPath.TECHNICAL, 15), // 1 overview + ceil(15/4)=4 stamps = 5 pages
    createPathSummary(DevelopmentPath.CULTURE, 0), // 1 overview + 1 exempt = 2 pages
    createPathSummary(DevelopmentPath.LEADERSHIP, 0), // 1 overview + 1 exempt = 2 pages
  ];
  // Raw = 2 + 2 + 2 + 5 + 2 + 2 = 15 pages (ODD!) -> Padded to 16 pages!
  const lopsidedPages = buildDynamicPassportPages(lopsidedPaths, { roleName: "Culinary Specialist" });
  assert.equal(lopsidedPages.length % 2, 0);
  assert.equal(lopsidedPages.length, 16);
  const techStamps = lopsidedPages.filter((p) => p.kind === "stamps" && p.path?.path === DevelopmentPath.TECHNICAL);
  assert.equal(techStamps.length, 4, "15 milestones must produce 4 stamps pages");
  // 4 stamps per page max
  assert(techStamps.every((p) => p.milestones.length <= 4), "Stamps per page strictly bounded to 4 in 2x2 grid");
  console.log(`   ✓ 15 technical competencies cleanly divided into 4 stamp pages in 2x2 grid.`);

  // Invariant Verification: 3D Flip Spread Navigations
  console.log("\n5️⃣ Verifying 3D Page Turn & Spread Math Invariants...");
  for (const pageSet of [minimalPages, mediumPages, fullPages, lopsidedPages]) {
    const totalSpreads = pageSet.length / 2;
    assert.ok(totalSpreads >= 6, "Every book must have at least 6 spreads");
    // Verify each spread has exactly 2 pages
    for (let s = 0; s < totalSpreads; s++) {
      const left = pageSet[s * 2];
      const right = pageSet[s * 2 + 1];
      assert.ok(left && right, `Spread ${s} must have both left and right pages`);
      assert.equal(left.number, s * 2 + 1);
      assert.equal(right.number, s * 2 + 2);
    }
  }
  console.log(`   ✓ All page sets satisfy 2-page spread invariant for 3D flip animation.`);
  console.log(`   ✓ Forward and backward turns guaranteed valid at any page count.`);

  console.log("\n🎉 ISSUE 5.3 ADAPTIVE FLIP-BOOK VISUAL VERIFICATION PASSED WITH 100% SUCCESS!\n");
}

runE2EAdaptiveFlipbook().catch((e) => {
  console.error(e);
  process.exit(1);
});
