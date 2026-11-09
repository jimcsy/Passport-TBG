const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const base = process.env.STROBI_TEST_BASE_URL || 'http://localhost:3100';
(async () => {
  const { SignJWT } = await import('jose');
  const key = new TextEncoder().encode(process.env.SESSION_SECRET || 'beat-growth-passport-super-secret-key-change-in-production-2024');
  const sign = payload => new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('2m').sign(key);
  const post = (cookie, body = '{}', origin = base) => fetch(`${base}/api/trainer/strobi`, { method: 'POST', headers: { origin, 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body });
  assert.equal((await post()).status, 401);
  const trainee = await sign({ portal: 'trainee', id: 'not-a-trainer', traineeCode: 'TEST', fullName: 'Test' });
  assert.equal((await post(`beat_admin_session=${trainee}`)).status, 401);
  const trainer = await db.adminUser.findFirst({ where: { role: { in: ['TRAINER', 'ADMIN', 'SUPER_ADMIN'] } }, select: { id: true, role: true } });
  assert(trainer, 'Need an existing trainer for read-only API auth check');
  const token = await sign({ portal: 'trainer', id: trainer.id, role: trainer.role, employeeId: 'test', fullName: 'Test', email: 'test@example.invalid' });
  const cookie = `beat_admin_session=${token}`;
  assert.equal((await post(cookie, '{}', 'https://foreign.invalid')).status, 403);
  assert.equal((await post(cookie, '{invalid')).status, 400);
  if (process.env.STROBI_AI_ENABLED !== 'true') {
    const result = await post(cookie, JSON.stringify({ prompt: 'Draft a teamwork competency', selectedPillar: 'COMMUNICATION' }));
    assert.equal(result.status, 503); assert.equal(result.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await result.json(), { success: false, code: 'DISABLED' });
  }
  console.log('PASS built-app HTTP: unauthenticated/wrong-portal rejection, same-origin enforcement, bounded input and disabled-feature fallback; no provider call or writes.');
})().catch(() => { console.error('FAIL built-app Strobi HTTP assertions (credentials suppressed)'); process.exitCode = 1; }).finally(() => db.$disconnect());
