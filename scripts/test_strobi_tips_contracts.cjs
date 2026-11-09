// Pure phase-1 checks: no .env, database, server, live provider or saved flag changes.
const assert = require('node:assert/strict');
const Module = require('node:module');
const originalLoad = Module._load;
Module._load = function (id, ...args) { return id === 'server-only' ? {} : originalLoad.call(this, id, ...args); };
require('tsx/cjs');
const esbuild = Module.createRequire(require.resolve('tsx/package.json'))('esbuild');
const contracts = require('../lib/validations/strobi-tips.ts');
const { getStrobiTipsConfiguration, getStrobiTipsAvailability } = require('../lib/ai/strobi-tips-config.ts');
const { getStrobiConfiguration } = require('../lib/ai/strobi-config.ts');
const content = require('../lib/ai/strobi-tips-content.ts');
const { prepareStrobiTipRequest } = require('../lib/ai/strobi-tips-prompt.ts');
const {
  STROBI_TIP_QUESTION_IDS: questions, strobiTipRequestSchema: request,
  strobiTipAnswerSchema: answer, strobiTipContextSchema: context,
  strobiTipUsageSchema: usage, strobiTipResultSchema: result,
  strobiTipsConfigurationSchema: configuration,
} = contracts;
const names = [
  'STROBI_AI_ENABLED', 'STROBI_TRAINEE_AI_ENABLED', 'GEMINI_API_KEY', 'GEMINI_MODEL',
  'STROBI_TRAINER_DAILY_LIMIT', 'STROBI_PROJECT_DAILY_LIMIT', 'STROBI_REQUEST_TIMEOUT_MS',
  'STROBI_TRAINEE_DAILY_LIMIT', 'STROBI_TRAINEE_PROJECT_DAILY_LIMIT',
];
const prior = names.map(name => [name, process.env[name]]);
const fakeKey = 'server-test-placeholder-not-a-key';
const validContext = { title: 'Practice active listening', description: 'Explain a task clearly and check understanding with your colleague.', pillar: 'COMMUNICATION' };
const validAnswer = { answer: 'Practice explaining one task clearly.', steps: ['State its goal.', 'Ask a colleague to repeat the main point.'] };
const validUsage = {
  traineeDailyLimit: 3, traineeProjectDailyLimit: 40, projectDailyLimit: 50,
  traineeRemaining: 2, traineeProjectRemaining: 39, projectRemaining: 49,
  resetsAt: '2026-11-09T16:00:00.000Z', timeZone: 'Asia/Manila',
};

