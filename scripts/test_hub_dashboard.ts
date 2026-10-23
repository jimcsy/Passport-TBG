import assert from "node:assert/strict";
import { aggregateCohortProgress, cohortDirectoryHref, type CohortTrainee } from "../lib/dashboard/cohorts";

function trainee(nodes: string[], verified: string[], extra: Partial<CohortTrainee> = {}): CohortTrainee {
  return { restaurantBrand: "Brand & Bistro", cohortBatch: "October / 2026",
    planAssignments: [{ planVersion: { nodes: nodes.map(id => ({ id })) } }],
    progressRecords: verified.map(planNodeId => ({ planNodeId, status: "VERIFIED", isArchived: false })), ...extra };
}
const data = aggregateCohortProgress([
  trainee(["a", "b"], ["a", "old-version"]), // 50%, ignores previous version
  trainee(["c", "d", "e", "f"], ["c", "d", "e", "f"]), // 100%, equal trainee weighting
  trainee(["g"], [], { progressRecords: [{ planNodeId: "g", status: "VERIFIED", isArchived: true }] }), // 0%
  trainee([], []), // empty assigned plan is 0%
  trainee([], [], { planAssignments: [] }), // unassigned excluded
  trainee(["h"], [], { restaurantBrand: "Another brand", progressRecords: [{ planNodeId: "h", status: "READY_FOR_REVIEW", isArchived: false }] }),
]);
assert.equal(data.length, 2);
assert.equal(data[0].brand, "Another brand");
assert.deepEqual(data[1], { brand: "Brand & Bistro", cohort: "October / 2026", traineeCount: 4, avgCompletionPct: 38 });
assert.deepEqual(aggregateCohortProgress([]), []);
assert.equal(aggregateCohortProgress([trainee(["a"], ["a", "a"])])[0].avgCompletionPct, 100);
const url = new URL(cohortDirectoryHref("Brand & Bistro", "October / 2026"), "https://example.test");
assert.equal(url.pathname, "/trainer/trainees");
assert.equal(url.searchParams.get("brand"), "Brand & Bistro");
assert.equal(url.searchParams.get("cohort"), "October / 2026");
console.log("Hub dashboard checks passed: per-trainee averages, active-version scope, archival, missing progress, empty plans, unassigned exclusion, and encoded filter links.");
