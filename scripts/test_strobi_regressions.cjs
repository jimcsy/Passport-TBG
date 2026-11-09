// Deterministic acceptance checks only. Live provider verification is explicit and separate.
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const buildDir = process.env.PASSPORT_BUILD_DIR || '.next-mobile-check';
const servers = [];
function redact(value) {
  let text = String(value || '').replace(/(?:postgres(?:ql)?|https?):\/\/\S+/g, '[URL redacted]');
  for (const name of ['DATABASE_URL','DIRECT_URL','SESSION_SECRET','GEMINI_API_KEY','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY']) if (process.env[name]) text = text.split(process.env[name]).join('[redacted]');
  return text;
}
async function start(port, enabled) {
  // Check before launching; never reuse or terminate someone else's server.
  await new Promise((resolve, reject) => { const probe = net.createServer(); probe.once('error', () => reject(new Error(`Port ${port} is occupied; choose unused STROBI_TEST_PORT/STROBI_DISABLED_TEST_PORT.`))); probe.listen(port, '127.0.0.1', () => probe.close(resolve)); });
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port), '-H', '127.0.0.1'], {
    env: { ...process.env, PASSPORT_BUILD_DIR: buildDir, STROBI_AI_ENABLED: String(enabled), GEMINI_API_KEY: 'deterministic-test-placeholder', GEMINI_MODEL: 'test-model' }, stdio: 'ignore',
  });
  servers.push(child); const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 80; i++) {
    if (child.exitCode !== null) throw new Error('Isolated test server failed to start.');
    try { const response = await fetch(base, { redirect: "manual", signal: AbortSignal.timeout(2000) }); if (response.status >= 200 && response.status < 400) return base; } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Isolated test server readiness timed out.');
}
const checks = [
  ['contracts', 'test_strobi_contracts.ts'], ['configuration', 'test_strobi_config.cjs'],
  ['service/provider failures', 'test_strobi_service.cjs'], ['HTTP boundary', 'test_strobi_route.cjs'],
  ['shared codes', 'test_shared_milestone_codes.ts'], ['custom codes', 'test_custom_milestone_codes.ts'],
  ['database concurrency/reset/auth', 'test_strobi_quota.cjs'], ['row-lock namespace safety', 'test_database_lock_namespace.cjs'], ['reusable UI/SSR', 'test_strobi_ui.cjs'],
  ['shared library UI', 'test_strobi_shared_browser.cjs'],
  ['builder shared UI', 'test_strobi_shared_browser.cjs', { STROBI_SHARED_SURFACE: 'builder' }],
  ['custom builder UI', 'test_strobi_custom_browser.cjs'],
  ['disabled manual fallback', 'test_strobi_disabled_browser.cjs'],
  ['built API auth/disabled', 'test_strobi_http.cjs', { disabledOrigin: true }],
];
(async () => {
  if (!fs.existsSync(path.join(buildDir, 'BUILD_ID'))) throw new Error('Build first: PASSPORT_BUILD_DIR=.next-mobile-check npm run build');
  const enabledOrigin = await start(Number(process.env.STROBI_TEST_PORT || 3100), true);
  const disabledOrigin = await start(Number(process.env.STROBI_DISABLED_TEST_PORT || 3102), false);
  for (const [name, file, options = {}] of checks) {
    console.log(`RUN Strobi: ${name}`);
    const result = spawnSync(process.execPath, [...(file.endsWith('.ts') ? ['--import', 'tsx'] : []), '--env-file=.env', `scripts/${file}`], {
      env: { ...process.env, STROBI_SHARED_SURFACE: '', STROBI_AI_ENABLED: 'false', STROBI_TEST_BASE_URL: options.disabledOrigin ? disabledOrigin : enabledOrigin, STROBI_DISABLED_TEST_ORIGIN: disabledOrigin, ...(!options.disabledOrigin ? options : {}) },
      encoding: 'utf8', maxBuffer: 4 * 1024 * 1024,
    });
    process.stdout.write(redact(result.stdout)); process.stderr.write(redact(result.stderr));
    if (result.status !== 0) throw new Error(`Failed Strobi check: ${name}`);
  }
  console.log('PASS all 14 Strobi acceptance checks. No live Gemini calls; saved environment unchanged.');
})().catch(error => { console.error(redact(error.message)); process.exitCode = 1; }).finally(async () => {
  await Promise.all(servers.map(child => new Promise(resolve => { if (child.exitCode !== null) return resolve(); child.once('exit', resolve); child.kill('SIGTERM'); setTimeout(() => { if (child.exitCode === null) child.kill('SIGKILL'); }, 5000).unref(); })));
});
