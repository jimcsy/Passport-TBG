import { z } from "zod";
import { DevelopmentPath } from "@/lib/types/models";
import { customMilestoneSchema, milestoneDescriptionSchema } from "./milestones";
import { strobiConfigurationSchema } from "./strobi";

export const STROBI_TIP_QUESTION_IDS = [
  "EXPLAIN_MILESTONE", "PRACTICE_ACTIVITY", "SHOW_EXAMPLE", "PREPARE_FOR_REVIEW",
] as const;
export const STROBI_TIPS_POLICY = {
  traineeDailyLimit: 3,
  traineeProjectDailyLimit: 40,
  trainerReservedCapacity: 10,
  activeRequestLimit: 1,
  timeZone: "Asia/Manila",
  cacheTtlDays: 7,
  maxWords: 120,
  maxCharacters: 1_600,
  maxSteps: 3,
} as const;
export const STROBI_TIP_PROMPT_VERSION = "trainee-tips-v1";
export const STROBI_TIP_CONTRACT_VERSION = "1";

export const strobiTipQuestionSchema = z.enum(STROBI_TIP_QUESTION_IDS);
/** Identity, eligibility, content and cache key must be resolved by the server. */
export const strobiTipRequestSchema = z.object({
  nodeId: z.string().trim().min(1).max(200),
  questionId: strobiTipQuestionSchema,
}).strict();

/** Server-derived context only, never accepted as part of the browser request. */
export const strobiTipContextSchema = z.object({
  title: customMilestoneSchema.shape.title,
  description: milestoneDescriptionSchema,
  pillar: z.nativeEnum(DevelopmentPath),
}).strict();

const plainText = (max: number) => z.string().trim().min(1).max(max)
  .refine(value => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(value), "Use readable plain text.")
  .refine(value => !/<\/?[a-z!][^>]*>/i.test(value), "HTML is not supported.")
  .refine(value => !/(?:https?:\/\/|www\.|javascript\s*:|data\s*:)/i.test(value), "Links are not supported.");

/** Provider schema is also revalidated by the server; never render as HTML/Markdown. */
export const strobiTipAnswerSchema = z.object({
  answer: plainText(1_200),
  steps: z.array(plainText(400)).max(STROBI_TIPS_POLICY.maxSteps),
}).strict().superRefine((value, ctx) => {
  const text = [value.answer, ...value.steps].join(" ");
  if (text.length > STROBI_TIPS_POLICY.maxCharacters)
    ctx.addIssue({ code: "custom", message: "Tip is too long." });
  if (text.split(/\s+/).length > STROBI_TIPS_POLICY.maxWords)
    ctx.addIssue({ code: "custom", message: "Use at most 120 words, including steps." });
});

const positiveInteger = (fallback: number) => z.coerce.number().int().positive().max(1_000_000).default(fallback);
function coherentLimits(value: { traineeDailyLimit: number; traineeProjectDailyLimit: number; projectDailyLimit: number }, ctx: z.RefinementCtx) {
  if (value.traineeDailyLimit > value.traineeProjectDailyLimit)
    ctx.addIssue({ code: "custom", path: ["traineeDailyLimit"], message: "Personal allowance must fit the trainee aggregate allowance." });
  if (value.traineeProjectDailyLimit > value.projectDailyLimit - STROBI_TIPS_POLICY.trainerReservedCapacity)
    ctx.addIssue({ code: "custom", path: ["traineeProjectDailyLimit"], message: "Trainee allowance must preserve ten requests within the shared project allowance." });
}

export const strobiTipsLimitsSchema = z.object({
  traineeDailyLimit: positiveInteger(STROBI_TIPS_POLICY.traineeDailyLimit),
  traineeProjectDailyLimit: positiveInteger(STROBI_TIPS_POLICY.traineeProjectDailyLimit),
  projectDailyLimit: strobiConfigurationSchema.shape.projectDailyLimit,
  requestTimeoutMs: strobiConfigurationSchema.shape.requestTimeoutMs,
}).strict().superRefine(coherentLimits);

