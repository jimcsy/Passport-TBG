require('tsx/cjs');
const assert = require('node:assert/strict');
const Module = require('node:module');
let session = null, calls = 0, code = null;
const original = Module._load;
Module._load = function(id, ...args) {
  if (id === '@/lib/auth/session') return { getAdminSession: async () => session };
  if (id === '@/lib/ai/strobi-service') return { generateStrobiProposal: async () => { calls++; return { success: false, code: code || 'DISABLED' }; } };
  return original.call(this, id, ...args);
};
const { POST } = require('../app/api/trainer/strobi/route.ts');
function request(body = '{}', origin = 'http://localhost', type = 'application/json') {
  return new Request('http://localhost/api/trainer/strobi', { method: 'POST', headers: { origin, 'content-type': type }, body });
}
(async () => {
  assert.equal((await POST(request())).status, 401); assert.equal(calls, 0);
  session = { id: 'trainer' };
  assert.equal((await POST(request('{}', 'https://foreign.invalid'))).status, 403);
  assert.equal((await POST(request('{}', 'http://localhost', 'text/plain'))).status, 400);
  assert.equal((await POST(request('{bad-json'))).status, 400);
  assert.equal((await POST(request('x'.repeat(17000)))).status, 400); assert.equal(calls, 0);
  // A valid browser Host can differ from Next's internal request URL hostname.
  const alias = new Request('http://localhost:3100/api/trainer/strobi', { method: 'POST', headers: { origin: 'http://127.0.0.1:3100', host: '127.0.0.1:3100', 'content-type': 'application/json' }, body: '{}' });
  assert.equal((await POST(alias)).status, 503);
  const forged = new Request('http://localhost:3100/api/trainer/strobi', { method: 'POST', headers: { origin: 'http://evil.invalid', host: '127.0.0.1:3100', 'x-forwarded-host': 'evil.invalid', 'content-type': 'application/json' }, body: '{}' });
  assert.equal((await POST(forged)).status, 403);
  const crossPort = new Request('http://localhost:3100/api/trainer/strobi', { method: 'POST', headers: { origin: 'http://127.0.0.1:3101', host: '127.0.0.1:3100', 'content-type': 'application/json' }, body: '{}' });
  assert.equal((await POST(crossPort)).status, 403);
  const crossScheme = new Request('http://localhost:3100/api/trainer/strobi', { method: 'POST', headers: { origin: 'https://127.0.0.1:3100', host: '127.0.0.1:3100', 'content-type': 'application/json' }, body: '{}' });
  assert.equal((await POST(crossScheme)).status, 403);
  for (const [errorCode, status] of [['DISABLED', 503], ['UNAUTHORIZED', 401], ['DAILY_LIMIT', 429], ['BUSY', 429], ['PROVIDER_QUOTA', 429], ['INACCESSIBLE_PLAN', 404], ['TIMEOUT', 504], ['CANCELLED', 499]]) {
    code = errorCode; const result = await POST(request());
    assert.equal(result.status, status); assert.equal(result.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await result.json(), { success: false, code: errorCode });
  }
  console.log('PASS Strobi HTTP boundary: authentication, same-origin enforcement, bounded JSON, safe errors/status and no-store responses.');
})().catch(() => { console.error('FAIL Strobi HTTP assertions'); process.exitCode = 1; }).finally(() => { Module._load = original; });
