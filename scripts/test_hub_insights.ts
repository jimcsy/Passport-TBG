import assert from "node:assert/strict";
import { summarizeHub, manilaDay, type InsightTrainee } from "../lib/dashboard/insights";

const now = new Date("2026-11-08T04:00:00Z");
function trainee(extra: Partial<InsightTrainee> = {}): InsightTrainee {
  return { createdAt: new Date("2026-11-05T00:00:00Z"), restaurantBrand: "Fixture", cohortBatch: "November",
    contentView: null, planAssignments: [{ planVersion: { nodes: [{ id: "one", path: "TECHNICAL" }, { id: "two", path: "ONBOARDING" }] } }],
    progressRecords: [], ...extra };
}
const data = summarizeHub([
  trainee({ contentView: { firstViewedAt: new Date("2026-11-07T16:01:00Z") }, progressRecords: [
    { planNodeId: "one", status: "VERIFIED", isArchived: false, requestedAt: null },
    { planNodeId: "one", status: "VERIFIED", isArchived: false, requestedAt: null },
    { planNodeId: "two", status: "READY_FOR_REVIEW", isArchived: false, requestedAt: new Date("2026-11-06T01:00:00Z") },
    { planNodeId: "old", status: "VERIFIED", isArchived: false, requestedAt: null },
  ] }),
  trainee({ progressRecords: [{ planNodeId: "one", status: "VERIFIED", isArchived: true, requestedAt: null }] }),
  trainee({ planAssignments: [], progressRecords: [] }),
], now);
assert.equal(data.registered, 3); assert.equal(data.viewers, 1); assert.equal(data.assigned, 2); assert.equal(data.unassigned, 1);
assert.equal(data.pendingReviews, 1); assert.equal(data.oldestReviewDays, 2);
assert.equal(data.verified, 1); assert.equal(data.total, 4); assert.equal(data.completionPercent, 25);
assert.equal(data.pillars.find(p => p.path === "TECHNICAL")?.verified, 1);
assert.equal(data.pillars.find(p => p.path === "TECHNICAL")?.learners, 1);
assert.equal(data.series.length, 90); assert.deepEqual(data.series.at(-1), { date: "2026-11-08", registered: 3, viewed: 1 });
assert.equal(data.series.at(-2)?.viewed, 0); assert.equal(data.series.at(-5)?.registered, 0);
assert.equal(manilaDay(new Date("2026-11-07T16:00:00Z")), "2026-11-08");
const empty = summarizeHub([], now); assert.equal(empty.completionPercent, 0); assert.equal(empty.series.at(-1)?.registered, 0);
assert.ok(empty.pillars.every(p => p.total === 0 && p.verified === 0));
assert.equal(summarizeHub([trainee({ progressRecords: [{ planNodeId: "one", status: "IN_PROGRESS", isArchived: false, requestedAt: null }] })], now).verified, 0);
assert.equal(summarizeHub([trainee()], now).viewers, 0, "Progress/registration must never imply a content view");
console.log("PASS: real unique viewer counts, Philippine dates, cumulative history, active-plan scope, archival/revocation exclusion, deduplication, pending queue and zero states");
