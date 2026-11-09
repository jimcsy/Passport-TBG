const assert = require('node:assert/strict');
const Module = require('node:module');
// Next supplies this compile-time boundary; test its runtime reader in isolation.
const originalLoad = Module._load;
Module._load = function (id, ...args) { return id === 'server-only' ? {} : originalLoad.call(this, id, ...args); };
require('tsx/cjs');
const { getStrobiConfiguration } = require('../lib/ai/strobi-config.ts');
const names = ['STROBI_AI_ENABLED', 'GEMINI_API_KEY', 'GEMINI_MODEL', 'STROBI_TRAINER_DAILY_LIMIT', 'STROBI_PROJECT_DAILY_LIMIT', 'STROBI_REQUEST_TIMEOUT_MS'];
const prior = names.map(name => [name, process.env[name]]);
try {
  names.forEach(name => delete process.env[name]);
  assert.deepEqual(getStrobiConfiguration(), { available: false, reason: 'disabled' });
  process.env.STROBI_AI_ENABLED = 'true';
  assert.deepEqual(getStrobiConfiguration(), { available: false, reason: 'unconfigured' });
  process.env.GEMINI_API_KEY = 'test-placeholder'; process.env.GEMINI_MODEL = 'test-model';
  assert.equal(getStrobiConfiguration().available, true);
  process.env.STROBI_TRAINER_DAILY_LIMIT = '0';
  assert.deepEqual(getStrobiConfiguration(), { available: false, reason: 'unconfigured' });
  console.log('Strobi server configuration: disabled, missing, valid and invalid configuration passed.');
} finally {
  prior.forEach(([name, value]) => value === undefined ? delete process.env[name] : process.env[name] = value);
  Module._load = originalLoad;
}
