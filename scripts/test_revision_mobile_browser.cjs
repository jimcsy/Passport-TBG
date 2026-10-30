// PLAYWRIGHT_MODULE=/tmp/passport-browser/node_modules/playwright node --env-file=.env scripts/test_revision_mobile_browser.cjs
// Optional REVISION_MOBILE_FOCUS=overlays or REVISION_MOBILE_FROM=profile limits a run. Isolated fixtures are removed.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
require('tsx/cjs');
const { prisma } = require('../lib/db/prisma.ts');
const { SignJWT } = require('jose');
const assert = require('node:assert/strict');
const origin = process.env.RESPONSIVE_TEST_ORIGIN || 'http://localhost:3100';
const widths = [320, 360, 390, 430, 640, 767, 768, 1024, 1440];
let browser, trainer, trainee, plan, libraries = [], stage = 'fixtures';
(async () => {
  const suffix = String(Date.now()).slice(-9);
  trainer = await prisma.adminUser.create({ data: { employeeId: `RESP-${suffix}`, email: `resp-${suffix}@example.invalid`, fullName: 'Responsive Browser Trainer', role: 'TRAINER', passwordHash: 'unused-test-password' } });
  trainee = await prisma.trainee.create({ data: { traineeCode: `RESP-${suffix}`, fullName: 'Responsive Browser Trainee With A Long Display Name', email: `responsive-browser-trainee-${suffix}@example.invalid`, restaurantBrand: 'Responsive Brand', branchLocation: 'Long branch location for responsive layout checks', cohortBatch: 'Responsive browser cohort', jobRole: 'Responsive test role', hireDate: new Date() } });
  plan = await prisma.trainingPlan.create({ data: { title: 'Responsive Browser Training Plan With A Long Title', roleIdentifier: 'RESPONSIVE_TEST', status: 'PUBLISHED', createdById: trainer.id } });
  const published = await prisma.planVersion.create({ data: { planId: plan.id, versionNumber: 1, status: 'PUBLISHED', publishedById: trainer.id } });
  const draft = await prisma.planVersion.create({ data: { planId: plan.id, versionNumber: 2, status: 'DRAFT', publishedById: trainer.id } });
  libraries = await Promise.all(['ONBOARDING', 'ONBOARDING', 'COMMUNICATION', 'TECHNICAL', 'CULTURE', 'LEADERSHIP'].map((path, index) => prisma.milestoneDefinition.create({ data: { code: `R${suffix}-${index}`, title: `ResponsiveMilestone${index}`.repeat(4), description: 'Practice milestone details for responsive testing', path, orderIndex: index + 1, isStandard: false } })));
  await prisma.planNode.createMany({ data: [published, draft].flatMap(version => libraries.map((library, index) => ({ planVersionId: version.id, libraryMilestoneId: library.id, code: library.code, title: library.title, description: library.description, path: library.path, orderIndex: index + 1, posX: 0, posY: index * 200, isCustom: true }))) });
  const nodes = await prisma.planNode.findMany({ where: { planVersionId: published.id }, orderBy: { orderIndex: 'asc' } });
  await prisma.traineePlanAssignment.create({ data: { traineeId: trainee.id, planVersionId: published.id, assignedById: trainer.id } });
  await prisma.traineeProgress.createMany({ data: nodes.map((node, index) => ({ traineeId: trainee.id, planNodeId: node.id, status: [0, 3, 4, 5].includes(index) ? 'READY_FOR_REVIEW' : 'IN_PROGRESS', traineeNote: index === 0 ? 'Responsive review reflection' : null, requestedAt: [0, 3, 4, 5].includes(index) ? new Date() : null })) });
  const { verificationData } = require('../lib/stamps/hash.ts');
  await prisma.traineeProgress.update({ where: { traineeId_planNodeId: { traineeId: trainee.id, planNodeId: nodes[2].id } }, data: verificationData(trainee.id, nodes[2].id, trainer.id, new Date(), 'Responsive award feedback') });
  browser = await chromium.launch({ headless: true });
  async function context(payload, name) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const key = new TextEncoder().encode(process.env.SESSION_SECRET || 'beat-growth-passport-super-secret-key-change-in-production-2024');
    const token = await new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(key);
    await ctx.addCookies([{ name, value: token, url: origin }]);
    return ctx;
  }
  const staff = await context({ id: trainer.id, employeeId: trainer.employeeId, fullName: trainer.fullName, role: 'TRAINER', portal: 'trainer' }, 'beat_admin_session');
  const learner = await context({ id: trainee.id, traineeCode: trainee.traineeCode, fullName: trainee.fullName, portal: 'trainee' }, 'beat_trainee_session');
  async function settle(page) { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
  async function audit(page, route) {
    for (const width of widths) {
      await page.setViewportSize({ width, height: 844 }); await settle(page);
      const result = await page.evaluate(() => {
        const visible = element => { const rect = element.getBoundingClientRect(); return rect.width > 1 && rect.height > 1 && getComputedStyle(element).visibility !== 'hidden' && !element.closest('[inert], [aria-hidden=true]'); };
        const overflow = document.documentElement.scrollWidth - window.innerWidth;
        const small = window.innerWidth < 768 ? Array.from(document.querySelectorAll('button,a,input:not([type=hidden]),select,summary,[role=button]')).filter(element => visible(element) && !element.classList.contains('sr-only')).filter(element => { const rect = element.getBoundingClientRect(); return rect.width < 43.5 || rect.height < 43.5; }).map(element => ({ tag: element.tagName, label: (element.getAttribute('aria-label') || element.textContent || element.getAttribute('placeholder') || '').trim().slice(0, 60), width: Math.round(element.getBoundingClientRect().width), height: Math.round(element.getBoundingClientRect().height) })) : [];
        return { overflow, small };
      });
      assert.ok(result.overflow <= 1, `${route} at ${width}px overflowed by ${result.overflow}px`);
      assert.deepEqual(result.small, [], `${route} at ${width}px has small targets`);
    }
    console.log(`PASS: ${route}, no document overflow across ${widths.join('/')}px and 44px mobile controls`);
  }
  const trainerPage = await staff.newPage();
  const traineePage = await learner.newPage();
  const errors = [];
  trainerPage.on('pageerror', error => errors.push(error.message));
  traineePage.on('pageerror', error => errors.push(error.message));
  if (process.env.REVISION_MOBILE_FOCUS !== 'overlays') for (const route of ['/trainer', '/trainer/plans', '/trainer/trainees', '/trainer/trainees/new', '/trainer/queue', '/trainer/batch', `/trainer/trainees/${trainee.id}`, `/trainer/plans/${plan.id}/builder`].slice(process.env.REVISION_MOBILE_FROM === "profile" ? 6 : 0)) {
    stage = route;
    await trainerPage.goto(origin + route, { waitUntil: 'networkidle' });
    await audit(trainerPage, route);
  }
  if (process.env.REVISION_MOBILE_FOCUS !== 'overlays') for (const route of ['/trainee/dashboard', '/trainee/dashboard/booklet', '/trainee/dashboard/paths/onboarding', '/trainee/dashboard/paths/personal-effectiveness-culture', `/trainee/dashboard/modules/${nodes[1].id}`]) {
    stage = route;
    await traineePage.goto(origin + route, { waitUntil: 'networkidle' });
    await audit(traineePage, route);
  }
  if (process.env.REVISION_MOBILE_FOCUS === 'overlays') {
    await trainerPage.goto(origin + '/trainer', { waitUntil: 'networkidle' });
    await traineePage.goto(origin + '/trainee/dashboard', { waitUntil: 'networkidle' });
  }
  stage = 'notification panels';
  for (const [page, name, region] of [[trainerPage, /^Review notifications/, 'Review notifications'], [traineePage, /^Notifications/, 'Stamp notifications']]) {
    for (const width of widths) {
      await page.setViewportSize({ width, height: 667 });
      const mobilePage = region === 'Stamp notifications' && width < 768;
      await page.getByRole(mobilePage ? 'link' : 'button', { name }).click();
      const panel = page.getByLabel(region, { exact: true });
      await panel.locator('li').first().waitFor();
      assert(await panel.evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${region} content overflows at ${width}px`);
      const bounds = await panel.boundingBox();
      assert(bounds.x >= 0 && bounds.x + bounds.width <= width + 1, `${region} outside ${width}px viewport`);
      if (mobilePage) {
        assert.equal(await page.getByRole('button', { name: 'Close notifications', exact: true }).count(), 0);
        assert(await page.getByRole('navigation', { name: 'Trainee navigation', exact: true }).isVisible());
        await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
        await page.waitForURL('**/trainee/dashboard');
      } else {
        assert(bounds.width <= 320, `${region} should stay compact`);
        assert(bounds.y + bounds.height <= 668, `${region} extends below viewport`);
        await page.keyboard.press('Escape');
      }
    }
  }
  for (const [page, name, region] of [[trainerPage, /^Review notifications/, 'Review notifications'], [traineePage, /^Notifications/, 'Stamp notifications']]) {
    await page.setViewportSize({ width: 844, height: 390 }); await settle(page);
    await page.getByRole('button', { name }).click();
    const panel = page.getByLabel(region, { exact: true });
    const bounds = await panel.boundingBox();
    assert(bounds.y >= 0 && bounds.y + bounds.height <= 391, `${region} does not fit landscape: ${JSON.stringify(bounds)}`);
    await page.keyboard.press('Escape');
  }
  console.log('PASS: trainee mobile notification page and compact desktop/trainer panels fit all widths');
  stage = 'floating actions';
  await trainerPage.goto(origin + '/trainer', { waitUntil: 'networkidle' });
  for (const width of widths) {
    await trainerPage.setViewportSize({ width, height: 667 });
    const fab = trainerPage.getByRole('button', { name: 'Open quick actions', exact: true });
    assert.equal(await fab.isVisible(), width < 768, `FAB visibility at ${width}`);
    if (width < 768) {
      await fab.click();
      const menu = trainerPage.getByRole('navigation', { name: 'Quick actions', exact: true });
      const menuBox = await menu.boundingBox();
      const navBox = await trainerPage.getByRole('navigation', { name: 'Mobile trainer navigation', exact: true }).boundingBox();
      assert(menuBox.x >= 0 && menuBox.y >= 0 && menuBox.y + menuBox.height <= navBox.y);
      await trainerPage.keyboard.press('Escape');
    }
  }
  console.log('PASS: floating add menu is mobile-only, fits small screens and clears bottom navigation');
  stage = 'variant creation modal';
  await trainerPage.goto(origin + '/trainer/plans', { waitUntil: 'networkidle' });
  await trainerPage.getByRole('button', { name: '+ Create Role Variant', exact: true }).click();
  for (const width of [320, 390, 768, 1024]) {
    await trainerPage.setViewportSize({ width, height: 667 }); await settle(trainerPage);
    const panel = trainerPage.getByRole('dialog', { name: '+ Create Role Variant', exact: true }).locator('form');
    await panel.evaluate(async element => { await Promise.all(element.getAnimations().filter(animation => animation.effect.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {}))); });
    const box = await panel.boundingBox();
    assert(box.x >= 0 && box.x + box.width <= width + 1 && box.y >= 0 && box.y + box.height <= 668, `Variant dialog outside ${width}px viewport: ${JSON.stringify(box)}`);
    assert(await panel.evaluate(element => element.scrollWidth <= element.clientWidth + 1));
  }
  await trainerPage.getByRole('dialog', { name: '+ Create Role Variant', exact: true }).getByRole('button', { name: 'Close', exact: true }).click();
  console.log('PASS: variant creation form fits mobile and desktop with internal scrolling');
  stage = 'mobile passport navigation';
  await traineePage.setViewportSize({ width: 320, height: 667 });
  await traineePage.goto(origin + '/trainee/dashboard/booklet', { waitUntil: 'networkidle' });
  await traineePage.getByLabel('Jump to page', { exact: true }).selectOption('3');
  await traineePage.getByRole('group', { name: /^Page 4 of/ }).waitFor();
  await traineePage.getByRole('link', { name: `${libraries[1].title}: incomplete, open module`, exact: true }).click();
  await traineePage.getByRole('heading', { name: 'Module details', exact: true }).waitFor();
  const materials = traineePage.getByRole('region', { name: 'Course materials', exact: true });
  const review = traineePage.getByRole('region', { name: 'Review & feedback', exact: true });
  assert((await materials.boundingBox()).y < (await review.boundingBox()).y);
  await review.getByLabel('Add a reflection for your trainer (optional)', { exact: true }).fill('Mobile layout reflection');
  assert(await review.getByRole('button', { name: 'Submit for review', exact: true }).isEnabled());
  stage = 'short-screen stamp celebration';
  await traineePage.getByRole('link', { name: /^Notifications/ }).click();
  await traineePage.getByRole('button', { name: `Unread: ${libraries[2].title}`, exact: true }).click();
  const celebration = traineePage.getByRole('dialog', { name: 'New stamp earned!', exact: true });
  for (const size of [{width: 320, height: 568}, {width: 844, height: 390}]) {
    await traineePage.setViewportSize(size); await settle(traineePage);
    const box = await celebration.boundingBox();
    assert(box.x >= 0 && box.y >= 0 && box.x + box.width <= size.width + 1 && box.y + box.height <= size.height + 1, 'Celebration must fit short screens');
    await celebration.getByRole('button', { name: 'Continue learning', exact: true }).scrollIntoViewIfNeeded();
    assert(await celebration.getByRole('button', { name: 'Continue learning', exact: true }).isVisible());
  }
  await celebration.getByRole('button', { name: 'Continue learning', exact: true }).click();
  console.log('PASS: Strobi celebration fits small portrait and landscape screens with reachable dismissal');
  stage = 'exempt passport path';
  const leadership = nodes.find(node => node.path === 'LEADERSHIP');
  await prisma.traineeProgress.deleteMany({ where: { traineeId: trainee.id, planNodeId: leadership.id } });
  await prisma.planNode.delete({ where: { id: leadership.id } });
  await traineePage.goto(origin + '/trainee/dashboard/booklet', { waitUntil: 'networkidle' });
  await audit(traineePage, '/trainee/dashboard/booklet with exempt path');
  assert.deepEqual(errors, []);
  console.log('PASS: mobile passport stamp opens module, materials precede usable reflection form; no browser errors');
})().catch(error => { let detail = String(error.message || error.name).replace(/https?:\/\/[^\s]+/g, '[URL redacted]'); for (const key of ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY']) if(process.env[key]) detail = detail.replaceAll(process.env[key], '[redacted]'); console.error(`Responsive check failed at ${stage}: ${detail.slice(0, 2000)}`); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (trainee) await prisma.trainee.delete({ where: { id: trainee.id } });
  if (plan) await prisma.trainingPlan.delete({ where: { id: plan.id } });
  if (libraries.length) await prisma.milestoneDefinition.deleteMany({ where: { id: { in: libraries.map(item => item.id) } } });
  if (trainer) await prisma.adminUser.delete({ where: { id: trainer.id } });
  await prisma.$disconnect();
});
