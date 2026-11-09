import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { STROBI_PROJECT_SUBJECT, STROBI_QUOTA_LOCK, strobiDay } from "./strobi-quota";
import {
  STROBI_TIP_CONTRACT_VERSION, STROBI_TIP_PROMPT_VERSION, STROBI_TIPS_POLICY,
  strobiTipAnswerSchema, strobiTipContextSchema, strobiTipQuestionSchema,
  strobiTipsLimitsSchema, strobiTipUsageSchema,
  type StrobiTipAnswer, type StrobiTipsLimits, type StrobiTipUsage,
} from "@/lib/validations/strobi-tips";
import { strobiConfigurationSchema } from "@/lib/validations/strobi";

const keySchema = z.string().regex(/^[a-f0-9]{64}$/);
const subjectSchema = z.string().trim().min(1).max(200);
const versionSchema = z.string().trim().min(1).max(100);
const SCOPE = "TRAINEE";
const AGGREGATE_SCOPE = "TRAINEE_PROJECT";
const DAY_MS = 86_400_000;

export interface StrobiTipReservation {
  token: string;
  scope: "TRAINEE";
  subjectId: string;
  cacheKey: string;
  day: string;
  usage: StrobiTipUsage;
}
export type StrobiTipAdmission =
  | { status: "CACHED"; tip: StrobiTipAnswer; usage: StrobiTipUsage }
  | { status: "WAIT"; cacheKey: string; expiresAt: Date; usage: StrobiTipUsage }
  | { status: "REJECTED"; code: "BUSY" | "DAILY_LIMIT"; usage: StrobiTipUsage }
  | { status: "RESERVED"; reservation: StrobiTipReservation };

/** Exact context sent to the provider, not node/trainee identity or title alone. */
export function createStrobiTipCacheKey(context: unknown, questionId: unknown, model: unknown, versions = {
  prompt: STROBI_TIP_PROMPT_VERSION, contract: STROBI_TIP_CONTRACT_VERSION,
}) {
  const parsed = strobiTipContextSchema.parse(context);
  return createHash("sha256").update(JSON.stringify([
    versionSchema.parse(versions.prompt), versionSchema.parse(versions.contract),
    strobiConfigurationSchema.shape.model.parse(model), strobiTipQuestionSchema.parse(questionId),
    parsed.title, parsed.description, parsed.pillar,
  ])).digest("hex");
}

