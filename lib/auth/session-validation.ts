import type { JWTPayload } from "jose";

export function isTrainerPayload(payload: JWTPayload): boolean {
  return payload.portal === "trainer" && typeof payload.id === "string" &&
    typeof payload.employeeId === "string" && typeof payload.fullName === "string" &&
    ["TRAINER", "ADMIN", "SUPER_ADMIN"].includes(String(payload.role));
}

export function isTraineePayload(payload: JWTPayload): boolean {
  return payload.portal === "trainee" && typeof payload.id === "string" &&
    typeof payload.traineeCode === "string" && typeof payload.fullName === "string";
}
