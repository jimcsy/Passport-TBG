import { z } from "zod";
import { strobiProposalSchema, type StrobiGenerationInput } from "@/lib/validations/strobi";
import type { StrobiErrorCode, StrobiResult } from "./strobi-types";

export const STROBI_ERROR_MESSAGES: Record<StrobiErrorCode, string> = {
  UNAUTHORIZED: "Sign in as a trainer to use Strobi. Your manual entries are kept.",
  INVALID_INPUT: "Describe the milestone using up to 2,000 characters, then try again.",
  INACCESSIBLE_PLAN: "This plan is no longer available. Continue manually or reopen an available plan.",
  DISABLED: "Strobi is currently turned off. You can complete the milestone manually.",
  UNCONFIGURED: "Strobi is not configured yet. You can complete the milestone manually.",
  BUSY: "You already have a request running. Wait for it to finish before trying again.",
  DAILY_LIMIT: "The daily allowance has been reached. Continue manually or try after the reset below.",
  CANCELLED: "Generation cancelled. Your manual entries are kept.",
  TIMEOUT: "Strobi took too long. Your entries are kept; try again or continue manually.",
  PROVIDER_QUOTA: "Google’s rate limit was reached. Wait before trying again, or continue manually.",
  PROVIDER_UNAVAILABLE: "Strobi could not reach Gemini. Your entries are kept; try again or continue manually.",
  INVALID_OUTPUT: "Strobi returned an unusable suggestion. Your entries are kept; try again or continue manually.",
  REFUSED: "Strobi could not draft this request. Rephrase it without personal or confidential details, or continue manually.",
  UNAVAILABLE: "Strobi is temporarily unavailable. Your entries are kept; try again or continue manually.",
};
const usageSchema = z.object({
  trainerRemaining: z.number().int().nonnegative(), projectRemaining: z.number().int().nonnegative(),
  resetsAt: z.string().refine(value => Number.isFinite(Date.parse(value))),
});
const responseSchema = z.union([
  z.object({ success: z.literal(true), proposal: strobiProposalSchema, usage: usageSchema }),
  z.object({ success: z.literal(false), code: z.enum(Object.keys(STROBI_ERROR_MESSAGES) as [StrobiErrorCode, ...StrobiErrorCode[]]), usage: usageSchema.optional() }),
]);

/** Browser transport: no provider credentials, provider calls, retries or persistence. */
export async function fetchStrobiProposal(input: StrobiGenerationInput, signal: AbortSignal): Promise<StrobiResult> {
  try {
    const response = await fetch("/api/trainer/strobi", {
      method: "POST", credentials: "same-origin", cache: "no-store", signal,
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
    });
    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success || (!response.ok && parsed.data.success)) return { success: false, code: "INVALID_OUTPUT" };
    return parsed.data;
  } catch { return { success: false, code: signal.aborted ? "CANCELLED" : "UNAVAILABLE" }; }
}
