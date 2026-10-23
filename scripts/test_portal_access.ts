import assert from "node:assert/strict";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";
import { isTrainerPayload, isTraineePayload } from "../lib/auth/session-validation";

async function main() {
  const key = new TextEncoder().encode(process.env.SESSION_SECRET || "beat-growth-passport-super-secret-key-change-in-production-2024");
  const trainer = { id: "trainer-1", employeeId: "EMP-1", fullName: "Trainer", role: "TRAINER", portal: "trainer" };
  const trainee = { id: "trainee-1", traineeCode: "TBG-1", fullName: "Trainee", portal: "trainee" };
  const sign = (payload: Record<string, unknown>, expiry = "1h") => new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setExpirationTime(expiry).sign(key);
  const trainerToken = await sign(trainer);
  const traineeToken = await sign(trainee);
  async function check(path: string, expected: string | null, cookie?: string) {
    const response = await middleware(new NextRequest(`http://localhost:3000${path}`, { headers: cookie ? { cookie } : {} }));
    assert.equal(response.headers.get("location"), expected ? `http://localhost:3000${expected}` : null, path);
  }
  await check("/trainer/queue", "/trainer/login");
  await check("/trainee/dashboard", "/trainee");
  await check("/trainer/login", null);
  await check("/trainee", null);
  await check("/trainer/queue", null, `beat_admin_session=${trainerToken}`);
  await check("/trainee/dashboard", null, `beat_trainee_session=${traineeToken}`);
  await check("/trainer", null, `beat_admin_session=${trainerToken}`);
  await check("/trainer/login", "/trainer", `beat_admin_session=${trainerToken}`);
  await check("/trainer", "/trainer/login");
  for (const path of ["/trainer/plans", "/trainer/trainees", "/trainer/trainees/new", "/trainer/batch"]) {
    await check(path, null, `beat_admin_session=${trainerToken}`);
  }
  await check("/trainee", "/trainee/dashboard", `beat_trainee_session=${traineeToken}`);
  await check("/trainer/queue", "/trainer/login", `beat_trainee_session=${traineeToken}`);
  await check("/trainer/queue", "/trainer/login", `beat_admin_session=${traineeToken}`);
  await check("/trainee/dashboard", "/trainee", `beat_trainee_session=${trainerToken}`);
  await check("/trainer/queue", "/trainer/login", `beat_admin_session=${await sign({ ...trainer, role: "TRAINEE" })}`);
  await check("/trainer/queue", "/trainer/login", `beat_admin_session=${await sign(trainer, "-1h")}`);
  await check("/trainer/queue", "/trainer/login", "beat_admin_session=invalid");
  assert.equal(isTrainerPayload(trainee), false);
  assert.equal(isTraineePayload(trainer), false);
  console.log("Portal access checks passed: valid sessions, redirects, cross-role tokens, invalid roles, expired and malformed tokens.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