function limitsOnly(value: StrobiTipsLimits) {
  return strobiTipsLimitsSchema.parse({
    traineeDailyLimit: value.traineeDailyLimit, traineeProjectDailyLimit: value.traineeProjectDailyLimit,
    projectDailyLimit: value.projectDailyLimit, requestTimeoutMs: value.requestTimeoutMs,
  });
}
function quotaKeys(subjectId: string, day: string) {
  return [
    { scope: "PROJECT", subjectId: STROBI_PROJECT_SUBJECT, day },
    { scope: AGGREGATE_SCOPE, subjectId: STROBI_PROJECT_SUBJECT, day },
    { scope: SCOPE, subjectId, day },
  ];
}
async function transaction<T>(db: PrismaClient, work: (tx: Prisma.TransactionClient, now: Date) => Promise<T>) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(${STROBI_QUOTA_LOCK})::text`;
    const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
    return work(tx, now);
  }, { maxWait: 10_000, timeout: 15_000 });
}
async function usageAt(tx: Prisma.TransactionClient, subjectId: string, limits: StrobiTipsLimits, now: Date) {
  const { day, resetsAt } = strobiDay(now);
  const rows = await tx.strobiDailyQuota.findMany({ where: { OR: quotaKeys(subjectId, day) } });
  const used = (scope: string) => rows.find(row => row.scope === scope)?.attempts ?? 0;
  return strobiTipUsageSchema.parse({
    traineeDailyLimit: limits.traineeDailyLimit, traineeProjectDailyLimit: limits.traineeProjectDailyLimit,
    projectDailyLimit: limits.projectDailyLimit,
    traineeRemaining: Math.max(0, limits.traineeDailyLimit - used(SCOPE)),
    traineeProjectRemaining: Math.max(0, limits.traineeProjectDailyLimit - used(AGGREGATE_SCOPE)),
    projectRemaining: Math.max(0, limits.projectDailyLimit - used("PROJECT")),
    resetsAt, timeZone: STROBI_TIPS_POLICY.timeZone,
  });
}
async function cachedAt(tx: Prisma.TransactionClient, key: string, now: Date) {
  const entry = await tx.strobiTipCache.findUnique({ where: { key } });
  if (!entry || entry.expiresAt <= now) return null;
  const parsed = strobiTipAnswerSchema.safeParse(entry.tip);
  return parsed.success ? parsed.data : null;
}

/** Internal storage only. Service must authenticate and check current eligibility first. */
export async function readStrobiTipCache(db: PrismaClient, cacheKey: string) {
  const key = keySchema.parse(cacheKey);
  return transaction(db, (tx, now) => cachedAt(tx, key, now));
}
export async function getStrobiTipUsage(db: PrismaClient, traineeId: string, input: StrobiTipsLimits) {
  const subjectId = subjectSchema.parse(traineeId), limits = limitsOnly(input);
  return transaction(db, (tx, now) => usageAt(tx, subjectId, limits, now));
}

/** Atomic cache-first admission. A waiter owns no lease and spends no attempts. */
export async function reserveStrobiTip(db: PrismaClient, traineeId: string, cacheKey: string, input: StrobiTipsLimits): Promise<StrobiTipAdmission> {
  const subjectId = subjectSchema.parse(traineeId), key = keySchema.parse(cacheKey), limits = limitsOnly(input);
  return transaction(db, async (tx, now) => {
    const usage = await usageAt(tx, subjectId, limits, now);
    const cached = await cachedAt(tx, key, now);
    if (cached) return { status: "CACHED", tip: cached, usage };
    const actorKey = { scope: SCOPE, subjectId };
    const actor = await tx.strobiActorRequestLease.findUnique({ where: { scope_subjectId: actorKey } });
    if (actor && actor.expiresAt > now) return { status: "REJECTED", code: "BUSY", usage };
    const pending = await tx.strobiTipCacheLease.findUnique({ where: { key } });
    if (pending && pending.expiresAt > now) return { status: "WAIT", cacheKey: key, expiresAt: pending.expiresAt, usage };
    if (!usage.traineeRemaining || !usage.traineeProjectRemaining || !usage.projectRemaining)
      return { status: "REJECTED", code: "DAILY_LIMIT", usage };

    const { day } = strobiDay(now), token = randomUUID();
    for (const quotaKey of quotaKeys(subjectId, day)) {
      await tx.strobiDailyQuota.upsert({
        where: { scope_subjectId_day: quotaKey }, create: { ...quotaKey, attempts: 1 }, update: { attempts: { increment: 1 } },
      });
    }
    const expiresAt = new Date(now.getTime() + limits.requestTimeoutMs + 30_000);
    await tx.strobiActorRequestLease.upsert({
      where: { scope_subjectId: actorKey }, create: { ...actorKey, token, cacheKey: key, day, expiresAt },
      update: { token, cacheKey: key, day, expiresAt },
    });
    await tx.strobiTipCacheLease.upsert({ where: { key }, create: { key, token, expiresAt }, update: { token, expiresAt } });
    return { status: "RESERVED", reservation: {
      token, scope: SCOPE, subjectId, cacheKey: key, day,
      usage: { ...usage, traineeRemaining: usage.traineeRemaining - 1, traineeProjectRemaining: usage.traineeProjectRemaining - 1, projectRemaining: usage.projectRemaining - 1 },
    } };
  });
}

/** Only the still-active owner can publish validated generic output. No quota refund. */
export async function completeStrobiTip(db: PrismaClient, reservation: StrobiTipReservation, output: unknown) {
  const tip = strobiTipAnswerSchema.parse(output);
  return transaction(db, async (tx, now) => {
    const actor = await tx.strobiActorRequestLease.findFirst({ where: {
      scope: SCOPE, subjectId: reservation.subjectId, token: reservation.token,
      cacheKey: reservation.cacheKey, day: reservation.day, expiresAt: { gt: now },
    } });
    const pending = await tx.strobiTipCacheLease.findFirst({ where: { key: reservation.cacheKey, token: reservation.token, expiresAt: { gt: now } } });
    if (!actor || !pending) return false;
    const entry = { tip: tip as Prisma.InputJsonObject, createdAt: now, expiresAt: new Date(now.getTime() + STROBI_TIPS_POLICY.cacheTtlDays * DAY_MS) };
    await tx.strobiTipCache.upsert({ where: { key: reservation.cacheKey }, create: { key: reservation.cacheKey, ...entry }, update: entry });
    await tx.strobiActorRequestLease.deleteMany({ where: { scope: SCOPE, subjectId: reservation.subjectId, token: reservation.token } });
    await tx.strobiTipCacheLease.deleteMany({ where: { key: reservation.cacheKey, token: reservation.token } });
    return true;
  });
}

/** Caller proves pre-dispatch cancellation. Both owned leases are needed to refund once. */
export async function releaseStrobiTip(db: PrismaClient, reservation: StrobiTipReservation, refund = false) {
  return transaction(db, async tx => {
    const actor = await tx.strobiActorRequestLease.deleteMany({ where: {
      scope: SCOPE, subjectId: reservation.subjectId, token: reservation.token, cacheKey: reservation.cacheKey, day: reservation.day,
    } });
    const pending = await tx.strobiTipCacheLease.deleteMany({ where: { key: reservation.cacheKey, token: reservation.token } });
    if (refund && actor.count && pending.count) {
      for (const key of quotaKeys(reservation.subjectId, reservation.day))
        await tx.strobiDailyQuota.updateMany({ where: { ...key, attempts: { gt: 0 } }, data: { attempts: { decrement: 1 } } });
    }
  });
}

/** Bounded read-only follower; abort/timeout never releases or refunds another owner. */
export async function waitForStrobiTipCache(db: PrismaClient, cacheKey: string, options: { timeoutMs?: number; signal?: AbortSignal } = {}) {
  const key = keySchema.parse(cacheKey);
  const timeoutMs = z.number().int().min(0).max(5_000).parse(options.timeoutMs ?? 1_000);
  if (!timeoutMs || options.signal?.aborted) return null;
  const controller = new AbortController();
  let stopped = false, timer: ReturnType<typeof setTimeout>;
  let stop: () => void = () => undefined;
  const deadline = new Promise<null>(resolve => {
    stop = () => { stopped = true; controller.abort(); resolve(null); };
    timer = setTimeout(stop, timeoutMs);
    options.signal?.addEventListener("abort", stop, { once: true });
  });
  const poll = (async () => {
    try {
      while (!stopped) {
        const tip = await readStrobiTipCache(db, key);
        if (stopped) return null;
        if (tip) return tip;
        await delay(250, undefined, { signal: controller.signal });
      }
    } catch { /* Read failures become fallback; no provider or lease writes. */ }
    return null;
  })();
  try { return await Promise.race([poll, deadline]); }
  finally { stopped = true; clearTimeout(timer!); controller.abort(); options.signal?.removeEventListener("abort", stop); }
}

/** Trusted operator job only; no public endpoint and no automatic scheduling. */
export async function cleanupStrobiTips(db: PrismaClient) {
  return transaction(db, async (tx, now) => {
    const oldLeaseCutoff = new Date(now.getTime() - DAY_MS);
    const quotaCutoff = strobiDay(new Date(now.getTime() - 7 * DAY_MS)).day;
    const cache = await tx.strobiTipCache.deleteMany({ where: { expiresAt: { lte: now } } });
    const cacheLeases = await tx.strobiTipCacheLease.deleteMany({ where: { expiresAt: { lt: oldLeaseCutoff } } });
    const actors = await tx.strobiActorRequestLease.deleteMany({ where: { expiresAt: { lt: oldLeaseCutoff } } });
    const quotas = await tx.strobiDailyQuota.deleteMany({ where: { day: { lt: quotaCutoff } } });
    return { cache: cache.count, cacheLeases: cacheLeases.count, actors: actors.count, quotas: quotas.count };
  });
}
