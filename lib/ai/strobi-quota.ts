import "server-only";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import type { StrobiUsage } from "./strobi-types";

export const STROBI_PROJECT_SUBJECT = "strobi";
// Serialize short reservations/cleanup across processes; never hold during HTTP.
export const STROBI_QUOTA_LOCK = 734918501;
export function strobiDay(now: Date) {
  const day = new Date(now.getTime() + 8 * 3_600_000).toISOString().slice(0, 10);
  return { day, resetsAt: new Date(Date.parse(`${day}T00:00:00+08:00`) + 86_400_000).toISOString() };
}
interface Limits { trainerDailyLimit: number; projectDailyLimit: number; requestTimeoutMs: number }
export interface StrobiReservation { token: string; trainerId: string; day: string; usage: StrobiUsage }
export type ReservationResult = { success: true; reservation: StrobiReservation } |
  { success: false; code: "BUSY" | "DAILY_LIMIT"; usage: StrobiUsage };

export async function reserveStrobiQuota(db: PrismaClient, trainerId: string, limits: Limits): Promise<ReservationResult> {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(${STROBI_QUOTA_LOCK})::text`;
    const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
    const { day, resetsAt } = strobiDay(now);
    const projectKey = { scope: "PROJECT", subjectId: STROBI_PROJECT_SUBJECT, day };
    const trainerKey = { scope: "TRAINER", subjectId: trainerId, day };
    const project = await tx.strobiDailyQuota.findUnique({ where: { scope_subjectId_day: projectKey } });
    const trainer = await tx.strobiDailyQuota.findUnique({ where: { scope_subjectId_day: trainerKey } });
    const usage = {
      trainerRemaining: Math.max(0, limits.trainerDailyLimit - (trainer?.attempts ?? 0)),
      projectRemaining: Math.max(0, limits.projectDailyLimit - (project?.attempts ?? 0)), resetsAt,
    };
    const lease = await tx.strobiRequestLease.findUnique({ where: { trainerId } });
    if (lease && lease.expiresAt > now) return { success: false as const, code: "BUSY" as const, usage };
    if (!usage.trainerRemaining || !usage.projectRemaining) return { success: false as const, code: "DAILY_LIMIT" as const, usage };
    const token = randomUUID();
    await tx.strobiDailyQuota.upsert({ where: { scope_subjectId_day: projectKey }, create: { ...projectKey, attempts: 1 }, update: { attempts: { increment: 1 } } });
    await tx.strobiDailyQuota.upsert({ where: { scope_subjectId_day: trainerKey }, create: { ...trainerKey, attempts: 1 }, update: { attempts: { increment: 1 } } });
    const expiresAt = new Date(now.getTime() + limits.requestTimeoutMs + 30_000);
    await tx.strobiRequestLease.upsert({ where: { trainerId }, create: { trainerId, token, expiresAt }, update: { token, expiresAt } });
    return { success: true as const, reservation: { token, trainerId, day, usage: { ...usage, trainerRemaining: usage.trainerRemaining - 1, projectRemaining: usage.projectRemaining - 1 } } };
  }, { maxWait: 10_000, timeout: 15_000 });
}

/** Refund only a proven pre-dispatch cancellation, exactly once while still owning the lease. */
export async function releaseStrobiQuota(db: PrismaClient, reservation: StrobiReservation, refund = false) {
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(${STROBI_QUOTA_LOCK})::text`;
    const deleted = await tx.strobiRequestLease.deleteMany({ where: { trainerId: reservation.trainerId, token: reservation.token } });
    if (refund && deleted.count) {
      for (const key of [{ scope: "PROJECT", subjectId: STROBI_PROJECT_SUBJECT }, { scope: "TRAINER", subjectId: reservation.trainerId }]) {
        await tx.strobiDailyQuota.updateMany({ where: { ...key, day: reservation.day, attempts: { gt: 0 } }, data: { attempts: { decrement: 1 } } });
      }
    }
  }, { maxWait: 10_000, timeout: 15_000 });
}

/** Run from an operator task, not a public endpoint; current-day quota is never removed. */
export async function cleanupStrobiQuota(db: PrismaClient) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(${STROBI_QUOTA_LOCK})::text`;
    const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
    const cutoff = strobiDay(new Date(now.getTime() - 7 * 86_400_000)).day;
    await tx.strobiDailyQuota.deleteMany({ where: { day: { lt: cutoff } } });
    await tx.strobiRequestLease.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - 86_400_000) } } });
  });
}
