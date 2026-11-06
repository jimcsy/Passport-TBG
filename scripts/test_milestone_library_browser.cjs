// PLAYWRIGHT_MODULE=/tmp/passport-revoke-browser/node_modules/playwright node --env-file=.env scripts/test_milestone_library_browser.cjs
const assert = require('node:assert/strict');
require('tsx/cjs');
const { prisma } = require('../lib/db/prisma.ts');
const { SignJWT } = require('jose');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const prefix = `TC05-${Date.now()}`;
const origin = process.env.LIBRARY_TEST_ORIGIN || 'http://localhost:3100';
let trainer, browser, stage = 'fixtures';
const plans = [];
(async () => {
  trainer = await prisma.adminUser.create({ data: { employeeId: prefix, email: `${prefix}@example.invalid`, fullName: 'Library browser fixture', passwordHash: 'unused' } });
  const definitions = [];
  for (let i = 0; i < 18; i++) definitions.push(await prisma.milestoneDefinition.create({ data: {
    code: `${prefix}-${i}`, title: i === 0 ? `${prefix} ${'LongUnbrokenTitle'.repeat(7)}` : `${prefix} competency ${String(i).padStart(2, '0')}`,
    description: 'Shared competency fixture. '.repeat(12), path: 'TECHNICAL', isStandard: false, orderIndex: i,
  } }));
  const standard = await prisma.milestoneDefinition.create({ data: { code: `${prefix}-STD`, title: `${prefix} standard onboarding`, description: 'Canonical browser fixture', path: 'ONBOARDING', isStandard: true } });
  const target = definitions[12];
  for (let i = 0; i < 2; i++) await prisma.courseMaterial.create({ data: { milestoneId: target.id, fileName: `fixture${i}.pdf`, fileType: 'PDF', mimeType: 'application/pdf', fileSizeBytes: 10, storagePath: `${prefix}/not-a-real-storage-object-${i}`, uploadedById: trainer.id } });
  const plan = await prisma.trainingPlan.create({ data: { title: `${prefix} reusable track`, roleIdentifier: prefix, createdById: trainer.id, status: 'DRAFT' } }); plans.push(plan.id);
  await prisma.learningPath.create({ data: { planId: plan.id, title: plan.title, type: 'VARIANT' } });
  const draft = await prisma.planVersion.create({ data: { planId: plan.id, versionNumber: 1, publishedById: trainer.id, status: 'DRAFT' } });
  for (let i = 0; i < 2; i++) await prisma.planNode.create({ data: { planVersionId: draft.id, libraryMilestoneId: target.id, code: target.code, title: target.title, description: target.description, path: 'TECHNICAL', orderIndex: i, posX: 0, posY: 0, isCustom: true } });
  const before = await prisma.milestoneDefinition.findMany({ where: { code: { startsWith: prefix } }, orderBy: { code: 'asc' } });
  const token = await new SignJWT({ id: trainer.id, fullName: trainer.fullName, employeeId: trainer.employeeId, role: 'TRAINER', portal: 'trainer' }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(new TextEncoder().encode(process.env.SESSION_SECRET));
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addCookies([{ name: 'beat_admin_session', value: token, url: origin }]);
  const page = await context.newPage(); page.setDefaultTimeout(20000);
  const errors = []; page.on('pageerror', error => errors.push(error.name));
  // Isolate fault injection from independent notification actions on this route.
  const built = require('node:fs').readFileSync(`${process.env.PASSPORT_BUILD_DIR || '.next-mobile-check'}/server/app/trainer/plans/library/page.js`, 'utf8');
  const libraryAction = built.match(/"([a-f0-9]{40})":\(\)=>[^"]{0,220}\.listMilestoneLibraryAction\)/)?.[1];
  await page.goto(`${origin}/trainer/plans/library?q=${prefix}&pillar=TECHNICAL&origin=CUSTOM`, { waitUntil: 'networkidle' });
  const list = page.getByRole('list', { name: 'Shared milestones', exact: true });
  await list.waitFor(); assert.equal(await list.getByRole('listitem').count(), 18);
  const button = code => page.getByRole('button').filter({ hasText: code }).first();
  stage = 'real counts and keyboard selection';
  const targetButton = button(target.code);
  const targetRow = list.getByRole('listitem').filter({ has: targetButton });
  assert.ok(await targetRow.getByText('2', { exact: true }).isVisible()); assert.ok(await targetRow.getByText('1', { exact: true }).isVisible());
  await targetButton.scrollIntoViewIfNeeded(); await targetButton.focus();
  const scroll = await page.evaluate(() => scrollY);
  await page.keyboard.press('Enter');
  await page.getByRole('heading', { name: target.title, exact: true }).waitFor();
  assert.equal(new URL(page.url()).searchParams.get('milestone'), target.id);
  assert.equal(await targetButton.getAttribute('aria-pressed'), 'true');
  assert.ok(await page.getByText('2 attached materials', { exact: true }).isVisible());
  assert.ok(await page.getByText('1 current reusable plan', { exact: true }).isVisible());
  await page.getByRole('button', { name: 'Close milestone details' }).click();
  assert.equal(await targetButton.evaluate(el => el === document.activeElement), true);
  assert.ok(Math.abs(await page.evaluate(() => scrollY) - scroll) < 4);
  assert.equal(new URL(page.url()).searchParams.get('pillar'), 'TECHNICAL');
  await page.goBack(); await page.getByRole('heading', { name: target.title, exact: true }).waitFor();
  await page.goBack(); await page.getByRole('heading', { name: target.title, exact: true }).waitFor({ state: 'detached' });
  assert.equal(await targetButton.evaluate(el => el === document.activeElement), true);
  await page.goForward(); await page.getByRole('heading', { name: target.title, exact: true }).waitFor();
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: target.title, exact: true }).waitFor();
  console.log('PASS: direct URL selection/filters, actual material and deduplicated plan counts, keyboard selection, Back/Forward, reload, focus and scroll restoration');

  stage = 'filters and no results';
  await page.getByRole('button', { name: 'Close milestone details' }).click();
  const search = page.getByRole('searchbox', { name: 'Search milestone code or title' });
  await search.fill(`${prefix} standard onboarding`);
  await page.getByRole('combobox', { name: 'Filter by pillar' }).selectOption('ONBOARDING');
  await page.getByRole('combobox', { name: 'Filter by origin' }).selectOption('STANDARD');
  await button(standard.code).waitFor(); assert.equal(await list.getByRole('listitem').count(), 1);
  await search.fill('no-such-milestone-fixture'); await page.getByRole('heading', { name: 'No matching milestones' }).waitFor();
  await page.getByRole('button', { name: 'Clear filters' }).click(); await list.waitFor();
  assert.equal(new URL(page.url()).search, '');
  // A filter can hide the selected row while its desktop details remain open.
  await button(target.code).click();
  await search.fill('no-such-selected-row');
  await page.getByRole('button', { name: 'Close milestone details' }).click();
  assert.equal(await search.evaluate(el => el === document.activeElement), true);
  await page.getByRole('button', { name: 'Clear filters' }).click();
  console.log('PASS: code/title search, pillar/origin filters, BEAT/custom labels, no-results, clear-filter recovery and focus fallback for a filtered-out selection');

  stage = 'responsive selection';
  await search.fill(prefix);
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `list overflow at ${width}`);
    const long = button(definitions[0].code);
    await long.scrollIntoViewIfNeeded(); await long.click();
    await page.getByRole('heading', { name: definitions[0].title, exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `selection overflow at ${width}`);
    if (width < 1024) {
      const dialog = page.getByRole('dialog', { name: definitions[0].title, exact: true }); await dialog.waitFor();
      const bounds = await dialog.boundingBox(); assert.equal(bounds.x, 0); assert.equal(bounds.width, width); assert.equal(bounds.height, 900);
      await dialog.getByRole('button', { name: 'Close milestone details' }).focus(); await page.keyboard.press('Shift+Tab');
      assert.equal(await dialog.evaluate(el => el.contains(document.activeElement)), true);
    }
    assert.ok((await long.boundingBox()).height >= 44);
    if (width === 390 || width === 1440) await page.screenshot({ path: `/tmp/tc05-library-selected-${width}.png`, fullPage: width === 1440 });
    await page.keyboard.press('Escape');
    await page.getByRole('heading', { name: definitions[0].title, exact: true }).waitFor({ state: 'detached' });
    assert.equal(await long.evaluate(el => el === document.activeElement), true);
    assert.equal(new URL(page.url()).searchParams.get('q'), prefix);
  }
  await page.screenshot({ path: '/tmp/tc05-library-desktop.png', fullPage: true });
  console.log('PASS: compact rows and long content at 320–1440px, full-screen mobile inspector, focus trap, Escape and filter retention');

  stage = 'loading, failure and retry';
  assert.ok(libraryAction, 'Captured the library read action, independently of notification polling');
  let release;
  await page.route('**/trainer/plans/library*', async route => {
    if (route.request().method() === 'POST' && route.request().headers()['next-action'] === libraryAction) {
      await new Promise(resolve => { release = resolve; }); await route.abort();
    } else await route.continue();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByText('Loading milestone library…', { exact: true }).waitFor();
  for (let i = 0; i < 40 && !release; i++) await page.waitForTimeout(50);
  assert.ok(release); release();
  await page.getByRole('button', { name: 'Retry loading library' }).waitFor();
  await page.unroute('**/trainer/plans/library*');
  await page.getByRole('button', { name: 'Retry loading library' }).click(); await list.waitFor();
  assert.equal(await search.inputValue(), prefix);
  console.log('PASS: loading feedback, transport failure and retry preserve URL filters');

  stage = 'empty library';
  await page.route('**/trainer/plans/library*', async route => {
    if (route.request().method() !== 'POST' || route.request().headers()['next-action'] !== libraryAction) return route.continue();
    const response = await route.fetch();
    let replaced = false;
    const body = (await response.text()).split('\n').map(line => {
      const index = line.indexOf(':'); if (index < 0) return line;
      try { const value = JSON.parse(line.slice(index + 1)); if (value && value.success === true && Array.isArray(value.data)) { value.data = []; replaced = true; return line.slice(0, index + 1) + JSON.stringify(value); } } catch {}
      return line;
    }).join('\n');
    assert.ok(replaced, 'Expected actual server-action success envelope');
    await route.fulfill({ response, body });
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'No milestones in the library' }).waitFor();
  await page.unroute('**/trainer/plans/library*');
  await page.goto(`${origin}/trainer/plans/library?milestone=missing-fixture&q=${prefix}`, { waitUntil: 'networkidle' });
  await page.getByText('This milestone is no longer available in the shared library.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Clear selection' }).click();
  assert.equal(new URL(page.url()).searchParams.get('q'), prefix);
  assert.deepEqual(await prisma.milestoneDefinition.findMany({ where: { code: { startsWith: prefix } }, orderBy: { code: 'asc' } }), before);
  assert.equal(await prisma.planVersion.count({ where: { planId: plan.id } }), 1);
  assert.equal(await prisma.planNode.count({ where: { planVersion: { planId: plan.id } } }), 2);
  assert.deepEqual(errors, []);
  console.log('PASS: genuine empty-response UI, stale selection recovery, no browser errors and no content mutation');
})().catch(error => { console.error(`Library browser check failed at ${stage}: ${String(error.message).replace(/(?:postgres(?:ql)?|https?):\/\/\S+/g, '[URL]').slice(0, 1600)}`); process.exitCode = 1; }).finally(async () => {
  await browser?.close();
  await prisma.trainingPlan.deleteMany({ where: { id: { in: plans } } });
  await prisma.milestoneDefinition.deleteMany({ where: { code: { startsWith: prefix } } });
  if (trainer) await prisma.adminUser.delete({ where: { id: trainer.id } });
  await prisma.$disconnect();
});
