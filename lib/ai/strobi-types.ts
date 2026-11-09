import type { StrobiProposal } from "@/lib/validations/strobi";

export interface StrobiUsage {
  trainerRemaining: number;
  projectRemaining: number;
  resetsAt: string;
}
export type StrobiErrorCode = "UNAUTHORIZED" | "INVALID_INPUT" | "INACCESSIBLE_PLAN" |
  "DISABLED" | "UNCONFIGURED" | "BUSY" | "DAILY_LIMIT" | "CANCELLED" |
  "TIMEOUT" | "PROVIDER_QUOTA" | "PROVIDER_UNAVAILABLE" | "INVALID_OUTPUT" | "REFUSED" | "UNAVAILABLE";
export type StrobiResult = { success: true; proposal: StrobiProposal; usage: StrobiUsage } |
  { success: false; code: StrobiErrorCode; usage?: StrobiUsage };
export interface StrobiContext {
  planTitle?: string;
  department?: string;
  position?: string;
}
