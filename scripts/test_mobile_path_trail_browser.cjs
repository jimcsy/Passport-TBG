// PLAYWRIGHT_BROWSERS_PATH=/tmp/passport-registration-browser/browsers PLAYWRIGHT_MODULE=/tmp/passport-registration-browser/node_modules/playwright node --env-file=.env scripts/test_mobile_path_trail_browser.cjs
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
require('tsx/cjs');
const { prisma } = require('../lib/db/prisma.ts');
const { STROBI_MASCOT_MAP } = require('../lib/constants/mascots.ts');
const { verifyAssignedMilestones } = require('../lib/db/repositories/verification.ts');
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
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, hasTouch: payload.portal === 'trainee' });
    const token = await new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(new TextEncoder().encode(process.env.SESSION_SECRET));
    await ctx.addCookies([{ name, value: token, url: origin }]);
    return ctx;
  }
  const learner = await context({ id: trainee.id, traineeCode: trainee.traineeCode, fullName: trainee.fullName, email: trainee.email, portal: 'trainee' }, 'beat_trainee_session');
  const page = await learner.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(origin + '/trainee/dashboard', { waitUntil: 'networkidle' });
  const navigation = page.getByRole('navigation', { name: 'Development paths', exact: true });
  for (const width of [320, 390, 640, 767]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await navigation.locator('[data-path-circle]').count(), 5);
    for (const [index, [path, mascot]] of Object.entries(Object.entries(STROBI_MASCOT_MAP))) {
      const circle = navigation.locator(`[data-path-circle="${path}"]`);
      await circle.locator('img').evaluate(img => img.decode());
      assert.equal(await circle.locator('img').getAttribute('alt'), mascot.variantTitle);
      assert.equal(await circle.locator('img').evaluate(image => getComputedStyle(image).mixBlendMode), 'multiply');
      assert(await circle.locator('img').evaluate(image => parseFloat(getComputedStyle(image).borderRadius) >= image.clientWidth / 2), 'Image corners must be clipped inside the circle');
      const bounds = await circle.boundingBox();
      assert(Math.abs(bounds.width - bounds.height) <= 1, 'Mascot container must be a circle');
      if (Number(index) > 0) {
        const rowHeight = await circle.evaluate(element => element.closest('li').getBoundingClientRect().height);
        assert(rowHeight >= 230 && rowHeight <= 290, `Trail rows must remain compact at ${width}px: ${rowHeight}px`);
      }
      const navBounds = await navigation.boundingBox();
      const midpoint = navBounds.x + navBounds.width / 2;
      assert(Number(index) % 2 ? bounds.x + bounds.width / 2 > midpoint : bounds.x + bounds.width / 2 < midpoint, 'Circle centers must alternate along the narrow trail');
      await circle.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.waitForFunction(path => document.querySelector(`[data-path-circle="${path}"]`)?.closest('a')?.getAttribute('data-active') === 'true', path);
      assert.equal(await navigation.locator('a[data-active="true"]').count(), 1);
      const revealed = await navigation.locator('[data-path-reveal]').evaluateAll(elements => elements.filter(element => Number(getComputedStyle(element).opacity) > 0.99).length);
      assert.equal(revealed, 1, 'Only one development path should be revealed');
      await page.getByRole('complementary', { name: 'Strobi learning guide' }).getByRole('heading', { name: mascot.variantTitle, exact: true }).waitFor();
      const guideBox = await page.locator('[data-path-guide]').boundingBox();
      const titleBox = await page.getByRole('heading', { name: 'Development paths', exact: true }).boundingBox();
      assert(titleBox.y >= guideBox.y && titleBox.y + titleBox.height <= guideBox.y + guideBox.height, 'Development paths title must stay inside the pinned guide');
      assert(guideBox.y >= -1 && guideBox.y + guideBox.height < 780, `Guide must remain visible at ${width}px`);
      if (Number(index) > 0) assert(Math.abs(guideBox.y) <= 2, `Guide must stay pinned while scrolling paths at ${width}px: ${guideBox.y}`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    const first = navigation.locator('[data-path-circle="ONBOARDING"]');
    await first.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForFunction(() => document.querySelector('[data-path-circle="ONBOARDING"]')?.closest('a')?.getAttribute('data-active') === 'true');
    console.log(`PASS: ${width}px alternating mascot circles, image loading, scroll highlighting down/up, synchronized guide, no overflow`);
  }
  for (const width of [768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await navigation.locator('[data-path-circle]').count(), 0);
    assert.equal(await navigation.getByRole('link').count(), 5);
    assert.equal(await navigation.getByRole('link').first().locator('img').getAttribute('width'), '24');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const mascot of Object.values(STROBI_MASCOT_MAP)) {
    const link = navigation.getByRole('link', { name: `Open ${mascot.category}`, exact: true });
    await link.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.waitForFunction(title => Array.from(document.querySelectorAll('nav[aria-label="Development paths"] a')).some(element => element.getAttribute('aria-label') === `Open ${title}` && element.getAttribute('data-active') === 'true'), mascot.category);
    await link.tap();
    await page.getByRole('heading', { name: mascot.category, level: 1, exact: true }).waitFor();
    await page.getByRole('link', { name: 'Back to dashboard', exact: true }).tap();
    await page.getByRole('heading', { name: 'Learning overview', exact: true }).waitFor();
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await navigation.getByRole('link').nth(2).focus();
  assert.equal(await navigation.getByRole('link').nth(2).getAttribute('data-active'), 'true');
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('[data-path-reveal="TECHNICAL"]')).opacity) === 1);
  assert.equal(await navigation.locator('[data-path-reveal="TECHNICAL"]').evaluate(element => getComputedStyle(element).transitionDuration), '0.5s');
  await page.getByRole('heading', { name: 'Continue learning', exact: true }).evaluate(element => element.scrollIntoView({block: 'start', behavior: 'instant'}));
  const released = await page.locator('[data-path-guide]').boundingBox();
  assert(released.y + released.height <= 1, 'Guide must release after leaving the development paths');
  assert.deepEqual(errors, []);
  await page.setViewportSize({ width: 390, height: 844 });
  await navigation.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/tmp/passport-mobile-path-focus.png' });
  console.log('PASS: desktop cards retained, live breakpoint switching, five touch destinations, keyboard focus and reduced-motion behavior; no browser errors');
})().catch(error => { console.error(error.stack); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (trainee) await prisma.trainee.delete({ where: { id: trainee.id } });
  if (plan) await prisma.trainingPlan.delete({ where: { id: plan.id } });
  if (trainer) await prisma.adminUser.delete({ where: { id: trainer.id } });
  await prisma.$disconnect();
});