/** Uses the existing project's limit/provider settings; never a second project pool. */
export const strobiTipsConfigurationSchema = strobiConfigurationSchema.pick({
  apiKey: true, model: true, projectDailyLimit: true, requestTimeoutMs: true,
}).extend({
  enabled: z.literal("true"),
  traineeDailyLimit: strobiTipsLimitsSchema.shape.traineeDailyLimit,
  traineeProjectDailyLimit: strobiTipsLimitsSchema.shape.traineeProjectDailyLimit,
}).strict().superRefine(coherentLimits);

export const strobiTipUsageSchema = z.object({
  traineeDailyLimit: z.number().int().positive().max(1_000_000),
  traineeProjectDailyLimit: z.number().int().positive().max(1_000_000),
  projectDailyLimit: z.number().int().positive().max(1_000_000),
  traineeRemaining: z.number().int().nonnegative(),
  traineeProjectRemaining: z.number().int().nonnegative(),
  projectRemaining: z.number().int().nonnegative(),
  resetsAt: z.iso.datetime({ offset: true }),
  timeZone: z.literal(STROBI_TIPS_POLICY.timeZone),
}).strict().superRefine((value, ctx) => {
  coherentLimits(value, ctx);
  for (const [remaining, limit] of [
    ["traineeRemaining", "traineeDailyLimit"],
    ["traineeProjectRemaining", "traineeProjectDailyLimit"],
    ["projectRemaining", "projectDailyLimit"],
  ] as const) {
    if (value[remaining] > value[limit])
      ctx.addIssue({ code: "custom", path: [remaining], message: "Remaining allowance exceeds its limit." });
  }
});

export const STROBI_TIP_FALLBACK_REASONS = [
  "DISABLED", "UNCONFIGURED", "BUSY", "DAILY_LIMIT", "TIMEOUT", "PROVIDER_QUOTA",
  "PROVIDER_UNAVAILABLE", "INVALID_OUTPUT", "REFUSED", "UNAVAILABLE",
] as const;
export const strobiTipFallbackReasonSchema = z.enum(STROBI_TIP_FALLBACK_REASONS);
export const strobiTipErrorCodeSchema = z.enum([
  ...STROBI_TIP_FALLBACK_REASONS, "UNAUTHORIZED", "INVALID_INPUT",
  "INACCESSIBLE_MILESTONE", "LOCKED_MILESTONE", "ARCHIVED_MILESTONE", "STALE_CONTEXT", "CANCELLED",
]);
export const STROBI_TIP_SOURCE_LABELS = {
  GENERATED: "AI-generated tip",
  REUSED: "Reused AI tip",
  PREWRITTEN: "Prewritten practice tip",
} as const;

/** Access/cancel errors cannot masquerade as an authorized prewritten success. */
export const strobiTipResultSchema = z.union([
  z.object({ success: z.literal(true), source: z.enum(["GENERATED", "REUSED"]), tip: strobiTipAnswerSchema, usage: strobiTipUsageSchema }).strict(),
  z.object({ success: z.literal(true), source: z.literal("PREWRITTEN"), tip: strobiTipAnswerSchema, reason: strobiTipFallbackReasonSchema, usage: strobiTipUsageSchema.optional() }).strict(),
  z.object({ success: z.literal(false), code: strobiTipErrorCodeSchema, usage: strobiTipUsageSchema.optional() }).strict(),
]);

export type StrobiTipQuestionId = z.infer<typeof strobiTipQuestionSchema>;
export type StrobiTipRequest = z.infer<typeof strobiTipRequestSchema>;
export type StrobiTipContext = z.infer<typeof strobiTipContextSchema>;
export type StrobiTipAnswer = z.infer<typeof strobiTipAnswerSchema>;
export type StrobiTipUsage = z.infer<typeof strobiTipUsageSchema>;
export type StrobiTipFallbackReason = z.infer<typeof strobiTipFallbackReasonSchema>;
export type StrobiTipErrorCode = z.infer<typeof strobiTipErrorCodeSchema>;
export type StrobiTipResult = z.infer<typeof strobiTipResultSchema>;
export type StrobiTipsLimits = z.infer<typeof strobiTipsLimitsSchema>;
