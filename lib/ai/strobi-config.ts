import "server-only";
import { strobiConfigurationSchema } from "@/lib/validations/strobi";

/** Fail closed for optional AI; never throw, log secrets or disable manual creation. */
export function getStrobiConfiguration() {
  if (process.env.STROBI_AI_ENABLED !== "true") return { available: false as const, reason: "disabled" as const };
  const result = strobiConfigurationSchema.safeParse({
    enabled: process.env.STROBI_AI_ENABLED,
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL,
    trainerDailyLimit: process.env.STROBI_TRAINER_DAILY_LIMIT,
    projectDailyLimit: process.env.STROBI_PROJECT_DAILY_LIMIT,
    requestTimeoutMs: process.env.STROBI_REQUEST_TIMEOUT_MS,
  });
  return result.success
    ? { available: true as const, configuration: result.data }
    : { available: false as const, reason: "unconfigured" as const };
}
