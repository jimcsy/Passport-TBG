// PLAYWRIGHT_BROWSERS_PATH=/tmp/passport-registration-browser/browsers PLAYWRIGHT_MODULE=/tmp/passport-registration-browser/node_modules/playwright node --env-file=.env scripts/test_strobi_browser.cjs
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
require('tsx/cjs');
const { prisma } = require('../lib/db/prisma.ts');
const { STROBI_MASCOT_MAP } = require('../lib/constants/mascots.ts');
const { SignJWT } = require('jose');
const assert = require('node:assert/strict');
const origin = process.env.STROBI_TEST_ORIGIN || 'http://localhost:3100';
let browser, trainer, trainee, plan;
(async () => {
  const suffix = String(Date.now());
  trainer = await prisma.adminUser.create({ data: { employeeId: `STROBI-${suffix}`, email: `strobi-${suffix}@example.invalid`, fullName: 'Strobi Test Trainer', passwordHash: 'unused-test-password' } });
  plan = await prisma.trainingPlan.create({ data: { title: 'Strobi browser fixture', roleIdentifier: 'STROBI_TEST', status: 'PUBLISHED', createdById: trainer.id } });
  const version = await prisma.planVersion.create({ data: { planId: plan.id, versionNumber: 1, status: 'PUBLISHED', publishedById: trainer.id } });
  const nodes = [];
  for (const [path, mascot] of Object.entries(STROBI_MASCOT_MAP)) {
    nodes.push(await prisma.planNode.create({ data: { planVersionId: version.id, path, code: `STROBI-${suffix}-${path}`, title: `${mascot.category} celebration test`, description: 'Isolated Strobi browser check', orderIndex: 1, posX: 0, posY: 0 } }));
  }
  trainee = await prisma.trainee.create({ data: { traineeCode: `STROBI-${suffix}`, fullName: 'Strobi Test Trainee', email: `strobit-${suffix}@example.invalid`, restaurantBrand: 'Test', branchLocation: 'Test', cohortBatch: 'Test', hireDate: new Date() } });
  await prisma.traineePlanAssignment.create({ data: { traineeId: trainee.id, planVersionId: version.id, assignedById: trainer.id } });
  await prisma.traineeProgress.createMany({ data: nodes.map(node => ({ traineeId: trainee.id, planNodeId: node.id, status: 'READY_FOR_REVIEW', traineeNote: 'Strobi integration test', requestedAt: new Date() })) });
  browser = await chromium.launch({ headless: true });
  async function context(payload, name) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const token = await new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(new TextEncoder().encode(process.env.SESSION_SECRET));
    await ctx.addCookies([{ name, value: token, url: origin }]);
    return ctx;
  }
  const learner = await context({ id: trainee.id, traineeCode: trainee.traineeCode, fullName: trainee.fullName, email: trainee.email, portal: 'trainee' }, 'beat_trainee_session');
  const page = await learner.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install();
  await page.goto(origin + '/trainee/dashboard', { waitUntil: 'networkidle' });
  for (const [path, mascot] of Object.entries(STROBI_MASCOT_MAP)) {
    const tab = page.getByRole('link', { name: `Open ${mascot.category}`, exact: true });
    await tab.focus();
    const image = tab.locator('img');
    assert.equal(await image.getAttribute('width'), '24');
    assert.equal(await image.getAttribute('height'), '24');
    await image.evaluate(img => img.decode());
    const banner = page.getByRole('complementary', { name: 'Strobi learning guide' });
    await banner.getByRole('heading', { name: mascot.variantTitle }).waitFor();
    assert.equal(await banner.getByRole('img').getAttribute('alt'), mascot.variantTitle);
    await banner.getByRole('img').evaluate(img => img.decode());
    await banner.getByRole('button', { name: mascot.quote, exact: true }).click();
    await banner.getByRole('button', { name: 'Show Strobi’s tip', exact: true }).click();
    await banner.getByText(mascot.quote, { exact: true }).waitFor();
    await tab.click();
    await page.getByRole('heading', { name: mascot.category, exact: true, level: 1 }).waitFor();
    await page.getByRole('region', { name: `${mascot.category} modules`, exact: true }).getByRole('heading', { name: `${mascot.category} celebration test`, exact: true }).waitFor();
    assert.equal(await page.locator('article').count(), 1);
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: mascot.category, exact: true, level: 1 }).waitFor();
    await page.getByRole('link', { name: 'Back to dashboard', exact: true }).click();
  }
  const pathsSection = page.getByRole('heading', { name: 'Development paths', exact: true }).locator('..').locator('..');
  const order = await pathsSection.evaluate(section => {
    const heading = section.querySelector('h2');
    const banner = section.querySelector('aside');
    const categories = section.querySelector('nav');
    return !!(heading.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING) && !!(banner.compareDocumentPosition(categories) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  assert(order, 'Development paths heading, Strobi, category cards must appear in that order');
  await page.getByRole('link', { name: 'Open Onboarding', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('heading', { name: 'Onboarding', exact: true, level: 1 }).waitFor();
  await page.getByRole('link', { name: 'Back to dashboard', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  console.log('PASS: five dashboard avatars load, category-specific guide/quotes, speech toggle, category-page navigation/reload, heading-banner-cards order, keyboard navigation, mobile layout');
  await page.goto(origin + '/trainee/dashboard/booklet', { waitUntil: 'networkidle' });
  for (const mascot of Object.values(STROBI_MASCOT_MAP)) {
    const pill = page.getByRole('button', { name: mascot.category, exact: true });
    await pill.click();
    assert.equal(await pill.locator('img').count(), 0);
  }
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  console.log('PASS: five passport navigation pills are text-only and mobile passport fits viewport');
  await page.goto(origin + '/trainee/dashboard', { waitUntil: 'networkidle' });
  const staff = await context({ id: trainer.id, employeeId: trainer.employeeId, fullName: trainer.fullName, role: 'TRAINER', portal: 'trainer' }, 'beat_admin_session');
  const admin = await staff.newPage();
  await admin.goto(origin + '/trainer/queue', { waitUntil: 'networkidle' });
  async function approve(node) {
    const toggle = admin.getByRole('button', { name: new RegExp(node.code + ':') });
    await toggle.click();
    await toggle.locator('..').getByRole('button', { name: '1-Click Verify & Stamp', exact: true }).click();
    await admin.getByText('Stamped & Verified!', { exact: true }).waitFor();
    assert.equal((await prisma.traineeProgress.findUniqueOrThrow({ where: { traineeId_planNodeId: { traineeId: trainee.id, planNodeId: node.id } } })).status, 'VERIFIED');
    // Reload removes the transient success card before the next approval.
    await admin.reload({ waitUntil: 'networkidle' });
  }
  await approve(nodes[0]);
  await page.bringToFront();
  await page.clock.fastForward(30001);
  await page.getByRole('button', { name: 'Notifications, 1 unread', exact: true }).click();
  await page.getByRole('button', { name: 'Unread: Onboarding celebration test', exact: true }).click();
  let dialog = page.getByRole('dialog', { name: 'New stamp earned!', exact: true });
  await dialog.waitFor({ timeout: 45000 });
  await dialog.getByText(STROBI_MASCOT_MAP.ONBOARDING.variantTitle, { exact: true }).waitFor();
  assert.equal(await dialog.locator('canvas').count(), 1);
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'Continue learning');
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached' });
  console.log('PASS: actual trainer approval → polling → matching modal/confetti; focus and Escape dismissal');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await admin.bringToFront();
  for (const node of nodes.slice(1)) await approve(node);
  await page.bringToFront();
  await page.clock.fastForward(30001);
  for (const node of nodes.slice(1)) {
    await page.getByRole('button', { name: /^Notifications/ }).click();
    await page.getByRole('button', { name: `Unread: ${node.title}`, exact: true }).click();
    dialog = page.getByRole('dialog', { name: 'New stamp earned!', exact: true });
    await dialog.getByText(node.title, { exact: true }).waitFor({ timeout: 45000 });
    await dialog.getByText(STROBI_MASCOT_MAP[node.path].variantTitle, { exact: true }).waitFor();
    assert.equal(await dialog.locator('canvas').count(), 0);
    const box = await dialog.boundingBox();
    assert(box.x >= 0 && box.y >= 0 && box.x + box.width <= 391 && box.y + box.height <= 845);
    await dialog.getByRole('button', { name: 'Continue learning', exact: true }).click();
  }
  await dialog.waitFor({ state: 'detached' });
  await page.clock.fastForward(30001);
  await page.waitForLoadState('networkidle');
  assert.equal(await page.getByRole('dialog').count(), 0);
  assert.deepEqual(errors, []);
  console.log('PASS: four unread notifications open matching celebrations, reduced motion disables confetti, mobile dialogs fit, dismissed awards stay dismissed; no browser errors');
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (trainee) await prisma.trainee.delete({ where: { id: trainee.id } });
  if (plan) await prisma.trainingPlan.delete({ where: { id: plan.id } });
  if (trainer) await prisma.adminUser.delete({ where: { id: trainer.id } });
  await prisma.$disconnect();
});