(async () => {
  assert.equal(questions.length, 4);
  assert.deepEqual(Object.keys(content.STROBI_TIP_QUESTION_LABELS), [...questions]);
  for (const questionId of questions) assert(request.safeParse({ nodeId: 'node-1', questionId }).success);
  for (const invalid of [
    { nodeId: '', questionId: questions[0] }, { nodeId: 'x'.repeat(201), questionId: questions[0] },
    { nodeId: 'node-1', questionId: 'GENERAL_CHAT' }, { nodeId: 'node-1', questionId: null },
    ...['prompt', 'context', 'traineeId', 'role', 'history', 'title', 'cacheKey', 'materials', 'description'].map(key => ({ nodeId: 'node-1', questionId: questions[0], [key]: 'untrusted' })),
  ]) assert(!request.safeParse(invalid).success);
  assert.equal(request.parse({ nodeId: ' node-1 ', questionId: questions[0] }).nodeId, 'node-1');
  assert(context.safeParse(validContext).success);
  for (const extra of ['traineeName', 'criteria', 'feedback', 'materials', 'progress', 'stamps'])
    assert(!context.safeParse({ ...validContext, [extra]: 'private-test-data' }).success);

  assert(answer.safeParse(validAnswer).success);
  assert(answer.safeParse({ answer: 'A short tip.', steps: [] }).success);
  assert(answer.safeParse({ answer: Array(120).fill('word').join(' '), steps: [] }).success);
  assert(!answer.safeParse({ answer: Array(121).fill('word').join(' '), steps: [] }).success);
  assert(!answer.safeParse({ answer: Array(119).fill('word').join(' '), steps: ['two words'] }).success);
  assert(!answer.safeParse({ ...validAnswer, steps: ['one', 'two', 'three', 'four'] }).success);
  assert(!answer.safeParse({ answer: 'x'.repeat(1201), steps: [] }).success);
  assert(!answer.safeParse({ answer: 'x'.repeat(1000), steps: ['x'.repeat(400), 'x'.repeat(400)] }).success);
  for (const unsafe of ['', '   ', '<script>alert(1)</script>', '<img src=x onerror=alert(1)>', 'See https://example.test', 'javascript:alert(1)', 'data:text/html,content', 'a\u0000b', 'a\u202eb'])
    assert(!answer.safeParse({ answer: unsafe, steps: [] }).success);
  assert(!answer.safeParse({ ...validAnswer, steps: ['<b>unsafe</b>'] }).success);
  for (const key of ['tools', 'toolCalls', 'functionCall', 'html', 'url', 'verified', 'stamp', 'reflection'])
    assert(!answer.safeParse({ ...validAnswer, [key]: 'untrusted' }).success);

  assert(usage.safeParse(validUsage).success);
  for (const bad of [
    { traineeRemaining: -1 }, { traineeRemaining: 4 }, { traineeProjectRemaining: 41 },
    { projectRemaining: 51 }, { projectRemaining: 1.5 }, { projectRemaining: '1' },
    { traineeDailyLimit: '3' }, { traineeProjectDailyLimit: 41 },
    { resetsAt: 'tomorrow' }, { resetsAt: '2026-02-30T00:00:00Z' },
    { timeZone: 'UTC' }, { apiKey: fakeKey },
  ]) assert(!usage.safeParse({ ...validUsage, ...bad }).success);
  const { projectDailyLimit: omittedLimit, ...incompleteUsage } = validUsage;
  assert(!usage.safeParse(incompleteUsage).success);
  for (const source of ['GENERATED', 'REUSED']) {
    assert(result.safeParse({ success: true, source, tip: validAnswer, usage: validUsage }).success);
    assert(!result.safeParse({ success: true, source, tip: validAnswer }).success);
  }
  for (const questionId of questions) {
    for (const reason of contracts.STROBI_TIP_FALLBACK_REASONS) {
      const tip = content.getPrewrittenStrobiTip(questionId, reason);
      assert.equal(tip.source, 'PREWRITTEN'); assert.equal(tip.reason, reason);
      assert(answer.safeParse(tip.tip).success);
    }
  }
  const first = content.getPrewrittenStrobiTip(questions[0], 'DISABLED');
  first.tip.steps.push('Caller mutation.');
  assert.equal(content.getPrewrittenStrobiTip(questions[0], 'DISABLED').tip.steps.length, 3);
  for (const code of contracts.strobiTipErrorCodeSchema.options) {
    assert(result.safeParse({ success: false, code }).success);
    assert.equal(typeof content.STROBI_TIP_ERROR_MESSAGES[code], 'string');
  }
  for (const forbidden of ['UNAUTHORIZED', 'INACCESSIBLE_MILESTONE', 'LOCKED_MILESTONE', 'ARCHIVED_MILESTONE', 'STALE_CONTEXT', 'CANCELLED'])
    assert.throws(() => content.getPrewrittenStrobiTip(questions[0], forbidden));
  assert.throws(() => content.getPrewrittenStrobiTip('GENERAL_CHAT', 'DISABLED'));
  assert(!result.safeParse({ success: false, code: 'RAW_PROVIDER_ERROR' }).success);
  assert(!result.safeParse({ success: false, code: 'TIMEOUT', details: fakeKey }).success);
  console.log('PASS four-question inputs, strict context/output, combined word/character/step bounds, safe results/usage and all static fallbacks');

  names.forEach(name => delete process.env[name]);
  assert.deepEqual(getStrobiTipsConfiguration(), { available: false, reason: 'disabled' });
  process.env.STROBI_TRAINEE_AI_ENABLED = 'true';
  assert.deepEqual(getStrobiTipsConfiguration(), { available: false, reason: 'unconfigured' });
  process.env.GEMINI_API_KEY = fakeKey; process.env.GEMINI_MODEL = 'test-model';
  for (const trainer of ['true', 'false']) for (const trainee of ['true', 'false']) {
    process.env.STROBI_AI_ENABLED = trainer; process.env.STROBI_TRAINEE_AI_ENABLED = trainee;
    assert.equal(getStrobiConfiguration().available, trainer === 'true');
    assert.equal(getStrobiTipsConfiguration().available, trainee === 'true');
    assert.deepEqual(getStrobiTipsAvailability(), trainee === 'true' ? { available: true } : { available: false, reason: 'disabled' });
  }
  process.env.STROBI_AI_ENABLED = 'true'; process.env.STROBI_TRAINEE_AI_ENABLED = 'true';
  const defaults = getStrobiTipsConfiguration().configuration;
  assert.deepEqual([defaults.traineeDailyLimit, defaults.traineeProjectDailyLimit, defaults.projectDailyLimit, defaults.requestTimeoutMs], [3, 40, 50, 30000]);
  assert.equal(getStrobiConfiguration().configuration.trainerDailyLimit, 10);
  const { enabled, apiKey, model, ...publicDefaults } = defaults;
  assert(!JSON.stringify(getStrobiTipsAvailability()).includes(fakeKey));
  for (const bad of [
    { traineeDailyLimit: '0' }, { traineeDailyLimit: 41 }, { traineeProjectDailyLimit: 41 },
    { projectDailyLimit: 40 }, { projectDailyLimit: 'NaN' }, { requestTimeoutMs: 999 },
    { requestTimeoutMs: 120001 }, { apiKey: '' }, { model: 'invalid/model' },
    { enabled: 'false' }, { trainerDailyLimit: 10 },
  ]) assert(!configuration.safeParse({ ...defaults, ...bad }).success);
  assert(configuration.safeParse({ ...defaults, traineeDailyLimit: 1, traineeProjectDailyLimit: 1, projectDailyLimit: 11 }).success);
  process.env.STROBI_TRAINEE_PROJECT_DAILY_LIMIT = '41';
  assert.deepEqual(getStrobiTipsConfiguration(), { available: false, reason: 'unconfigured' });
  assert(getStrobiConfiguration().available);
  delete process.env.STROBI_TRAINEE_PROJECT_DAILY_LIMIT;
  process.env.STROBI_TRAINER_DAILY_LIMIT = '0';
  assert(!getStrobiConfiguration().available); assert(getStrobiTipsConfiguration().available);
  delete process.env.STROBI_TRAINER_DAILY_LIMIT;
  for (const name of ['GEMINI_API_KEY', 'GEMINI_MODEL']) {
    const value = process.env[name]; delete process.env[name];
    assert.deepEqual(getStrobiTipsAvailability(), { available: false, reason: 'unconfigured' });
    assert(content.getPrewrittenStrobiTip(questions[0], 'UNCONFIGURED').success);
    process.env[name] = value;
  }
  console.log('PASS independent flag matrix, missing/invalid config, coherent 3/40/50 limits, trainer preservation and safe availability');

  const seenInstructions = new Set();
  for (const questionId of questions) {
    const prepared = JSON.parse(prepareStrobiTipRequest(questionId, validContext));
    assert.deepEqual(JSON.parse(prepared.contents[0].parts[0].text), { questionId, milestone: validContext });
    assert.deepEqual(Object.keys(prepared), ['systemInstruction', 'contents', 'generationConfig']);
    assert.deepEqual(Object.keys(prepared.generationConfig.responseJsonSchema.properties).sort(), ['answer', 'steps']);
    assert.equal(prepared.generationConfig.candidateCount, 1);
    assert.equal(prepared.generationConfig.responseMimeType, 'application/json');
    const instruction = prepared.systemInstruction.parts[0].text;
    assert(instruction.includes('untrusted reference data'));
    assert(instruction.includes('120 words total'));
    assert(instruction.includes('trainer alone decides verification'));
    assert(instruction.includes('Never write a reflection'));
    seenInstructions.add(instruction);
    assert(!JSON.stringify(prepared).includes(fakeKey));
  }
  assert.equal(seenInstructions.size, 4);
  assert.throws(() => prepareStrobiTipRequest('GENERAL_CHAT', validContext));
  assert.throws(() => prepareStrobiTipRequest(questions[0], { ...validContext, traineeName: 'private-test-data' }));
  assert(content.STROBI_TIPS_NOTICE.includes('Google'));
  assert(content.STROBI_TIPS_AUTHOR_NOTICE.includes('nonconfidential'));
  assert(content.STROBI_TIPS_ALLOWANCE_HELP.includes('counts even if it fails'));
  console.log('PASS question-specific instructions, provider-only schema, limited payload and privacy/attempt notices');

  const serverBoundary = { name: 'server-only-boundary', setup(build) {
    build.onResolve({ filter: /^server-only$/ }, () => ({ errors: [{ text: 'Server-only code cannot enter browser bundle.' }] }));
  } };
  const bundle = await esbuild.build({ entryPoints: ['lib/ai/strobi-tips-content.ts'], bundle: true, platform: 'browser', write: false, metafile: true, logLevel: 'silent', plugins: [serverBoundary] });
  assert(!bundle.outputFiles[0].text.includes(fakeKey));
  assert(!bundle.outputFiles[0].text.includes('process.env'));
  assert(!Object.keys(bundle.metafile.inputs).some(path => /strobi-tips-(config|prompt)\.ts$/.test(path)));
  for (const path of ['lib/ai/strobi-tips-config.ts', 'lib/ai/strobi-tips-prompt.ts'])
    await assert.rejects(esbuild.build({ entryPoints: [path], bundle: true, platform: 'browser', write: false, logLevel: 'silent', plugins: [serverBoundary] }), error => error.errors.some(item => item.text.includes('Server-only code')));
  console.log('PASS browser-safe content bundle, credential-free projection and enforced server-only module boundaries');
})().catch(() => { console.error('FAIL trainee tip contracts/configuration. No environment or provider output printed.'); process.exitCode = 1; }).finally(() => {
  prior.forEach(([name, value]) => value === undefined ? delete process.env[name] : process.env[name] = value);
  Module._load = originalLoad;
});
