import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";

const SECRET_KEY = process.env.SESSION_SECRET || "beat-growth-passport-super-secret-key-change-in-production-2024";
const encodedKey = new TextEncoder().encode(SECRET_KEY);

export const ADMIN_COOKIE_NAME = "beat_admin_session";
export const TRAINEE_COOKIE_NAME = "beat_trainee_session";

export interface AdminSessionPayload extends JWTPayload {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  role: string;
}

export interface TraineeSessionPayload extends JWTPayload {
  id: string;
  traineeCode: string;
  fullName: string;
  email: string;
  restaurantBrand: string;
  branchLocation: string;
  cohortBatch: string;
}

const ADMIN_EXPIRES_IN = "8h"; // Typical shift duration
const TRAINEE_EXPIRES_IN = "30d"; // Trainees check their passport frequently

export async function encryptSession(
  payload: JWTPayload,
  expiresIn: string
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(encodedKey);
}

export async function decryptSession<T>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as unknown as T;
  } catch {
    return null;
  }
}

// -------------------------------------------------------------
// Admin Session Helpers (Server Actions & Route Handlers)
// -------------------------------------------------------------
export async function setAdminSession(payload: AdminSessionPayload) {
  const token = await encryptSession(payload, ADMIN_EXPIRES_IN);
  const cookieStore = cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
  return token;
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  return decryptSession<AdminSessionPayload>(token);
}

export async function clearAdminSession() {
  const cookieStore = cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

// -------------------------------------------------------------
// Trainee Session Helpers (Server Actions & Route Handlers)
// -------------------------------------------------------------
export async function setTraineeSession(payload: TraineeSessionPayload) {
  const token = await encryptSession(payload, TRAINEE_EXPIRES_IN);
  const cookieStore = cookies();
  cookieStore.set(TRAINEE_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return token;
}

export async function getTraineeSession(): Promise<TraineeSessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(TRAINEE_COOKIE_NAME)?.value;
  if (!token) return null;
  return decryptSession<TraineeSessionPayload>(token);
}

export async function clearTraineeSession() {
  const cookieStore = cookies();
  cookieStore.delete(TRAINEE_COOKIE_NAME);
}
