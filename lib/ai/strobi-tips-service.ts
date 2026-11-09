import "server-only";
import { strobiTipsDb as prisma } from "./strobi-tips-db";
import { getTraineeSession } from "@/lib/auth/session";
import { resolveStrobiTipAccess, type StrobiTipAccessSnapshot } from "@/lib/db/repositories/strobi-tips";
import { getStrobiTipsConfiguration } from "./strobi-tips-config";
import { getPrewrittenStrobiTip } from "./strobi-tips-content";
import { prepareStrobiTipRequest } from "./strobi-tips-prompt";
import { requestGeminiTip, StrobiProviderError } from "./gemini";
import { createStrobiTipCacheKey, reserveStrobiTip, releaseStrobiTip, completeStrobiTip, getStrobiTipUsage, waitForStrobiTipCache } from "./strobi-tips-store";
import {
  strobiTipRequestSchema, strobiTipAnswerSchema, strobiTipFallbackReasonSchema,
  strobiTipResultSchema, type StrobiTipResult, type StrobiTipUsage, type StrobiTipFallbackReason,
} from "@/lib/validations/strobi-tips";

export const strobiTipsDependencies = {
  getSession: getTraineeSession,
  getAccess: resolveStrobiTipAccess,
  getConfiguration: getStrobiTipsConfiguration,
  reserve: (id: string, key: string, limits: Parameters<typeof reserveStrobiTip>[3]) => reserveStrobiTip(prisma, id, key, limits),
  release: (reservation: Parameters<typeof releaseStrobiTip>[1], refund: boolean) => releaseStrobiTip(prisma, reservation, refund),
  complete: (reservation: Parameters<typeof completeStrobiTip>[1], output: unknown) => completeStrobiTip(prisma, reservation, output),
  usage: (id: string, limits: Parameters<typeof getStrobiTipUsage>[2]) => getStrobiTipUsage(prisma, id, limits),
  wait: (key: string, signal?: AbortSignal) => waitForStrobiTipCache(prisma, key, { signal }),
  provider: requestGeminiTip,
};

function sameAccess(before: StrobiTipAccessSnapshot, after: StrobiTipAccessSnapshot) {
  return before.assignmentId === after.assignmentId && before.planVersionId === after.planVersionId &&
    before.nodeId === after.nodeId && JSON.stringify(before.context) === JSON.stringify(after.context);
}

