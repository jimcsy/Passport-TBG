// PLAYWRIGHT_MODULE=<playwright path> node --env-file=.env scripts/test_shared_creation_upload_browser.cjs
const assert = require('node:assert/strict');
require('tsx/cjs');
const { prisma } = require('../lib/db/prisma.ts');
const { validateFile } = require('../lib/validations/materials.ts');
const { SignJWT } = require('jose');
const { createClient } = require('@supabase/supabase-js');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const prefix = `TC07-${Date.now()}`;
const origin = process.env.CREATION_UPLOAD_TEST_ORIGIN || 'http://localhost:3100';
let trainer, browser, stage = 'fixtures';
const storage = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
(async () => {
  trainer = await prisma.adminUser.create({ data: { employeeId: prefix, email: `${prefix}@example.invalid`, fullName: 'Create/upload fixture trainer', passwordHash: 'unused' } });
  const canonical = await prisma.milestoneDefinition.create({ data: { code: `${prefix}-STD`, title: 'Protected creation fixture', description: 'Canonical fixture must remain unchanged by duplicate creation.', path: 'ONBOARDING', isStandard: true } });
  const planBefore = await prisma.trainingPlan.findMany({ select: { id: true, status: true, updatedAt: true }, orderBy: { id: 'asc' } });
  const nodeBefore = await prisma.planNode.count(), progressBefore = await prisma.traineeProgress.count();
  const token = await new SignJWT({ id: trainer.id, employeeId: trainer.employeeId, fullName: trainer.fullName, role: 'TRAINER', portal: 'trainer' }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(new TextEncoder().encode(process.env.SESSION_SECRET));
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addCookies([{ name: 'beat_admin_session', value: token, url: origin }]);
  const page = await context.newPage(); page.setDefaultTimeout(20000);
  const errors = []; page.on('pageerror', error => errors.push(error.name));
  await page.goto(`${origin}/trainer/plans/library?q=no-matching-creation-fixture&pillar=ONBOARDING&origin=STANDARD`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Create milestone', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Create milestone', exact: true }).click();
  const form = page.getByRole('form', { name: 'Create shared milestone', exact: true }); await form.waitFor();
  const panel = page.locator('#library-inspector');
  const sessionId = await panel.evaluate(element => { element.dataset.testSession = 'same-inspector'; return element.dataset.testSession; });
  const timeOrigin = await page.evaluate(() => performance.timeOrigin);
  assert.equal(await panel.locator('input[type=file]').count(), 0);
  await form.getByRole('button', { name: 'Save shared milestone' }).click(); await form.getByRole('alert').first().waitFor();
  const fill = async (code, title) => {
    await form.locator('input[name=code]').fill(code);
    await form.locator('input[name=title]').fill(title);
    await form.locator('textarea[name=description]').fill('Demonstrate this competency before requesting verification from the trainer.');
    await form.getByRole('combobox').selectOption('TECHNICAL');
  };
  await fill(canonical.code, 'Metadata retained after conflict');
  await form.getByRole('button', { name: 'Save shared milestone' }).click();
  await form.getByText('This code already exists in the shared library. Choose another code or add the existing milestone.', { exact: true }).waitFor();
  assert.equal(await form.locator('input[name=title]').inputValue(), 'Metadata retained after conflict');
  assert.deepEqual(await prisma.milestoneDefinition.findUniqueOrThrow({ where: { id: canonical.id } }), canonical);
  const code = `${prefix}-NEW`;
  await fill(code, 'Continuous creation fixture');
  let fail = true, release;
  await page.route('**/trainer/plans/library*', async route => {
    if (route.request().method() === 'POST' && (route.request().postData() || '').includes(code)) {
      if (fail) { fail = false; return route.abort(); }
      await new Promise(resolve => { release = resolve; });
    }
    await route.continue();
  });
  await form.getByRole('button', { name: 'Save shared milestone' }).click();
  await form.getByText('Could not save the milestone. Your details are kept; please retry.', { exact: true }).waitFor();
  assert.equal(await prisma.milestoneDefinition.count({ where: { code } }), 0);
  assert.equal(await form.locator('input[name=title]').inputValue(), 'Continuous creation fixture');
  await form.getByRole('button', { name: 'Save shared milestone' }).click();
  await form.getByRole('button', { name: 'Saving…', exact: true }).waitFor();
  assert.ok(await form.locator('input[name=code]').isDisabled());
  assert.equal(await panel.locator('input[type=file]').count(), 0);
  await page.keyboard.press('Escape'); assert.ok(await form.isVisible());
  for (let i = 0; i < 40 && !release; i++) await page.waitForTimeout(50); assert.ok(release); release();
  await panel.getByLabel(`Attach materials to ${code}`).waitFor(); await page.unroute('**/trainer/plans/library*');
  const saved = await prisma.milestoneDefinition.findUniqueOrThrow({ where: { code } });
  assert.ok(saved.id && !saved.id.startsWith('custom-def-')); assert.equal(saved.path, 'TECHNICAL');
  assert.equal(await panel.evaluate(el => el.dataset.testSession), sessionId);
  assert.equal(await panel.locator('#editMilestoneTitle').inputValue(), 'Continuous creation fixture');
  assert.equal(new URL(page.url()).searchParams.get('milestone'), saved.id);
  for (const [key, value] of [['q', 'no-matching-creation-fixture'], ['pillar', 'ONBOARDING'], ['origin', 'STANDARD']]) assert.equal(new URL(page.url()).searchParams.get(key), value);
  await panel.getByText(/It has not been added to a plan draft/).waitFor();
  console.log('PASS: validation, canonical conflicts, failed/pending create, real ID handoff, same inspector, retained metadata/filters and no upload before persistence');

  stage = 'upload failure, cancellation and retry';
  let mode = 'fail', releasePut, attempts = 0;
  await page.route('**/storage/v1/object/upload/sign/**', async route => {
    if (route.request().method() !== 'PUT') return route.continue();
    attempts++;
    if (mode === 'fail') return route.fulfill({ status: 500, body: 'Simulated upload failure' });
    if (mode === 'cancel') { await new Promise(resolve => { releasePut = resolve; }); try { await route.abort(); } catch {} return; }
    return route.continue();
  });
  const file = { name: 'continuous-fixture.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n') };
  const input = panel.getByLabel(`Attach materials to ${code}`);
  await input.setInputFiles(file);
  await panel.getByText('0 files uploaded.', { exact: true }).waitFor({ timeout: 60000 });
  assert.equal(await prisma.courseMaterial.count({ where: { milestoneId: saved.id } }), 0);
  assert.equal((await prisma.milestoneDefinition.findUniqueOrThrow({ where: { id: saved.id } })).id, saved.id);
  mode = 'cancel';
  await input.setInputFiles(file);
  for (let i = 0; i < 200 && !releasePut; i++) await page.waitForTimeout(50); assert.ok(releasePut);
  await panel.getByRole('progressbar').locator('..').getByRole('button', { name: 'Cancel', exact: true }).click(); releasePut();
  await panel.getByText('0 files uploaded.', { exact: true }).waitFor({ timeout: 60000 });
  assert.equal(await prisma.courseMaterial.count({ where: { milestoneId: saved.id } }), 0);
  assert.equal(await prisma.milestoneDefinition.count({ where: { code } }), 1);
  mode = 'pass';
  await input.setInputFiles(file);
  await panel.getByRole('heading', { name: 'Course materials (1)' }).waitFor({ timeout: 60000 });
  assert.equal(await prisma.milestoneDefinition.count({ where: { code } }), 1);
  assert.equal(await prisma.courseMaterial.count({ where: { milestoneId: saved.id } }), 1);
  assert.equal(attempts, 3);
  await panel.getByRole('button', { name: 'Preview / download', exact: true }).click();
  const preview = page.getByRole('dialog', { name: file.name, exact: true }); await preview.waitFor();
  await preview.getByRole('link', { name: 'Open PDF in new tab', exact: true }).waitFor();
  await page.keyboard.press('Escape'); await preview.waitFor({ state: 'detached' });
  assert.ok(await panel.isVisible()); assert.equal(await page.evaluate(() => performance.timeOrigin), timeOrigin);
  assert.equal(await panel.evaluate(el => el.dataset.testSession), sessionId);
  await page.screenshot({ path: '/tmp/tc07-created-materials-desktop.png', fullPage: true });
  console.log('PASS: failed/canceled uploads keep the saved ID; retry uploads once, preview opens without reload, and no duplicate milestone is created');

  stage = 'mobile and zero-material creation';
  await page.keyboard.press('Escape'); await panel.waitFor({ state: 'hidden' });
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.getByRole('button', { name: 'Create milestone', exact: true }).click(); await form.waitFor();
    assert.equal(await panel.evaluate(el => el.matches(':modal')), true);
    assert.equal(await panel.locator('input[type=file]').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: `/tmp/tc07-create-${width}.png` });
    await form.getByRole('button', { name: 'Cancel', exact: true }).click(); await panel.waitFor({ state: 'hidden' });
  }
  await page.getByRole('button', { name: 'Create milestone', exact: true }).click(); await form.waitFor();
  const zeroCode = `${prefix}-ZERO`;
  await fill(zeroCode, 'Valid without materials');
  await form.getByRole('button', { name: 'Save shared milestone' }).click(); await panel.getByLabel(`Attach materials to ${zeroCode}`).waitFor();
  const zero = await prisma.milestoneDefinition.findUniqueOrThrow({ where: { code: zeroCode } });
  await page.keyboard.press('Escape'); await panel.waitFor({ state: 'hidden' });
  assert.equal(await prisma.courseMaterial.count({ where: { milestoneId: zero.id } }), 0);
  assert.equal(await prisma.milestoneDefinition.count({ where: { id: zero.id } }), 1);
  for (const [name, type] of [['x.mp4', 'video/mp4'], ['x.pdf', 'application/pdf'], ['x.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']]) {
    assert.equal(validateFile({ name, type, size: 50 * 1024 * 1024 }).valid, true);
    assert.equal(validateFile({ name, type, size: 50 * 1024 * 1024 + 1 }).valid, false);
  }
  assert.equal(validateFile({ name: 'x.txt', type: 'text/plain', size: 10 }).valid, false);
  assert.deepEqual(await prisma.trainingPlan.findMany({ select: { id: true, status: true, updatedAt: true }, orderBy: { id: 'asc' } }), planBefore);
  assert.equal(await prisma.planNode.count(), nodeBefore); assert.equal(await prisma.traineeProgress.count(), progressBefore);
  assert.deepEqual(errors, []);
  console.log('PASS: native 320/390px creation, cancel before persistence, valid zero-material save, existing format/50 MB validation and no plan/progress mutation');
})().catch(error => { console.error(`Shared creation/upload check failed at ${stage}: ${String(error.message).replace(/(?:postgres(?:ql)?|https?):\/\/\S+/g, '[URL]').slice(0, 1800)}`); process.exitCode = 1; }).finally(async () => {
  await browser?.close();
  const objects = await prisma.courseMaterial.findMany({ where: { milestone: { code: { startsWith: prefix } } }, select: { storagePath: true } });
  if (objects.length) { const result = await storage.storage.from('course-materials').remove(objects.map(obj => obj.storagePath)); if (result.error) { console.error('Temporary file cleanup failed'); process.exitCode = 1; } }
  await prisma.milestoneDefinition.deleteMany({ where: { code: { startsWith: prefix } } });
  if (trainer) await prisma.adminUser.delete({ where: { id: trainer.id } });
  await prisma.$disconnect();
});
