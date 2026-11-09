import "server-only";
import { prisma } from "@/lib/db/prisma";
import { getAdminSession } from "@/lib/auth/session";
import { strobiGenerationInputSchema } from "@/lib/validations/strobi";
import { getStrobiConfiguration } from "./strobi-config";
import { reserveStrobiQuota, releaseStrobiQuota } from "./strobi-quota";
import { prepareGeminiRequest, requestGeminiProposal, StrobiProviderError } from "./gemini";
import type { StrobiContext, StrobiResult } from "./strobi-types";

export const strobiDependencies = {
  getSession: getAdminSession,
  getConfiguration: getStrobiConfiguration,
  async trainerExists(id: string) {
    return !!await prisma.adminUser.findFirst({ where: { id, role: { in: ["TRAINER", "ADMIN", "SUPER_ADMIN"] } }, select: { id: true } });
  },
  async getContext(planId: string): Promise<StrobiContext | null> {
    // Trainer workspace permits all authenticated trainers to manage plans. Do not
    // include private-instance titles, which can contain a trainee's identity.
    const plan = await prisma.trainingPlan.findFirst({ where: { id: planId, status: { not: "ARCHIVED" } }, select: {
      title: true, learningPath: { select: { type: true, targetDepartment: true, targetPosition: true } },
    } });
    if (!plan) return null;
    return {
      ...(plan.learningPath?.type !== "INSTANCE" ? { planTitle: plan.title.slice(0, 100) } : {}),
      ...(plan.learningPath?.targetDepartment ? { department: plan.learningPath.targetDepartment.slice(0, 200) } : {}),
      ...(plan.learningPath?.targetPosition ? { position: plan.learningPath.targetPosition.slice(0, 200) } : {}),
    };
  },
  reserve: (id: string, config: Parameters<typeof reserveStrobiQuota>[2]) => reserveStrobiQuota(prisma, id, config),
  release: (reservation: Parameters<typeof releaseStrobiQuota>[1], refund: boolean) => releaseStrobiQuota(prisma, reservation, refund),
  provider: requestGeminiProposal,
};

export async function generateStrobiProposal(input: unknown, signal?: AbortSignal, dependencies = strobiDependencies): Promise<StrobiResult> {
  try {
    const session = await dependencies.getSession();
    if (!session || !await dependencies.trainerExists(session.id)) return { success: false, code: "UNAUTHORIZED" };
    const parsed = strobiGenerationInputSchema.safeParse(input);
    if (!parsed.success) return { success: false, code: "INVALID_INPUT" };
    const configured = dependencies.getConfiguration();
    if (!configured.available) return { success: false, code: configured.reason === "disabled" ? "DISABLED" : "UNCONFIGURED" };
    const context = parsed.data.planId ? await dependencies.getContext(parsed.data.planId) : {};
    if (!context) return { success: false, code: "INACCESSIBLE_PLAN" };
    const body = prepareGeminiRequest(parsed.data, context);
    if (signal?.aborted) return { success: false, code: "CANCELLED" };
    const admission = await dependencies.reserve(session.id, configured.configuration);
    if (!admission.success) return { success: false, code: admission.code, usage: admission.usage };
    const reservation = admission.reservation;
    let dispatched = false;
    try {
      if (signal?.aborted) return { success: false, code: "CANCELLED" };
      // From this boundary uncertain delivery/failure is counted; never auto retry.
      dispatched = true;
      const proposal = await dependencies.provider(configured.configuration, body, signal);
      return { success: true, proposal, usage: reservation.usage };
    } catch (error) {
      return { success: false, code: error instanceof StrobiProviderError ? error.code : "PROVIDER_UNAVAILABLE", usage: reservation.usage };
    } finally {
      // Failure leaves an expiring guard; never leak internal DB/provider errors.
      await dependencies.release(reservation, !dispatched).catch(() => undefined);
    }
  } catch { return { success: false, code: "UNAVAILABLE" }; }
}
