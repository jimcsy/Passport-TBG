require('tsx/cjs');
const assert = require('node:assert/strict');
const Module = require('node:module');
const original = Module._load;
Module._load = function(id, ...args) {
  if (id === 'server-only') return {};
  if (id === '@/lib/auth/session') return { getTraineeSession: async () => null };
  return original.call(this, id, ...args);
};
const { generateStrobiTip } = require('../lib/ai/strobi-tips-service.ts');
const { requestGeminiTip, StrobiProviderError } = require('../lib/ai/gemini.ts');
const { strobiTipResultSchema } = require('../lib/validations/strobi-tips.ts');
const config = { enabled: 'true', apiKey: 'fake-key-for-tests', model: 'test-model', traineeDailyLimit: 3, traineeProjectDailyLimit: 40, projectDailyLimit: 50, requestTimeoutMs: 1000 };
const input = { nodeId: 'node', questionId: 'EXPLAIN_MILESTONE' };
const tip = { answer: 'Practice explaining one routine task clearly.', steps: ['State the goal.', 'Check understanding.'] };
const usage = { traineeDailyLimit: 3, traineeProjectDailyLimit: 40, projectDailyLimit: 50, traineeRemaining: 2, traineeProjectRemaining: 39, projectRemaining: 49, timeZone: 'Asia/Manila', resetsAt: '2026-11-10T16:00:00.000Z' };
const snapshot = { assignmentId: 'assignment', planVersionId: 'version', nodeId: 'node', context: { title: 'Practice active listening', description: 'Explain a task clearly and check understanding with a colleague.', pillar: 'COMMUNICATION' } };
const reservation = { token: 'test-token', scope: 'TRAINEE', subjectId: 'trainee', cacheKey: 'a'.repeat(64), day: '2026-11-10', usage };
function setup(overrides = {}) {
  const calls = { reserve: 0, provider: 0, complete: 0, release: [], wait: 0, bodies: [] };
  const deps = {
    getSession: async () => ({ id: 'trainee' }), getAccess: async () => ({ allowed: true, snapshot }),
    getConfiguration: () => ({ available: true, configuration: config }),
    reserve: async () => { calls.reserve++; return { status: 'RESERVED', reservation }; },
    provider: async (_, body) => { calls.provider++; calls.bodies.push(JSON.parse(body)); return tip; },
    complete: async () => { calls.complete++; return true; }, usage: async () => usage,
    release: async (_, refund) => { calls.release.push(refund); },
    wait: async () => { calls.wait++; return null; }, ...overrides,
  };
  return { calls, deps };
}
const payload = output => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(output) }] } }] });
const response = value => new Response(JSON.stringify(value), { status: 200 });
let stage = 'auth';
(async () => {
  for (const code of ['UNAUTHORIZED','INACCESSIBLE_MILESTONE','LOCKED_MILESTONE','ARCHIVED_MILESTONE']) {
    const { calls, deps } = setup({ getAccess: async () => ({ allowed: false, code }) });
    assert.equal((await generateStrobiTip(input, undefined, deps)).code, code);
    assert.equal(calls.reserve, 0); assert.equal(calls.provider, 0);
  }
  const none = setup({ getSession: async () => null });
  assert.equal((await generateStrobiTip(input, undefined, none.deps)).code, 'UNAUTHORIZED'); assert.equal(none.calls.reserve, 0);
  for (const bad of [{ ...input, prompt: 'untrusted' }, { ...input, questionId: 'GENERAL_CHAT' }, { ...input, nodeId: '' }, { ...input, context: snapshot.context }]) {
    const test = setup(); assert.equal((await generateStrobiTip(bad, undefined, test.deps)).code, 'INVALID_INPUT'); assert.equal(test.calls.reserve, 0);
  }
  stage = 'sources and context';
  for (const reason of ['disabled', 'unconfigured']) {
    const test = setup({ getConfiguration: () => ({ available: false, reason }) });
    const result = await generateStrobiTip(input, undefined, test.deps);
    assert.equal(result.source, 'PREWRITTEN'); assert.equal(result.reason, reason.toUpperCase()); assert.equal(test.calls.reserve, 0);
  }
  const generated = setup();
  assert.deepEqual(await generateStrobiTip(input, undefined, generated.deps), { success: true, source: 'GENERATED', tip, usage });
  assert.deepEqual(generated.calls.release, [false]); assert.equal(generated.calls.provider, 1); assert.equal(generated.calls.complete, 1);
  assert.deepEqual(JSON.parse(generated.calls.bodies[0].contents[0].parts[0].text), { questionId: input.questionId, milestone: snapshot.context });
  const exhausted = { ...usage, traineeRemaining: 0, traineeProjectRemaining: 0, projectRemaining: 0 };
  const cached = setup({ reserve: async () => ({ status: 'CACHED', tip, usage: exhausted }) });
  assert.equal((await generateStrobiTip(input, undefined, cached.deps)).source, 'REUSED'); assert.equal(cached.calls.provider, 0); assert.deepEqual(cached.calls.release, []);
  for (const code of ['BUSY','DAILY_LIMIT']) {
    const test = setup({ reserve: async () => ({ status: 'REJECTED', code, usage }) });
    assert.equal((await generateStrobiTip(input, undefined, test.deps)).reason, code); assert.equal(test.calls.provider, 0); assert.deepEqual(test.calls.release, []);
  }
  for (const received of [null, tip]) {
    const test = setup({ reserve: async () => ({ status: 'WAIT', cacheKey: reservation.cacheKey, usage }), wait: async () => received });
    const result = await generateStrobiTip(input, undefined, test.deps);
    assert.equal(result.source, received ? 'REUSED' : 'PREWRITTEN'); assert.equal(test.calls.provider, 0); assert.deepEqual(test.calls.release, []);
  }
  console.log('PASS auth/input/access gates, disabled/static/new/reused/wait sources, exhausted cache and minimal context');

  stage = 'stale ownership and cancellation';
  for (const when of ['before', 'after']) {
    let changed = false;
    const test = setup({
      reserve: async () => { if (when === 'before') changed = true; return { status: 'RESERVED', reservation }; },
      provider: async () => { changed = true; return tip; },
      getAccess: async () => ({ allowed: true, snapshot: changed ? { ...snapshot, assignmentId: 'reassigned' } : snapshot }),
    });
    assert.equal((await generateStrobiTip(input, undefined, test.deps)).code, 'STALE_CONTEXT');
    assert.equal(test.calls.complete, 0); assert.deepEqual(test.calls.release, [when === 'before']);
  }
  for (const mutation of [
    current => ({ ...current, planVersionId: 'new-version' }),
    current => ({ ...current, context: { ...current.context, description: 'Changed verification criteria for this skill.' } }),
  ]) {
    let changed = false; const test = setup({ provider: async () => { changed = true; return tip; }, getAccess: async () => ({ allowed: true, snapshot: changed ? mutation(snapshot) : snapshot }) });
    assert.equal((await generateStrobiTip(input, undefined, test.deps)).code, 'STALE_CONTEXT'); assert.equal(test.calls.complete, 0);
  }
  for (const code of ['UNAUTHORIZED','LOCKED_MILESTONE','ARCHIVED_MILESTONE','INACCESSIBLE_MILESTONE']) {
    let revoked = false; const test = setup({ provider: async () => { revoked = true; return tip; }, getAccess: async () => revoked ? { allowed: false, code } : { allowed: true, snapshot } });
    assert.equal((await generateStrobiTip(input, undefined, test.deps)).code, code); assert.equal(test.calls.complete, 0); assert.deepEqual(test.calls.release, [false]);
  }
  for (const source of ['CACHED','WAIT','REJECTED']) {
    let revoked = false; const test = setup({
      reserve: async () => { revoked = true; return source === 'CACHED' ? { status: source, tip, usage } : source === 'WAIT' ? { status: source, usage } : { status: source, code: 'DAILY_LIMIT', usage }; },
      getSession: async () => revoked ? null : { id: 'trainee' },
    });
    assert.equal((await generateStrobiTip(input, undefined, test.deps)).code, 'UNAUTHORIZED'); assert.equal(test.calls.provider, 0);
  }
  for (const when of ['before', 'after']) {
    const controller = new AbortController(); const test = setup({
      reserve: async () => { if (when === 'before') controller.abort(); return { status: 'RESERVED', reservation }; },
      provider: async () => { controller.abort(); return tip; },
    });
    assert.equal((await generateStrobiTip(input, controller.signal, test.deps)).code, 'CANCELLED');
    assert.deepEqual(test.calls.release, [when === 'before']); assert.equal(test.calls.complete, 0);
  }
  const pre = new AbortController(); pre.abort(); const cancelled = setup();
  assert.equal((await generateStrobiTip(input, pre.signal, cancelled.deps)).code, 'CANCELLED'); assert.equal(cancelled.calls.reserve, 0);
  const duringAccess = new AbortController();
  const stoppedLookup = setup({ getAccess: async () => { duringAccess.abort(); return { allowed: true, snapshot }; } });
  assert.equal((await generateStrobiTip(input, duringAccess.signal, stoppedLookup.deps)).code, 'CANCELLED');
  assert.equal(stoppedLookup.calls.reserve, 0);
  let flag = true; const toggled = setup({ reserve: async () => { flag = false; return { status: 'RESERVED', reservation }; }, getConfiguration: () => flag ? { available: true, configuration: config } : { available: false, reason: 'disabled' } });
  const disabled = await generateStrobiTip(input, undefined, toggled.deps);
  assert.equal(disabled.reason, 'DISABLED'); assert.equal(disabled.usage, undefined); assert.deepEqual(toggled.calls.release, [true]); assert.equal(toggled.calls.provider, 0);
  console.log('PASS stale assignment/content/version, session/access loss on every source, pre/post dispatch cancellation and owned refunds');

  stage = 'provider and storage failures';
  for (const code of ['TIMEOUT','PROVIDER_QUOTA','PROVIDER_UNAVAILABLE','INVALID_OUTPUT','REFUSED']) {
    const test = setup({ provider: async () => { throw new StrobiProviderError(code); } });
    assert.equal((await generateStrobiTip(input, undefined, test.deps)).reason, code); assert.deepEqual(test.calls.release, [false]);
  }
  for (const bad of [{ answer: '<script>bad</script>', steps: [] }, { answer: 'x'.repeat(1201), steps: [] }, { ...tip, tools: [] }]) {
    const test = setup({ provider: async () => bad }); assert.equal((await generateStrobiTip(input, undefined, test.deps)).reason, 'INVALID_OUTPUT'); assert.equal(test.calls.complete, 0);
  }
  for (const overrides of [
    { reserve: async () => { throw Error('private diagnostics'); } },
    { complete: async () => false }, { complete: async () => { throw Error('private diagnostics'); } },
    { usage: async () => { throw Error('private diagnostics'); } },
  ]) {
    const test = setup(overrides); const output = await generateStrobiTip(input, undefined, test.deps);
    assert.equal(output.reason, 'UNAVAILABLE'); assert(!JSON.stringify(output).includes('private diagnostics'));
  }
  const cleanup = setup({ release: async () => { throw Error('private diagnostics'); } });
  assert.equal((await generateStrobiTip(input, undefined, cleanup.deps)).source, 'GENERATED');
  const failedAccess = setup({ getAccess: async () => { throw Error('private diagnostics'); } });
  assert.deepEqual(await generateStrobiTip(input, undefined, failedAccess.deps), { success: false, code: 'UNAVAILABLE' });
  console.log('PASS safe provider/storage errors, validated output, failed ownership publication and expiring cleanup recovery');

  stage = 'bounded Gemini transport';
  let dispatches = 0;
  assert.deepEqual(await requestGeminiTip(config, '{}', undefined, async (url, options) => {
    dispatches++; assert(url.startsWith('https://generativelanguage.googleapis.com/')); assert.equal(options.redirect, 'error');
    assert.equal(options.headers['x-goog-api-key'], config.apiKey); assert.equal(options.cache, 'no-store'); return response(payload(tip));
  }), tip); assert.equal(dispatches, 1);
  for (const [status, code] of [[429,'PROVIDER_QUOTA'],[503,'PROVIDER_UNAVAILABLE'],[404,'PROVIDER_UNAVAILABLE']])
    await assert.rejects(requestGeminiTip(config, '{}', undefined, async () => new Response(null, { status })), error => error.code === code);
  for (const raw of [payload({ ...tip, url: 'untrusted' }), payload({ answer: '<b>bad</b>', steps: [] }), { candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{}' }] } }] }])
    await assert.rejects(requestGeminiTip(config, '{}', undefined, async () => response(raw)), error => error.code === 'INVALID_OUTPUT');
  await assert.rejects(requestGeminiTip(config, '{}', undefined, async () => response({ promptFeedback: { blockReason: 'SAFETY' } })), error => error.code === 'REFUSED');
  await assert.rejects(requestGeminiTip(config, '{}', undefined, async () => new Response('x'.repeat(65537))), error => error.code === 'INVALID_OUTPUT');
  await assert.rejects(requestGeminiTip({ ...config, requestTimeoutMs: 10 }, '{}', undefined, () => new Promise(() => {})), error => error.code === 'TIMEOUT');
  const controller = new AbortController();
  const pending = requestGeminiTip(config, '{}', controller.signal, () => new Promise(() => {})); controller.abort();
  await assert.rejects(pending, error => error.code === 'CANCELLED');
  assert(strobiTipResultSchema.safeParse({ success: true, source: 'GENERATED', tip, usage }).success);
  console.log('PASS single-dispatch Gemini transport, status/refusal/oversize/malformed handling and timeout/abort even with ignored signals');
})().catch(error => {
  console.error(`FAIL trainee tips service at ${stage} (${error.code || error.name}); raw diagnostics omitted.`);
  console.error(String(error.stack || '').split('\n').filter(line => line.includes('scripts/test_strobi_tips_service.cjs:')).join('\n'));
  if (error.name === 'AssertionError') console.error(error.message);
  process.exitCode = 1;
}).finally(() => { Module._load = original; });
