// PLAYWRIGHT_BROWSERS_PATH=/tmp/passport-registration-browser/browsers PLAYWRIGHT_MODULE=/tmp/passport-registration-browser/node_modules/playwright node --env-file=.env scripts/test_mobile_passport_slider_browser.cjs
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
  await prisma.planNode.createMany({ data: nodes.flatMap(node => [2,3,4].map(order => ({ planVersionId: version.id, path: node.path, code: node.code + '-' + order, title: node.title + ' module ' + order, description: 'Additional milestone for four-stamp page testing', orderIndex: order, posX: 0, posY: 0 }))) });
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
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin + '/trainee/dashboard/booklet', { waitUntil: 'networkidle' });
  const rail = page.getByRole('region', { name: 'Passport pages', exact: true });
  const controls = page.getByRole('navigation', { name: 'Mobile passport controls', exact: true });
  const jump = controls.getByLabel('Jump to page', { exact: true });
  const pathSelector = page.getByLabel('Jump to development path', { exact: true });
  const categories = ['Passport Holder', 'Passport Holder', ...Object.values(STROBI_MASCOT_MAP).flatMap(item => [item.category, item.category])];
  await controls.waitFor();
  assert.equal(await jump.locator('option').count(), 12);
  assert.equal(await page.getByRole('navigation', { name: 'Jump to development path', exact: true }).count(), 0);
  for (const size of [{width: 320, height: 568}, {width: 390, height: 844}, {width: 640, height: 360}, {width: 767, height: 844}]) {
    await page.setViewportSize(size);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const dimensions = await rail.locator('[aria-roledescription="slide"]').evaluateAll(elements => elements.map(element => ({width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height})));
    assert(dimensions.every(box => Math.abs(box.width - dimensions[0].width) <= 1 && Math.abs(box.height - dimensions[0].height) <= 1), 'Every mobile page must have the same size');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert(await page.evaluate(() => document.documentElement.scrollHeight < 2200), 'Passport must not become a vertical stack');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  for (let index = 0; index < 12; index++) {
    await jump.selectOption(String(index));
    try { await rail.getByRole('group', { name: `Page ${index + 1} of 12`, exact: true }).waitFor({timeout: 10000}); }
    catch { throw new Error(`Could not select page ${index + 1}: ${JSON.stringify(await rail.evaluate(element => ({left: element.scrollLeft, width: element.clientWidth, total: element.scrollWidth, slides: Array.from(element.children).map(child => ({width:child.getBoundingClientRect().width,hidden:child.getAttribute('aria-hidden')}))})))}`); }
    await page.waitForFunction(expected => document.querySelector('select[aria-label="Jump to development path"]').selectedOptions[0].textContent === expected, categories[index]);
    assert.equal(await rail.getByRole('group').count(), 1, 'Only the current page should be exposed to assistive technology');
  }
  assert.equal(await pathSelector.locator('option').count(), 6, 'One option per path plus Passport Holder');
  for (const [pathIndex, path] of Object.keys(STROBI_MASCOT_MAP).entries()) {
    await pathSelector.selectOption(path);
    await rail.getByRole('group', { name: `Page ${3 + pathIndex * 2} of 12`, exact: true }).waitFor();
    await controls.getByRole('button', { name: 'Next page', exact: true }).click();
    await rail.getByRole('group', { name: `Page ${4 + pathIndex * 2} of 12`, exact: true }).waitFor();
    assert.equal(await pathSelector.inputValue(), path, 'Path selection must match its stamp page');
  }
  await pathSelector.selectOption('holder');
  await rail.getByRole('group', { name: 'Page 1 of 12', exact: true }).waitFor();
  await jump.selectOption('11');
  await rail.getByRole('group', { name: 'Page 12 of 12', exact: true }).waitFor();
  assert(await controls.getByRole('button', { name: 'Next page', exact: true }).isDisabled());
  await controls.getByRole('button', { name: 'Previous page', exact: true }).click();
  await rail.getByRole('group', { name: 'Page 11 of 12', exact: true }).waitFor();
  await rail.focus(); await page.keyboard.press('Home');
  await rail.getByRole('group', { name: 'Page 1 of 12', exact: true }).waitFor();
  assert(await controls.getByRole('button', { name: 'Previous page', exact: true }).isDisabled());
  console.log('PASS: twelve equal-size pages, no vertical stack/overflow, synchronized path dropdown and direct path jumps, page selector/buttons and keyboard controls across mobile sizes');
  // Exercise native horizontal touch scrolling rather than only button navigation.
  await rail.scrollIntoViewIfNeeded();
  const box = await rail.boundingBox();
  const cdp = await learner.newCDPSession(page);
  const swipe = async forward => {
    const start = box.x + box.width * (forward ? .8 : .2);
    const end = box.x + box.width * (forward ? .2 : .8);
    const y = Math.min(box.y + box.height * .4, 700);
    await cdp.send('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[{x:start,y}]});
    for (let step=1;step<=10;step++) await cdp.send('Input.dispatchTouchEvent', {type:'touchMove',touchPoints:[{x:start+(end-start)*step/10,y}]});
    await cdp.send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]});
  };
  for (const target of [2, 3]) {
    await swipe(true);
    await rail.getByRole('group', { name: `Page ${target} of 12`, exact: true }).waitFor();
    await page.waitForFunction(index => { const element = document.querySelector('[aria-roledescription="carousel"]'); return Math.abs(element.scrollLeft - index * element.clientWidth) < 2; }, target - 1);
  }
  assert.equal(await pathSelector.inputValue(), 'ONBOARDING', 'Swiping into a new path updates the dropdown');
  for (const target of [2, 1]) {
    await swipe(false);
    await rail.getByRole('group', { name: `Page ${target} of 12`, exact: true }).waitFor();
    await page.waitForFunction(index => { const element = document.querySelector('[aria-roledescription="carousel"]'); return Math.abs(element.scrollLeft - index * element.clientWidth) < 2; }, target - 1);
  }
  assert.equal(await pathSelector.inputValue(), 'holder');
  await jump.selectOption('3');
  const stampPage = rail.getByRole('group', { name: 'Page 4 of 12', exact: true });
  await stampPage.waitFor();
  assert.equal(await stampPage.getByRole('link').count(), 4);
  await stampPage.getByRole('link', { name: 'Onboarding celebration test: in review, open module', exact: true }).tap();
  await page.waitForURL('**/modules/' + nodes[0].id);
  await page.goto(origin + '/trainee/dashboard/booklet', { waitUntil: 'networkidle' });
  await jump.selectOption('8');
  await rail.getByRole('group', { name: 'Page 9 of 12', exact: true }).waitFor();
  await page.setViewportSize({ width: 640, height: 360 });
  await rail.getByRole('group', { name: 'Page 9 of 12', exact: true }).waitFor();
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.locator('.passport-spread').waitFor();
  assert.equal(await rail.count(), 0);
  await page.getByRole('navigation', { name: 'Jump to development path', exact: true }).getByRole('button', { name: 'Onboarding', exact: true }).click();
  await page.getByRole('article', { name: 'Page 3', exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS: native touch swipes in both directions, four-stamp pages and module links, mobile rotation preserves page, desktop 3D reader and category pills retained; no browser errors');
})().catch(error => { console.error(error.stack); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (trainee) await prisma.trainee.delete({ where: { id: trainee.id } });
  if (plan) await prisma.trainingPlan.delete({ where: { id: plan.id } });
  if (trainer) await prisma.adminUser.delete({ where: { id: trainer.id } });
  await prisma.$disconnect();
});
