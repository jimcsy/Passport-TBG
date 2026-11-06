// PLAYWRIGHT_MODULE=/tmp/passport-revoke-browser/node_modules/playwright node --env-file=.env scripts/test_training_content_navigation.cjs
const assert = require('node:assert/strict');
require('tsx/cjs');
const { prisma } = require('../lib/db/prisma.ts');
const { SignJWT } = require('jose');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.CONTENT_TEST_ORIGIN || 'http://localhost:3100';
let browser;
const snapshot = async () => ({
  plans: await prisma.trainingPlan.findMany({ select: { id: true, updatedAt: true, status: true }, orderBy: { id: 'asc' } }),
  versions: await prisma.planVersion.findMany({ select: { id: true, status: true, versionNumber: true }, orderBy: { id: 'asc' } }),
  milestones: await prisma.milestoneDefinition.findMany({ select: { id: true, updatedAt: true }, orderBy: { id: 'asc' } }),
  nodes: await prisma.planNode.count(), assignments: await prisma.traineePlanAssignment.count(), progress: await prisma.traineeProgress.count(),
});
(async () => {
  const admin = await prisma.adminUser.findFirstOrThrow({ where: { role: { in: ['TRAINER', 'ADMIN', 'SUPER_ADMIN'] } } });
  const before = await snapshot();
  const token = await new SignJWT({ id: admin.id, fullName: admin.fullName, employeeId: admin.employeeId, role: admin.role, portal: 'trainer' }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(new TextEncoder().encode(process.env.SESSION_SECRET));
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const anonymous = await context.newPage();
  await anonymous.goto(`${origin}/trainer/plans/library`); assert.ok(anonymous.url().includes('/trainer/login')); await anonymous.close();
  await context.addCookies([{ name: 'beat_admin_session', value: token, url: origin }]);
  const page = await context.newPage(); page.setDefaultTimeout(20000);
  const errors = []; page.on('pageerror', e => errors.push(e.name));
  const tabs = page.getByRole('navigation', { name: 'Training content', exact: true });
  await page.goto(`${origin}/trainer/plans`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Training Content', exact: true }).waitFor();
  assert.equal(await tabs.getByRole('link', { name: 'Training Plans', exact: true }).getAttribute('aria-current'), 'page');
  const desktop = page.getByRole('navigation', { name: 'Trainer navigation', exact: true });
  assert.equal(await desktop.getByRole('link').count(), 4);
  assert.ok(await desktop.getByRole('link', { name: 'Training Content', exact: true }).isVisible());
  await page.screenshot({ path: '/tmp/tc03-plans-desktop.png', fullPage: true });
  await tabs.getByRole('link', { name: 'Training Plans', exact: true }).focus();
  await page.keyboard.press('Tab');
  assert.equal(await tabs.getByRole('link', { name: 'Milestone Library', exact: true }).evaluate(el => el === document.activeElement), true);
  const outline = await tabs.getByRole('link', { name: 'Milestone Library', exact: true }).evaluate(el => getComputedStyle(el).outlineStyle);
  assert.notEqual(outline, 'none');
  await page.keyboard.press('Enter'); await page.waitForURL('**/trainer/plans/library');
  assert.equal(await tabs.getByRole('link', { name: 'Milestone Library', exact: true }).getAttribute('aria-current'), 'page');
  assert.equal(await desktop.getByRole('link', { name: 'Training Content', exact: true }).getAttribute('aria-current'), 'location');
  await page.reload({ waitUntil: 'networkidle' });
  assert.ok(await page.getByRole('heading', { name: 'Milestone Library', exact: true }).isVisible());
  await page.goBack({ waitUntil: 'networkidle' }); assert.equal(new URL(page.url()).pathname, '/trainer/plans');
  console.log('PASS: direct routes, desktop navigation, active tabs, keyboard focus/Enter and browser Back');
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${origin}/trainer/plans/library`, { waitUntil: 'networkidle' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    for (const link of await tabs.getByRole('link').all()) { assert.ok(await link.isVisible()); assert.ok((await link.boundingBox()).height >= 44); }
    if (width < 768) {
      const mobile = page.getByRole('navigation', { name: 'Mobile trainer navigation', exact: true });
      assert.equal(await mobile.getByRole('link').count(), 4);
      assert.ok(await mobile.getByRole('link', { name: 'Training Content', exact: true }).isVisible());
      assert.equal(await mobile.getByRole('link', { name: 'Training Content', exact: true }).getAttribute('aria-current'), 'page');
      await page.getByRole('button', { name: 'Open quick actions' }).click();
      assert.equal(await page.getByRole('link', { name: 'New Course', exact: true }).count(), 0);
      await page.getByRole('link', { name: 'Create role variant', exact: true }).click();
      await page.locator('#create-role-variant').waitFor();
      await page.getByRole('heading', { name: 'Training Content', exact: true }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      if (width === 390) await page.screenshot({ path: '/tmp/tc03-create-mobile.png', fullPage: true });
    }
  }
  await page.goto(`${origin}/trainer/plans/library`, { waitUntil: 'networkidle' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '/tmp/tc03-library-mobile.png', fullPage: true });
  await page.goto(`${origin}/trainer/plans?create=1`, { waitUntil: 'networkidle' });
  assert.ok(await page.locator('#create-role-variant').isVisible());
  await page.goto(`${origin}/trainer/plans/plan-tbg-corporate-foundation-l1/builder`, { waitUntil: 'networkidle' });
  // Published master opens read-only; navigation must not create a draft.
  await page.getByRole('link', { name: 'Back to training plans', exact: true }).waitFor();
  assert.equal(await page.getByRole('navigation', { name: 'Training content', exact: true }).count(), 0);
  console.log('PASS: mobile/tablet tabs, 44px targets, no horizontal overflow, renamed shortcut, create entry and existing builder URL');
  assert.deepEqual(await snapshot(), before);
  assert.deepEqual(errors, []);
  console.log('PASS: anonymous library access is protected; URL navigation performs no content, version, assignment, progress or stamp mutation; no browser errors');
})().catch(error => { console.error(`Training content navigation check failed: ${String(error.message).replace(/(?:postgres(?:ql)?|https?):\/\/\S+/g, '[URL]').slice(0, 1800)}`); process.exitCode = 1; }).finally(async () => { await browser?.close(); await prisma.$disconnect(); });
