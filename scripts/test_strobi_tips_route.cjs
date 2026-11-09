require('tsx/cjs');
const assert = require('node:assert/strict');
const Module = require('node:module');
const original = Module._load;
let session = null, calls = 0, result = { success: false, code: 'UNAVAILABLE' };
Module._load = function(id, ...args) {
  if (id === '@/lib/auth/session') return { getTraineeSession: async () => session };
  if (id === '@/lib/ai/strobi-tips-service') return { generateStrobiTip: async () => { calls++; return result; } };
  return original.call(this, id, ...args);
};
const { POST } = require('../app/api/trainee/strobi/route.ts');
const { getPrewrittenStrobiTip } = require('../lib/ai/strobi-tips-content.ts');
const input = { nodeId: 'node', questionId: 'EXPLAIN_MILESTONE' };
function request(body = JSON.stringify(input), options = {}) {
  return new Request('http://localhost:3100/api/trainee/strobi', { method: 'POST', headers: { origin: 'http://localhost:3100', 'content-type': 'application/json', ...options.headers }, body, ...(options.signal ? { signal: options.signal } : {}) });
}
function privateResponse(response) { assert(response.headers.get('cache-control').includes('no-store')); assert(response.headers.get('cache-control').includes('private')); assert.equal(response.headers.get('vary'), 'Cookie, Origin'); }
(async () => {
  let reply = await POST(request()); assert.equal(reply.status, 401); privateResponse(reply); assert.equal(calls, 0);
  session = { id: 'trainee' };
  for (const headers of [
    { origin: 'http://evil.invalid' }, { origin: 'http://localhost:3101' }, { origin: 'https://localhost:3100' },
    { origin: 'null' }, { origin: '' }, { host: '[' }, { host: 'user@localhost:3100' },
    { host: 'localhost:3100/path' }, { origin: 'http://evil.invalid', 'x-forwarded-host': 'evil.invalid' },
  ]) { reply = await POST(request(undefined, { headers })); assert.equal(reply.status, 403); privateResponse(reply); }
  for (const body of ['{bad-json', 'x'.repeat(4097), JSON.stringify({ ...input, prompt: 'untrusted' }), JSON.stringify({ ...input, context: {} }), JSON.stringify({ ...input, questionId: 'GENERAL_CHAT' }), 'null']) {
    reply = await POST(request(body)); assert.equal(reply.status, 400); privateResponse(reply);
  }
  assert.equal((await POST(request(undefined, { headers: { 'content-type': 'application/json-malformed' } }))).status, 400);
  assert.equal((await POST(request(undefined, { headers: { 'content-type': 'text/plain' } }))).status, 400);
  assert.equal(calls, 0);
  const alias = request(undefined, { headers: { host: '127.0.0.1:3100', origin: 'http://127.0.0.1:3100' } });
  assert.equal((await POST(alias)).status, 503); assert.equal(calls, 1);
  for (const [code, status] of [['UNAUTHORIZED',401],['INVALID_INPUT',400],['INACCESSIBLE_MILESTONE',404],['ARCHIVED_MILESTONE',404],['LOCKED_MILESTONE',403],['STALE_CONTEXT',409],['CANCELLED',499],['TIMEOUT',504],['DAILY_LIMIT',429],['UNAVAILABLE',503]]) {
    result = { success: false, code }; reply = await POST(request()); assert.equal(reply.status, status); privateResponse(reply); assert.deepEqual(await reply.json(), result);
  }
  result = getPrewrittenStrobiTip(input.questionId, 'DISABLED');
  reply = await POST(request()); assert.equal(reply.status, 200); assert.equal((await reply.json()).source, 'PREWRITTEN'); privateResponse(reply);
  result = { success: false, code: 'UNAVAILABLE', details: 'private provider diagnostics' };
  reply = await POST(request()); assert.deepEqual(await reply.json(), { success: false, code: 'UNAVAILABLE' });
  const controller = new AbortController(); controller.abort(); const before = calls;
  reply = await POST(request(undefined, { signal: controller.signal })); assert.equal(reply.status, 499); assert.equal(calls, before);
  console.log('PASS trainee API auth, same-origin aliases/forgery/malformed-host rejection, bounded strict JSON, safe statuses and private no-store responses');
})().catch(error => { console.error('FAIL trainee tips route: '+error.name); if(error.name === 'AssertionError') console.error(error.message); process.exitCode = 1; }).finally(() => { Module._load = original; });
