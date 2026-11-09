import assert from "node:assert/strict";
import { suggestSharedMilestoneCode } from "../lib/milestones/shared-code";
import { customMilestoneSchema } from "../lib/validations/milestones";
import { DevelopmentPath } from "../lib/types/models";
for (const path of Object.values(DevelopmentPath)) {
  const initial = suggestSharedMilestoneCode(path, []);
  assert(customMilestoneSchema.safeParse({ code: initial, title: "Test competency", description: "Demonstrate a clear competency.", path }).success);
  const next = suggestSharedMilestoneCode(path, [initial.toLowerCase(), initial.replace(/01$/, "03")]);
  assert(next.endsWith("02")); assert.notEqual(next, initial);
}
console.log("PASS shared milestone codes: valid per-pillar application suggestions, case-insensitive collisions and first available sequence.");
