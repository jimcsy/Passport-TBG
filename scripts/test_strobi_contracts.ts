import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { customMilestoneSchema, milestoneDescriptionSchema } from "../lib/validations/milestones";
import { PlanNodeInputSchema } from "../lib/validations/plans";
import { strobiGenerationInputSchema, strobiProposalSchema, strobiConfigurationSchema } from "../lib/validations/strobi";
import { DevelopmentPath } from "../lib/types/models";

const milestone = { code: "TEST-01", title: "Test competency", description: "a".repeat(2000), path: DevelopmentPath.ONBOARDING };
assert(customMilestoneSchema.safeParse(milestone).success);
assert(PlanNodeInputSchema.safeParse(milestone).success);
for (const length of [9, 2001]) {
  assert(!milestoneDescriptionSchema.safeParse("a".repeat(length)).success);
  assert(!PlanNodeInputSchema.safeParse({ ...milestone, description: "a".repeat(length) }).success);
}
assert(milestoneDescriptionSchema.safeParse("a".repeat(10)).success);
for (const invalid of [{ code: "ab" }, { code: "A".repeat(26) }, { code: "BAD CODE" }, { title: "ab" }, { title: "a".repeat(101) }])
  assert(!customMilestoneSchema.safeParse({ ...milestone, ...invalid }).success);
const input = { prompt: "/strobi Teach collaboration", selectedPillar: DevelopmentPath.COMMUNICATION };
assert.equal(strobiGenerationInputSchema.parse(input).prompt, "Teach collaboration");
assert.equal(strobiGenerationInputSchema.parse({ ...input, prompt: "Teach collaboration" }).prompt, "Teach collaboration");
for (const prompt of ["", "  ", "/strobi", " /strobi   ", "a".repeat(2001)])
  assert(!strobiGenerationInputSchema.safeParse({ ...input, prompt }).success);
assert(!strobiGenerationInputSchema.safeParse({ ...input, selectedPillar: "INVALID" }).success);
assert(!strobiGenerationInputSchema.safeParse({ ...input, traineeName: "Do not accept context" }).success);
const proposal = { title: milestone.title, description: milestone.description, suggestedPillar: milestone.path, pillarRationale: "Orientation competency" };
assert(strobiProposalSchema.safeParse(proposal).success);
for (const bad of [{ suggestedPillar: "INVALID" }, { title: "" }, { description: "a".repeat(2001) }, { pillarRationale: "" }, { materials: [] }, { code: "AI-01" }])
  assert(!strobiProposalSchema.safeParse({ ...proposal, ...bad }).success);
const config = { enabled: "true", apiKey: "test-placeholder", model: "test-model" };
const parsed = strobiConfigurationSchema.parse(config);
assert.equal(parsed.trainerDailyLimit, 10); assert.equal(parsed.projectDailyLimit, 50);
for (const bad of [{ apiKey: "" }, { model: "" }, { enabled: "false" }, { trainerDailyLimit: "0" }, { projectDailyLimit: "NaN" }, { requestTimeoutMs: 0 }])
  assert(!strobiConfigurationSchema.safeParse({ ...config, ...bad }).success);
const source = readFileSync("lib/ai/strobi-config.ts", "utf8");
assert(source.includes('import "server-only"'));
assert(!source.includes("NEXT_PUBLIC"));
console.log("Strobi contracts: description/save boundaries, existing code/title rules, input/proposal validation and configuration defaults passed.");
