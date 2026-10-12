import assert from "node:assert/strict";
import { buildPassportPages } from "../lib/passport/book";
import { DEVELOPMENT_PATHS } from "../lib/types/models";
import type { PathProgressSummary } from "../lib/db/repositories/trainee";

// Uneven, empty, and large tracks must preserve every stamp within 32 pages.
const paths: PathProgressSummary[] = Object.values(DEVELOPMENT_PATHS).map((meta, index) => ({
  ...meta, path: meta.key, total: [0, 1, 13, 30, 77][index], verified: 0, percent: 0,
  milestones: Array.from({ length: [0, 1, 13, 30, 77][index] }, (_, orderIndex) => ({
    id: `${meta.key}-${orderIndex}`, code: `${meta.key}-${orderIndex}`, title: "Milestone",
    description: "Practice", path: meta.key, orderIndex, status: "IN_PROGRESS" as const,
  })).reverse(),
}));
const pages = buildPassportPages(paths);
assert.equal(pages.length, 32);
assert.deepEqual(pages.map(page => page.number), Array.from({ length: 32 }, (_, index) => index + 1));
assert.equal(pages[0].kind, "cover");
assert.equal(pages[1].kind, "profile");
for (const path of paths) {
  const trackPages = pages.filter(page => page.path?.path === path.path);
  assert.equal(trackPages.length, 6);
  assert.equal(trackPages[0].kind, "path");
  assert.deepEqual(trackPages.flatMap(page => page.milestones.map(m => m.id)),
    [...path.milestones].sort((a, b) => a.orderIndex - b.orderIndex).map(m => m.id));
}
assert.throws(() => buildPassportPages(paths.slice(1)), /exactly five/);
console.log("Passport book checks passed: 32 pages, five tracks, no missing or duplicate milestones.");
