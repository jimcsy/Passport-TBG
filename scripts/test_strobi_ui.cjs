const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const esbuild = require('esbuild');
const Module = require('node:module');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/tmp/passport-account-check/node_modules/playwright');
const proposal = { title: 'Explain a monthly report', description: 'Explain a sample report to a colleague. The trainer checks the summary, clarity and answers to follow-up questions.', suggestedPillar: 'COMMUNICATION', pillarRationale: 'Builds clear cross-department communication.' };
const usage = { trainerRemaining: 9, projectRemaining: 49, resetsAt: '2026-11-09T16:00:00.000Z' };
const success = (extra = {}) => ({ success: true, proposal: { ...proposal, ...extra }, usage });
let server, browser, directory;
(async () => {
  // Verify the real client component can also be pre-rendered without layout-effect warnings.
  const ssr = esbuild.buildSync({ stdin: { contents: `
    import { createElement } from 'react'; import { renderToString } from 'react-dom/server';
    import { AskStrobi } from './components/admin/strobi/AskStrobi';
    export function render() { return renderToString(createElement(AskStrobi, {
      contextKey: 'ssr', isOpen: true, selectedPillar: 'ONBOARDING', availability: 'disabled',
      fields: { title: '', description: '' }, onApplyFields() {}, onUsePillar() {}
    })); }`, resolveDir: process.cwd(), loader: 'tsx' }, bundle: true, write: false, jsx: 'automatic', platform: 'node', format: 'cjs', external: ['react', 'react-dom'] });
  const compiled = new Module(path.join(process.cwd(), 'scripts/__strobi_ssr_check.cjs'));
  compiled.filename = path.join(process.cwd(), 'scripts/__strobi_ssr_check.cjs');
  compiled.paths = Module._nodeModulePaths(process.cwd()); compiled._compile(ssr.outputFiles[0].text, compiled.filename);
  const warnings = []; const priorError = console.error;
  try { console.error = (...args) => warnings.push(args.join(' ')); assert(compiled.exports.render().includes('Ask Strobi')); }
  finally { console.error = priorError; }
  assert.deepEqual(warnings, []);
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'strobi-ui-'));
  await esbuild.build({ entryPoints: ['scripts/fixtures/StrobiAssistantHarness.tsx'], bundle: true, outfile: path.join(directory, 'app.js'), jsx: 'automatic', platform: 'browser', define: { 'process.env.NODE_ENV': '"development"' } });
  execFileSync('node_modules/.bin/tailwindcss', ['-i', 'app/globals.css', '-o', path.join(directory, 'app.css'), '--content', 'components/admin/strobi/**/*.tsx,scripts/fixtures/StrobiAssistantHarness.tsx', '--minify'], { stdio: 'pipe' });
  const html = '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Strobi component verification</title><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>';
  server = http.createServer(async (req, res) => { const file = req.url === '/app.js' ? 'app.js' : req.url === '/app.css' ? 'app.css' : null; res.setHeader('Content-Type', file ? file.endsWith('.js') ? 'application/javascript' : 'text/css' : 'text/html'); res.end(file ? await fs.readFile(path.join(directory, file)) : html); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const queue = [], requests = [];
  await page.route('**/api/trainer/strobi', async route => {
    const item = queue.shift(); requests.push(route.request().postDataJSON());
    if (!item) throw new Error('Unexpected generation request');
    if (item.delay) await new Promise(resolve => setTimeout(resolve, item.delay));
    await route.fulfill({ status: item.status || 200, contentType: 'application/json', body: JSON.stringify(item.body || success()) }).catch(() => {});
  });
  const prompt = () => page.getByLabel('What should the trainee demonstrate?');
  const title = () => page.getByRole('textbox', { name: 'Milestone title', exact: true });
  const description = () => page.getByRole('textbox', { name: 'Description and criteria', exact: true });
  async function fresh() { await page.goto(url); await prompt().waitFor(); await page.waitForFunction(() => !!window.strobiHarness); }
  async function generate(item = {}, value = '/strobi Explain a report') { queue.push(item); await prompt().fill(value); await page.getByRole('button', { name: 'Generate', exact: true }).click(); }
  async function suggestion() { await page.getByRole('heading', { name: 'Suggested wording' }).waitFor(); }
  // Typing is inert; first result fills empty wording only and never changes pillar/code/saves.
  await fresh(); const start = requests.length; await prompt().fill('/strobi Explain a report'); await page.waitForTimeout(100); assert.equal(requests.length, start);
  queue.push({}); await prompt().press('Control+Enter'); await suggestion();
  assert.equal(await title().inputValue(), proposal.title); assert.equal(await description().inputValue(), proposal.description);
  assert.equal(await page.getByLabel('Pillar', { exact: true }).inputValue(), 'ONBOARDING');
  assert.equal(await page.getByLabel('Milestone code', { exact: true }).inputValue(), 'APP-01');
  assert.equal(await page.getByTestId('saves').textContent(), '0');
  assert.equal(requests.at(-1).prompt, 'Explain a report'); assert.equal(requests.at(-1).planId, 'fixture-plan');
  assert(await page.getByText(/Last reported daily allowance:/).isVisible()); assert(await page.getByText(/\(Manila\)/).isVisible());
  await page.getByRole('button', { name: 'Use Communication Skills', exact: true }).click();
  assert.equal(await page.getByLabel('Pillar', { exact: true }).inputValue(), 'COMMUNICATION');
  assert.equal(await title().inputValue(), proposal.title); assert(await prompt().evaluate(e => e === document.activeElement));
  // Regeneration requires explicit application, even when the previous result was automatic.
  await generate({ body: success({ title: 'New report competency' }) }); await suggestion();
  assert.equal(await title().inputValue(), proposal.title);
  await page.getByRole('button', { name: 'Apply suggestion', exact: true }).click();
  assert.equal(await title().inputValue(), 'New report competency');
  await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
  assert.equal(await page.getByRole('heading', { name: 'Suggested wording' }).count(), 0); assert.equal(await title().inputValue(), 'New report competency');
  // Existing wording is preserved. Explicit wording application does not accept a pillar.
  await fresh(); await title().fill('My title'); await description().fill('My existing verification criteria.');
  await generate(); await suggestion(); assert.equal(await title().inputValue(), 'My title'); assert.equal(await description().inputValue(), 'My existing verification criteria.');
  await page.getByRole('button', { name: 'Apply suggestion', exact: true }).click();
  assert.equal(await title().inputValue(), proposal.title); assert.equal(await page.getByLabel('Pillar', { exact: true }).inputValue(), 'ONBOARDING');
  // Partial empty filling preserves existing title.
  await fresh(); await title().fill('Preserve this title'); await generate(); await suggestion();
  assert.equal(await title().inputValue(), 'Preserve this title'); assert.equal(await description().inputValue(), proposal.description);
  // Edits during pending remain untouched, even if the user erases their edit again.
  await fresh(); await generate({ delay: 300 });
  assert(await page.getByRole('button', { name: 'Generating…', exact: true }).isDisabled());
  await title().fill('Manual work during request'); await title().fill(''); await suggestion();
  assert.equal(await title().inputValue(), ''); assert.equal(await description().inputValue(), ''); assert(await title().evaluate(e => e === document.activeElement));
  await page.getByRole('button', { name: 'Apply suggestion', exact: true }).click(); assert.equal(await title().inputValue(), proposal.title);
  // Cancel and start another request; an old response cannot overwrite the newer result.
  await fresh();
  // Deliberately ignore AbortSignal to prove sequence guards, not just native abort.
  await page.evaluate(() => { const nativeFetch = window.fetch.bind(window); window.fetch = (input, init) => nativeFetch(input, { ...init, signal: undefined }); });
  await generate({ delay: 600, body: success({ title: 'Stale result' }) });
  await page.getByRole('button', { name: 'Cancel generation' }).click(); assert(await prompt().evaluate(e => e === document.activeElement));
  await generate({ body: success({ title: 'Current result' }) }); await suggestion(); await page.waitForTimeout(650);
  assert.equal(await title().inputValue(), 'Current result'); assert.equal(await page.getByText('Stale result', { exact: true }).count(), 0);
  // Editing the prompt cancels the old request without generating on every keystroke.
  await fresh(); await generate({ delay: 250 }); const beforePromptEdit = requests.length;
  await prompt().fill('A revised request'); await page.waitForTimeout(300);
  assert.equal(requests.length, beforePromptEdit); assert.equal(await title().inputValue(), '');
  assert(await page.getByRole('button', { name: 'Generate', exact: true }).isEnabled());
  // Closing/reopening or switching form context discards temporary proposal/prompt and stale output.
  await fresh(); await generate({ delay: 250 }); await page.evaluate(() => window.strobiHarness.setOpen(false));
  await page.getByRole('heading', { name: 'Ask Strobi', exact: true }).waitFor({ state: 'hidden' });
  await page.evaluate(() => window.strobiHarness.setOpen(true)); await page.waitForTimeout(300);
  assert.equal(await prompt().inputValue(), ''); assert.equal(await title().inputValue(), ''); assert.equal(await page.getByRole('heading', { name: 'Suggested wording' }).count(), 0);
  await generate({ delay: 250 }); await page.evaluate(() => window.strobiHarness.setContext('second-form')); await page.waitForTimeout(300);
  assert.equal(await prompt().inputValue(), ''); assert.equal(await title().inputValue(), '');
  // An external pillar change invalidates the in-flight result.
  await generate({ delay: 250 }); await page.evaluate(() => window.strobiHarness.setPillar('TECHNICAL')); await page.waitForTimeout(300);
  assert.equal(await title().inputValue(), '');
  // Error leaves manual creation usable, with no retries until explicitly requested.
  await fresh(); await title().fill('Keep on failure'); const before = requests.length;
  await generate({ status: 429, body: { success: false, code: 'PROVIDER_QUOTA', usage } });
  await page.getByRole('alert').waitFor(); await page.waitForTimeout(100); assert.equal(requests.length, before + 1);
  assert.equal(await title().inputValue(), 'Keep on failure');
  queue.push({}); await page.getByRole('button', { name: 'Try again', exact: true }).click(); await suggestion(); assert.equal(await title().inputValue(), 'Keep on failure');
  await page.getByRole('button', { name: 'Save milestone', exact: true }).click(); assert.equal(await page.getByTestId('saves').textContent(), '1');
  // Invalid input never dispatches; disabled/unconfigured preserve manual entry.
  await fresh(); const invalidBefore = requests.length; await prompt().fill('/strobi'); await page.getByRole('button', { name: 'Generate', exact: true }).click();
  await page.getByRole('alert').waitFor(); assert.equal(requests.length, invalidBefore);
  for (const value of ['disabled', 'unconfigured']) {
    await page.evaluate(value => window.strobiHarness.setAvailability(value), value);
    await page.waitForFunction(() => document.querySelector('textarea').disabled);
    assert(await page.getByRole('button', { name: 'Generate', exact: true }).isDisabled());
    await title().fill('Manual creation works'); assert(await page.getByRole('button', { name: 'Save milestone', exact: true }).isEnabled());
  }
  // Malformed response and pending Escape handling.
  await fresh(); await generate({ body: { success: true, proposal: { title: 'bad' }, usage } }); await page.getByRole('alert').waitFor(); assert.equal(await title().inputValue(), '');
  await fresh(); await generate({ delay: 250 }); await prompt().focus(); await prompt().press('Escape');
  assert(await prompt().evaluate(e => e === document.activeElement)); await page.waitForTimeout(300); assert.equal(await title().inputValue(), '');
  // Real responsive render with longest pillar, long wording and keyboard-visible focus.
  await fresh(); await title().fill('Trainer’s working title'); await generate({ body: success({ suggestedPillar: 'CULTURE', description: 'Demonstrate purposeful collaboration and explain the observed outcomes to the trainer. '.repeat(16).trim() }) }); await suggestion();
  const screenshotDirectory = path.join(os.tmpdir(), 'strobi-ui-evidence'); await fs.mkdir(screenshotDirectory, { recursive: true });
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => { window.scrollTo(0, 0); document.querySelector('[aria-label="Suggested wording preview"]')?.scrollTo(0, 0); });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await page.locator('form').count(), 1);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `overflow at ${width}`);
    for (const label of ['Use Personal Effectiveness & Culture', 'Dismiss']) {
      const bounds = await page.getByRole('button', { name: label, exact: true }).boundingBox();
      assert(bounds && bounds.width >= 44 && bounds.height >= 44 && bounds.x + bounds.width <= width);
    }
    const preview = await page.getByRole('region', { name: 'Suggested wording preview' }).boundingBox(); assert(preview.height <= 256);
    await page.screenshot({ path: path.join(screenshotDirectory, `${width}.png`), fullPage: true });
  }
  await prompt().focus(); await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Generate');
  assert.equal(await page.getByRole('dialog').count(), 0); assert.equal(await page.getByTestId('saves').textContent(), '0');
  assert.deepEqual(errors, []); assert.equal(queue.length, 0);
  console.log('PASS Ask Strobi UI: empty/existing/partial fields, explicit apply/pillar, regeneration, manual edits, cancellation/out-of-order/context guards, errors/retry, disabled/manual flows, keyboard/focus, zero implicit saves, and 320/390/768/1280 layouts.');
  console.log(`Screenshots: ${screenshotDirectory}`);
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); if (directory) await fs.rm(directory, { recursive: true, force: true });
});
