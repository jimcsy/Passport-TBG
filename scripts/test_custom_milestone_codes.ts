import assert from "node:assert/strict";
import { suggestCustomMilestoneCode } from "../lib/milestones/custom-code";
assert.equal(suggestCustomMilestoneCode("TECHNICAL", "BARISTA", new Set()), "BAR-TECH-01");
assert.equal(suggestCustomMilestoneCode("ONBOARDING", "Finance & Audit", new Set()), "FIN-ONB-01");
assert.equal(suggestCustomMilestoneCode("CULTURE", "!", new Set()), "TBG-CULT-01");
const used = new Set(Array.from({ length: 99 }, (_, i) => `bar-tech-${String(i + 1).padStart(2, "0")}`));
assert.equal(suggestCustomMilestoneCode("TECHNICAL", "BARISTA", used), "BAR-TECH-100");
console.log("PASS custom codes: role mappings/fallback, pillar prefix, case-insensitive duplicates and sequence beyond 99.");
