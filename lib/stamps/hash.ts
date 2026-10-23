import { createHash } from "node:crypto";
export function generateVerificationHash(traineeId: string, planNodeId: string, verifiedBy: string, verifiedAt: Date): string {
  return createHash("sha256").update(`${traineeId}:${planNodeId}:${verifiedBy}:${verifiedAt.toISOString()}`).digest("hex");
}
export function verificationData(traineeId: string, planNodeId: string, verifiedBy: string, verifiedAt: Date, trainerNote?: string) {
  return { status: "VERIFIED", verifiedBy, verifiedAt, trainerNote: trainerNote?.trim() || null,
    verificationHash: generateVerificationHash(traineeId, planNodeId, verifiedBy, verifiedAt) };
}
