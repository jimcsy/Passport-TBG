import { z } from "zod";
import { DevelopmentPath } from "@/lib/types/models";
import { customMilestoneSchema, milestoneDescriptionSchema } from "./milestones";

export const STROBI_PROMPT_MAX = 2_000;
export const normalizeStrobiPrompt = (value: string) =>
  value.trim().replace(/^\/strobi(?=\s|$)\s*/i, "").trim();

/** User input only; authoritative plan context is resolved by the future server action. */
export const strobiGenerationInputSchema = z.object({
  prompt: z.string().max(STROBI_PROMPT_MAX + 8).transform(normalizeStrobiPrompt)
    .pipe(z.string().min(1, "Describe the milestone to generate.").max(STROBI_PROMPT_MAX)),
  selectedPillar: z.nativeEnum(DevelopmentPath),
  planId: z.string().trim().min(1).max(200).optional(),
}).strict();

/** Unsaved wording only: no code, materials, save or publication fields. */
export const strobiProposalSchema = z.object({
  title: customMilestoneSchema.shape.title,
  description: milestoneDescriptionSchema,
  suggestedPillar: z.nativeEnum(DevelopmentPath),
  pillarRationale: z.string().trim().min(1).max(300),
}).strict();

export type StrobiGenerationInput = z.infer<typeof strobiGenerationInputSchema>;
export type StrobiProposal = z.infer<typeof strobiProposalSchema>;

const positiveInteger = (fallback: number) => z.coerce.number().int().positive().max(1_000_000).default(fallback);
/** Pure validation; environment access belongs exclusively to lib/ai/strobi-config.ts. */
export const strobiConfigurationSchema = z.object({
  enabled: z.literal("true"),
  apiKey: z.string().trim().min(1),
  model: z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9._-]+$/),
  trainerDailyLimit: positiveInteger(10),
  projectDailyLimit: positiveInteger(50),
  requestTimeoutMs: z.coerce.number().int().min(1_000).max(120_000).default(30_000),
});