export async function generateStrobiTip(input: unknown, signal?: AbortSignal, dependencies = strobiTipsDependencies): Promise<StrobiTipResult> {
  let identity: string | undefined, snapshot: StrobiTipAccessSnapshot | undefined;
  const parsed = strobiTipRequestSchema.safeParse(input);
  async function checkAccess(): Promise<Exclude<StrobiTipResult, { success: true }> | null> {
    if (signal?.aborted) return { success: false, code: "CANCELLED" };
    const session = await dependencies.getSession();
    if (!session || session.id !== identity) return { success: false, code: "UNAUTHORIZED" };
    if (!parsed.success || !snapshot) return { success: false, code: "INVALID_INPUT" };
    const current = await dependencies.getAccess(identity!, parsed.data.nodeId);
    if (!current.allowed) return { success: false, code: current.code };
    if (!sameAccess(snapshot, current.snapshot)) return { success: false, code: "STALE_CONTEXT" };
    // JWT expiry can occur while the database lookup is pending.
    const finalSession = await dependencies.getSession();
    if (!finalSession || finalSession.id !== identity) return { success: false, code: "UNAUTHORIZED" };
    if (signal?.aborted) return { success: false, code: "CANCELLED" };
    return null;
  }
  async function deliver(result: StrobiTipResult): Promise<StrobiTipResult> {
    return await checkAccess() ?? strobiTipResultSchema.parse(result);
  }
  async function fallback(reason: StrobiTipFallbackReason, usage?: StrobiTipUsage) {
    if (!parsed.success) return { success: false as const, code: "INVALID_INPUT" as const };
    return deliver({ ...getPrewrittenStrobiTip(parsed.data.questionId, reason), ...(usage ? { usage } : {}) });
  }
  try {
    const session = await dependencies.getSession();
    if (!session) return { success: false, code: "UNAUTHORIZED" };
    identity = session.id;
    if (!parsed.success) return { success: false, code: "INVALID_INPUT" };
    if (signal?.aborted) return { success: false, code: "CANCELLED" };
    const access = await dependencies.getAccess(identity, parsed.data.nodeId);
    if (!access.allowed) return { success: false, code: access.code };
    snapshot = access.snapshot;
    const configured = dependencies.getConfiguration();
    if (!configured.available) return await fallback(configured.reason === "disabled" ? "DISABLED" : "UNCONFIGURED");
    const config = configured.configuration;
    const key = createStrobiTipCacheKey(snapshot.context, parsed.data.questionId, config.model);
    const body = prepareStrobiTipRequest(parsed.data.questionId, snapshot.context);
    if (signal?.aborted) return { success: false, code: "CANCELLED" };
    const admission = await dependencies.reserve(identity, key, config);
    if (admission.status === "CACHED")
      return await deliver({ success: true, source: "REUSED", tip: admission.tip, usage: admission.usage });
    if (admission.status === "REJECTED") return await fallback(admission.code, admission.usage);
    if (admission.status === "WAIT") {
      const tip = await dependencies.wait(key, signal);
      if (signal?.aborted) return { success: false, code: "CANCELLED" };
      const usage = await dependencies.usage(identity, config);
      return tip ? await deliver({ success: true, source: "REUSED", tip, usage }) : await fallback("BUSY", usage);
    }

    const reservation = admission.reservation;
    let dispatched = false;
    try {
      const denial = await checkAccess();
      if (denial) return denial;
      const currentConfig = dependencies.getConfiguration();
      if (!currentConfig.available) return await fallback(currentConfig.reason === "disabled" ? "DISABLED" : "UNCONFIGURED");
      if (currentConfig.configuration.model !== config.model || currentConfig.configuration.apiKey !== config.apiKey)
        return await fallback("UNAVAILABLE");
      if (signal?.aborted) return { success: false, code: "CANCELLED" };
      // Conservative dispatch boundary: once invoked, uncertain delivery counts.
      dispatched = true;
      const output = await dependencies.provider(config, body, signal);
      if (signal?.aborted) return { success: false, code: "CANCELLED" };
      const validated = strobiTipAnswerSchema.safeParse(output);
      if (!validated.success) return await fallback("INVALID_OUTPUT", reservation.usage);
      const changed = await checkAccess();
      if (changed) return changed;
      const enabled = dependencies.getConfiguration();
      if (!enabled.available) return await fallback(enabled.reason === "disabled" ? "DISABLED" : "UNCONFIGURED", reservation.usage);
      if (enabled.configuration.model !== config.model) return await fallback("UNAVAILABLE", reservation.usage);
      if (!await dependencies.complete(reservation, validated.data)) return await fallback("UNAVAILABLE", reservation.usage);
      const usage = await dependencies.usage(identity, config);
      return await deliver({ success: true, source: "GENERATED", tip: validated.data, usage });
    } catch (error) {
      if (signal?.aborted || error instanceof StrobiProviderError && error.code === "CANCELLED") return { success: false, code: "CANCELLED" };
      const reason = strobiTipFallbackReasonSchema.safeParse(error instanceof StrobiProviderError ? error.code : "UNAVAILABLE");
      return await fallback(reason.success ? reason.data : "UNAVAILABLE", reservation.usage);
    } finally {
      // Ownership/expiry recover failed cleanup; never expose DB diagnostics.
      await dependencies.release(reservation, !dispatched).catch(() => undefined);
    }
  } catch {
    if (identity && snapshot && parsed.success) {
      try { return await fallback("UNAVAILABLE"); } catch { /* Cannot reauthorize: fail closed. */ }
    }
    return { success: false, code: signal?.aborted ? "CANCELLED" : "UNAVAILABLE" };
  }
}
