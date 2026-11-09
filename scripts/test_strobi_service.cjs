require('tsx/cjs');
const assert = require('node:assert/strict');
const Module = require('node:module');
const originalLoad = Module._load;
Module._load = function(id, ...args) {
  if (id === 'server-only') return {};
  if (id === '@/lib/auth/session') return { getAdminSession: async () => null };
  return originalLoad.call(this, id, ...args);
};
const { generateStrobiProposal } = require('../lib/ai/strobi-service.ts');
const { requestGeminiProposal, StrobiProviderError, prepareGeminiRequest } = require('../lib/ai/gemini.ts');
const { strobiDay } = require('../lib/ai/strobi-quota.ts');
const config = { apiKey: 'fake-key-for-test-only', model: 'test-model', requestTimeoutMs: 1000, trainerDailyLimit: 10, projectDailyLimit: 50, enabled: 'true' };
const input = { prompt: '/strobi Make a teamwork milestone', selectedPillar: 'COMMUNICATION', planId: 'test-plan' };
const proposal = { title: 'Team collaboration', description: 'Demonstrate active listening and summarize agreed actions for trainer review.', suggestedPillar: 'COMMUNICATION', pillarRationale: 'Practices communication.' };
const usage = { trainerRemaining: 9, projectRemaining: 49, resetsAt: '2026-11-09T16:00:00.000Z' };
function makeDependencies(overrides = {}) {
  const calls = { reserve: 0, provider: 0, releases: [], bodies: [] };
  return { calls, dependencies: {
    getSession: async () => ({ id: 'trainer' }), trainerExists: async () => true,
    getConfiguration: () => ({ available: true, configuration: config }),
    getContext: async () => ({ planTitle: 'Safe track', department: 'ICT Department', position: 'Application Developer' }),
    reserve: async () => { calls.reserve++; return { success: true, reservation: { token: 'token', trainerId: 'trainer', day: '2026-11-09', usage } }; },
    release: async (_, refund) => { calls.releases.push(refund); },
    provider: async (_, body) => { calls.provider++; calls.bodies.push(JSON.parse(body)); return proposal; }, ...overrides,
  } };
}
const response = payload => new Response(JSON.stringify(payload), { status: 200 });
const payload = raw => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(raw) }] } }] });
(async () => {
  for (const overrides of [{ getSession: async () => null }, { trainerExists: async () => false }]) {
    const { calls, dependencies } = makeDependencies(overrides);
    assert.equal((await generateStrobiProposal(input, undefined, dependencies)).code, 'UNAUTHORIZED');
    assert.equal(calls.reserve, 0); assert.equal(calls.provider, 0);
  }
  for (const invalid of [{ ...input, selectedPillar: 'FAKE' }, { ...input, prompt: '/strobi' }, { ...input, department: 'forged-context' }]) {
    const { calls, dependencies } = makeDependencies();
    assert.equal((await generateStrobiProposal(invalid, undefined, dependencies)).code, 'INVALID_INPUT');
    assert.equal(calls.reserve, 0); assert.equal(calls.provider, 0);
  }
  for (const reason of ['disabled', 'unconfigured']) {
    const { calls, dependencies } = makeDependencies({ getConfiguration: () => ({ available: false, reason }) });
    assert.equal((await generateStrobiProposal(input, undefined, dependencies)).code, reason.toUpperCase());
    assert.equal(calls.reserve, 0);
  }
  {
    const { calls, dependencies } = makeDependencies({ getContext: async () => null });
    assert.equal((await generateStrobiProposal(input, undefined, dependencies)).code, 'INACCESSIBLE_PLAN');
    assert.equal(calls.provider, 0); assert.equal(calls.reserve, 0);
  }
  {
    const { calls, dependencies } = makeDependencies();
    const result = await generateStrobiProposal(input, undefined, dependencies);
    assert.deepEqual(result, { success: true, proposal, usage }); assert.deepEqual(calls.releases, [false]);
    const context = JSON.parse(calls.bodies[0].contents[0].parts[0].text);
    assert.deepEqual(Object.keys(context).sort(), ['department', 'planTitle', 'position', 'request', 'selectedPillar']);
    assert.equal(context.request, 'Make a teamwork milestone');
  }
  for (const code of ['BUSY', 'DAILY_LIMIT']) {
    const { calls, dependencies } = makeDependencies({ reserve: async () => ({ success: false, code, usage }) });
    assert.equal((await generateStrobiProposal(input, undefined, dependencies)).code, code); assert.equal(calls.provider, 0);
  }
  for (const code of ['TIMEOUT', 'PROVIDER_QUOTA', 'REFUSED', 'INVALID_OUTPUT', 'PROVIDER_UNAVAILABLE', 'CANCELLED']) {
    const { calls, dependencies } = makeDependencies({ provider: async () => { throw new StrobiProviderError(code); } });
    assert.equal((await generateStrobiProposal(input, undefined, dependencies)).code, code);
    assert.deepEqual(calls.releases, [false]);
  }
  {
    const controller = new AbortController(); const { calls, dependencies } = makeDependencies();
    controller.abort(); assert.equal((await generateStrobiProposal(input, controller.signal, dependencies)).code, 'CANCELLED');
    assert.equal(calls.reserve, 0);
  }
  {
    const controller = new AbortController();
    const { calls, dependencies } = makeDependencies({ reserve: async () => { controller.abort(); return { success: true, reservation: { token: 't', trainerId: 'trainer', day: '2026-11-09', usage } }; } });
    assert.equal((await generateStrobiProposal(input, controller.signal, dependencies)).code, 'CANCELLED');
    assert.equal(calls.provider, 0); assert.deepEqual(calls.releases, [true]);
  }
  let fetchCalls = 0;
  assert.deepEqual(await requestGeminiProposal(config, '{}', undefined, async (url, options) => {
    fetchCalls++; assert(url.startsWith('https://generativelanguage.googleapis.com/'));
    assert(!url.includes(config.apiKey)); assert.equal(options.headers['x-goog-api-key'], config.apiKey);
    assert.equal(options.redirect, 'error'); return response(payload(proposal));
  }), proposal);
  assert.equal(fetchCalls, 1);
  for (const [mock, code] of [
    [async () => new Response('', { status: 429 }), 'PROVIDER_QUOTA'],
    [async () => new Response('sensitive failure', { status: 503 }), 'PROVIDER_UNAVAILABLE'],
    [async () => response({ promptFeedback: { blockReason: 'SAFETY' } }), 'REFUSED'],
    [async () => response({ candidates: [{ finishReason: 'SAFETY' }] }), 'REFUSED'],
    [async () => response({}), 'INVALID_OUTPUT'],
    [async () => new Response('not-json'), 'INVALID_OUTPUT'],
    [async () => response({ candidates: 'malformed' }), 'INVALID_OUTPUT'],
    [async () => response(payload({ ...proposal, materials: ['forbidden'] })), 'INVALID_OUTPUT'],
    [async () => response({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'not JSON' }] } }] }), 'INVALID_OUTPUT'],
    [async () => new Response('x'.repeat(70_000)), 'INVALID_OUTPUT'],
    [async () => { throw new Error('sensitive provider detail'); }, 'PROVIDER_UNAVAILABLE'],
    [async () => new Promise(() => {}), 'TIMEOUT'],
  ]) {
    await assert.rejects(requestGeminiProposal(config, '{}', undefined, mock), error => error.code === code && error.message === code);
  }
  const controller = new AbortController();
  const pending = requestGeminiProposal(config, '{}', controller.signal, async () => new Promise(() => {}));
  controller.abort(); await assert.rejects(pending, error => error.code === 'CANCELLED');
  assert.equal(strobiDay(new Date('2026-11-09T15:59:59.999Z')).day, '2026-11-09');
  assert.deepEqual(strobiDay(new Date('2026-11-09T16:00:00.000Z')), { day: '2026-11-10', resetsAt: '2026-11-10T16:00:00.000Z' });
  console.log('PASS Strobi service: authorization/context, no-call rejection, admission, dispatch accounting, cancellation, structured output, provider failures/timeout, safe errors and Manila boundaries.');
})().catch(() => { console.error('FAIL Strobi service assertions (sensitive error details suppressed)'); process.exitCode = 1; }).finally(() => { Module._load = originalLoad; });
