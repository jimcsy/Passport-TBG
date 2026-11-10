import { strobiTipRequestSchema, strobiTipResultSchema, type StrobiTipRequest, type StrobiTipResult } from "@/lib/validations/strobi-tips";

/** Same-origin transport only: no history, provider secrets, retries or persistence. */
export async function fetchStrobiTip(input: StrobiTipRequest, signal: AbortSignal): Promise<StrobiTipResult> {
  const parsed = strobiTipRequestSchema.safeParse(input);
  if (!parsed.success) return { success: false, code: "INVALID_INPUT" };
  try {
    const response = await fetch("/api/trainee/strobi", {
      method: "POST", credentials: "same-origin", redirect: "error", cache: "no-store", signal,
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data),
    });
    if (response.status === 401) return { success: false, code: "UNAUTHORIZED" };
    const result = strobiTipResultSchema.safeParse(await response.json());
    if (!result.success || (!response.ok && result.data.success)) return { success: false, code: "INVALID_OUTPUT" };
    return result.data;
  } catch { return { success: false, code: signal.aborted ? "CANCELLED" : "UNAVAILABLE" }; }
}
