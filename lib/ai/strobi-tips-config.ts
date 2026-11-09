import "server-only";
import { strobiTipsConfigurationSchema } from "@/lib/validations/strobi-tips";

/** Independent trainee flag; bad optional AI config never disables static tips. */
export function getStrobiTipsConfiguration() {
  if (process.env.STROBI_TRAINEE_AI_ENABLED !== "true")
    return { available: false as const, reason: "disabled" as const };
  const result = strobiTipsConfigurationSchema.safeParse({
    enabled: process.env.STROBI_TRAINEE_AI_ENABLED,
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL,
    traineeDailyLimit: process.env.STROBI_TRAINEE_DAILY_LIMIT,
    traineeProjectDailyLimit: process.env.STROBI_TRAINEE_PROJECT_DAILY_LIMIT,
    projectDailyLimit: process.env.STROBI_PROJECT_DAILY_LIMIT,
    requestTimeoutMs: process.env.STROBI_REQUEST_TIMEOUT_MS,
  });
  return result.success
    ? { available: true as const, configuration: result.data }
    : { available: false as const, reason: "unconfigured" as const };
}

/** The only configuration projection safe to pass to client components. */
export function getStrobiTipsAvailability() {
  const configured = getStrobiTipsConfiguration();
  return configured.available ? { available: true as const } : configured;
}
