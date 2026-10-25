// PLAYWRIGHT_MODULE=/tmp/passport-browser/node_modules/playwright node --env-file=.env scripts/test_responsive_browser.cjs
// Optional RESPONSIVE_PHASE=trainer|builder|trainee limits a run. Isolated fixtures are removed.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
require('tsx/cjs');
const { prisma } = require('../lib/db/prisma.ts');
const { SignJWT } = require('jose');
const assert = require('node:assert/strict');
const origin = process.env.RESPONSIVE_TEST_ORIGIN || 'http://localhost:3100';
const widths = [320, 390, 640, 767, 768, 1024, 1440];
let browser, trainer, trainee, plan, libraries = [], stage = 'fixtures';
const phase = process.env.RESPONSIVE_PHASE || 'all';
(async () => {
  const suffix = String(Date.now()).slice(-9);
  trainer = await prisma.adminUser.create({ data: { employeeId: `RESP-${suffix}`, email: `resp-${suffix}@example.invalid`, fullName: 'Responsive Browser Trainer', role: 'TRAINER', passwordHash: 'unused-test-password' } });
  trainee = await prisma.trainee.create({ data: { traineeCode: `RESP-${suffix}`, fullName: 'Responsive Browser Trainee With A Long Display Name', email: `responsive-browser-trainee-${suffix}@example.invalid`, restaurantBrand: 'Responsive Brand', branchLocation: 'Long branch location for responsive layout checks', cohortBatch: 'Responsive browser cohort', jobRole: 'Responsive test role', hireDate: new Date() } });
  plan = await prisma.trainingPlan.create({ data: { title: 'Responsive Browser Training Plan With A Long Title', roleIdentifier: 'RESPONSIVE_TEST', status: 'PUBLISHED', createdById: trainer.id } });
  const published = await prisma.planVersion.create({ data: { planId: plan.id, versionNumber: 1, status: 'PUBLISHED', publishedById: trainer.id } });
  const draft = await prisma.planVersion.create({ data: { planId: plan.id, versionNumber: 2, status: 'DRAFT', publishedById: trainer.id } });
  libraries = await Promise.all(['ONBOARDING', 'ONBOARDING', 'COMMUNICATION', 'TECHNICAL', 'CULTURE', 'LEADERSHIP'].map((path, index) => prisma.milestoneDefinition.create({ data: { code: `R${suffix}-${index}`, title: `Responsive milestone ${index}`, description: 'Practice milestone details for responsive testing', path, orderIndex: index + 1, isStandard: false } })));
  await prisma.planNode.createMany({ data: [published, draft].flatMap(version => libraries.map((library, index) => ({ planVersionId: version.id, libraryMilestoneId: library.id, code: library.code, title: library.title, description: library.description, path: library.path, orderIndex: index + 1, posX: 0, posY: index * 200, isCustom: true }))) });
  const nodes = await prisma.planNode.findMany({ where: { planVersionId: published.id }, orderBy: { orderIndex: 'asc' } });
  await prisma.traineePlanAssignment.create({ data: { traineeId: trainee.id, planVersionId: published.id, assignedById: trainer.id } });
  await prisma.traineeProgress.createMany({ data: nodes.map((node, index) => ({ traineeId: trainee.id, planNodeId: node.id, status: index === 0 ? 'READY_FOR_REVIEW' : 'IN_PROGRESS', traineeNote: index === 0 ? 'Responsive review reflection' : null, requestedAt: index === 0 ? new Date() : null })) });
  browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_BROWSER_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
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
  async function sheet(page, maxDesktopWidth = 550) {
    await page.setViewportSize({ width: 390, height: 844 }); await settle(page);
    const panel = page.locator('.portal-modal-panel:visible, .portal-native-dialog[open]').last();
    await panel.waitFor();
    let box = await panel.boundingBox(); assert.ok(box.width >= 388 && box.height >= 840, `Mobile sheet size: ${box.width}x${box.height}`);
    await page.setViewportSize({ width: 1024, height: 900 }); await settle(page);
    box = await panel.boundingBox(); assert.ok(box.width <= maxDesktopWidth, `Desktop dialog width ${box.width}`);
    await page.setViewportSize({ width: 390, height: 844 }); await settle(page);
  }
  if (phase === 'all' || phase === 'trainer' || phase === 'trainer-controls') {
    const page = await staff.newPage();
    if (phase !== 'trainer-controls') for (const route of ['/trainer', '/trainer/plans', '/trainer/trainees', '/trainer/trainees/new', '/trainer/queue', '/trainer/batch', `/trainer/trainees/${trainee.id}`]) {
      stage = route;
      await page.goto(origin + route, { waitUntil: 'networkidle' }); await audit(page, route);
    }
    stage = 'bottom navigation and FAB';
    await page.goto(origin + '/trainer', { waitUntil: 'networkidle' });
    await page.setViewportSize({ width: 390, height: 844 }); await settle(page);
    assert.ok(await page.getByRole('navigation', { name: 'Mobile trainer navigation' }).isVisible());
    assert.equal(await page.getByRole('navigation', { name: 'Trainer navigation', exact: true }).isVisible(), false);
    const fab = page.getByRole('button', { name: 'Open quick actions' });
    const fabBox = await fab.boundingBox(); const navBox = await page.getByRole('navigation', { name: 'Mobile trainer navigation' }).boundingBox(); assert.ok(fabBox.y + fabBox.height <= navBox.y);
    await fab.click(); await page.getByRole('link', { name: 'New Course', exact: true }).click();
    await page.getByRole('dialog', { name: 'Create training plan' }).waitFor(); await sheet(page);
    console.log('PASS: mobile bottom navigation, FAB clearance, and Create Plan sheet / desktop modal');
    stage = 'mobile directory expansion and assignment sheet';
    await page.goto(origin + '/trainer/trainees', { waitUntil: 'networkidle' });
    await page.getByPlaceholder('Search by name, trainee code, role, plan, or email...').fill(trainee.traineeCode);
    const cards = page.getByLabel('Trainee cards');
    await cards.getByRole('button', { name: `${trainee.fullName} +`, exact: true }).click();
    await cards.getByText(trainee.email, { exact: true }).waitFor();
    await cards.getByRole('button', { name: 'Assign / change plan' }).click(); await sheet(page);
    console.log('PASS: mobile trainee card expansion and assignment sheet');
    await page.getByRole('dialog', { name: 'Assign training plan' }).getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.goto(origin + '/trainer/queue', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: new RegExp(`${libraries[0].code}:`) }).click();
    await page.getByText('Responsive review reflection', { exact: false }).waitFor();
    await page.setViewportSize({ width: 1024, height: 844 }); await settle(page);
    const columns = await page.locator('[class*=\"lg\:grid-cols-2\"]').first().evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length);
    assert.equal(columns, 2);
    assert.ok(await page.getByRole('navigation', { name: 'Trainer navigation', exact: true }).isVisible());
    console.log('PASS: queue inline expansion and desktop two-column layout / top navigation');
    await page.close();
  }
  if (phase === 'all' || phase === 'builder') {
    const page = await staff.newPage();
    stage = 'responsive builder';
    await page.goto(`${origin}/trainer/plans/${plan.id}/builder`, { waitUntil: 'networkidle' });
    await page.getByLabel('Learning path outline').waitFor();
    assert.equal(await page.locator('.react-flow').count(), 0);
    const first = page.getByLabel('Learning path outline').locator('article').first();
    await first.locator('summary').click();
    await first.getByRole('textbox', { name: `Title for ${libraries[0].code}` }).fill('Edited on mobile');
    await first.getByRole('button', { name: 'Save milestone', exact: true }).click();
    await first.getByText('Edited on mobile', { exact: true }).waitFor();
    await page.getByRole('button', { name: `Move ${libraries[0].code} down`, exact: true }).click();
    assert.ok((await page.getByLabel('Learning path outline').locator('article').first().textContent()).includes(libraries[1].code));
    const moved = page.getByLabel('Learning path outline').locator('article').filter({ hasText: libraries[0].code });
    if (await moved.locator('details[open]').count()) await moved.locator('summary').click();
    const handle = page.getByRole('button', { name: `Drag ${libraries[0].code} to reorder` });
    await handle.scrollIntoViewIfNeeded();
    const sourceBox = await handle.boundingBox(); const targetBox = await page.getByLabel('Learning path outline').locator('article').first().boundingBox();
    await page.mouse.move(sourceBox.x + 20, sourceBox.y + 20); await page.mouse.down(); await page.mouse.move(targetBox.x + 60, targetBox.y + 20, { steps: 5 }); await page.mouse.up();
    assert.ok((await page.getByLabel('Learning path outline').locator('article').first().textContent()).includes(libraries[0].code));
    await page.getByRole('button', { name: 'Save draft', exact: true }).click(); await page.getByText('Draft saved.', { exact: true }).waitFor({ timeout: 40000 });
    const stored = await prisma.planNode.findFirstOrThrow({ where: { planVersionId: draft.id, code: libraries[0].code } }); assert.equal(stored.title, 'Edited on mobile'); assert.equal(stored.orderIndex, 1);
    console.log('PASS: mobile inline edit, button/pointer reordering, and draft persistence');
    for (const [label, close] of [['Create milestone', 'Cancel'], ['Edit milestone', 'Cancel'], ['Publish training plan', 'Cancel']]) {
      stage = `${label} responsive sheet`;
      if (label === 'Create milestone') await page.getByRole('button', { name: 'Add Milestone', exact: true }).first().click();
      if (label === 'Edit milestone') { const item = page.getByLabel('Learning path outline').locator('article').first(); if (!await item.getByRole('button', { name: 'Stamp design / materials' }).isVisible()) await item.locator('summary').click(); await item.getByRole('button', { name: 'Stamp design / materials' }).click(); }
      if (label === 'Publish training plan') await page.getByRole('button', { name: 'Publish', exact: true }).click();
      await page.getByRole('dialog', { name: label, exact: true }).waitFor(); await sheet(page);
      await page.getByRole('dialog', { name: label, exact: true }).getByRole('button', { name: close, exact: true }).click();
    }
    stage = 'version history responsive sheet';
    await page.getByRole('button', { name: 'Version history', exact: true }).first().click();
    await sheet(page);
    await page.getByRole('button', { name: 'Close version history', exact: true }).click();
    stage = 'material preview responsive sheet';
    const fixtureMaterial = await prisma.courseMaterial.create({ data: { milestoneId: libraries[0].id, fileName: 'responsive-preview.pdf', mimeType: 'application/pdf', fileType: 'PDF', fileSizeBytes: 14, storagePath: `responsive-no-object/${libraries[0].id}/preview.pdf`, uploadedById: trainer.id } });
    const item = page.getByLabel('Learning path outline').locator('article').first();
    if (!await item.getByRole('button', { name: 'Stamp design / materials' }).isVisible()) await item.locator('summary').click();
    await item.getByRole('button', { name: 'Stamp design / materials' }).click();
    await page.getByRole('dialog', { name: 'Edit milestone', exact: true }).getByRole('button', { name: 'Preview / download', exact: true }).click();
    await sheet(page, 950);
    await page.getByRole('button', { name: 'Close material preview', exact: true }).click();
    await page.getByRole('dialog', { name: 'Edit milestone', exact: true }).getByRole('button', { name: 'Cancel', exact: true }).click();
    await prisma.courseMaterial.delete({ where: { id: fixtureMaterial.id } });
    console.log('PASS: version history and material preview sheets / desktop dialogs');
    stage = 'live breakpoint switching';
    await page.setViewportSize({ width: 1024, height: 844 }); await page.locator('.react-flow').waitFor();
    await page.setViewportSize({ width: 390, height: 844 }); await page.getByLabel('Learning path outline').waitFor();
    assert.ok((await page.getByLabel('Learning path outline').textContent()).includes('Edited on mobile'));
    await audit(page, '/trainer/plans/[id]/builder');
    console.log('PASS: builder breakpoint switching retains draft state; create/edit/publish sheets');
    await page.close();
  }
  if (phase === 'all' || phase === 'trainee') {
    const page = await learner.newPage();
    stage = 'trainee dashboard';
    await page.goto(origin + '/trainee/dashboard', { waitUntil: 'networkidle' });
    const profile = page.locator('details').filter({ has: page.locator('summary', { hasText: 'Profile +' }) });
    assert.equal(await profile.getAttribute('open'), null); await profile.locator('summary').click(); await page.getByText(trainee.branchLocation, { exact: true }).waitFor();
    await audit(page, '/trainee/dashboard');
    stage = 'passport mobile card stack';
    await page.goto(origin + '/trainee/dashboard/booklet', { waitUntil: 'networkidle' });
    await page.setViewportSize({ width: 390, height: 844 }); await page.getByLabel('Passport page cards').waitFor();
    assert.equal(await page.locator('.passport-spread').count(), 0);
    assert.ok(await page.getByLabel('Passport page cards').locator('article').count() > 5);
    await page.getByRole('button', { name: `${libraries[1].title}: incomplete, view details` }).click();
    await page.getByRole('heading', { name: libraries[1].title, exact: true }).last().waitFor();
    await page.setViewportSize({ width: 1024, height: 844 }); await page.locator('.passport-spread').waitFor();
    await page.getByRole('button', { name: 'Next', exact: true }).click(); await page.locator('.passport-turn').waitFor();
    await page.waitForTimeout(700);
    await audit(page, '/trainee/dashboard/booklet');
    console.log('PASS: mobile page cards and stamp inspection, desktop 3D turning');
    stage = 'module review sheet';
    await page.goto(`${origin}/trainee/dashboard/modules/${nodes[1].id}`, { waitUntil: 'networkidle' });
    await page.setViewportSize({ width: 390, height: 844 }); await page.getByRole('button', { name: 'Mark for Review', exact: true }).click();
    await sheet(page); console.log('PASS: trainee review sheet / desktop modal');
    await page.close();
  }
})().catch(error => { let detail = String(error.message || error.name).replace(/https?:\/\/[^\s]+/g, '[URL redacted]'); for (const key of ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY']) if(process.env[key]) detail = detail.replaceAll(process.env[key], '[redacted]'); console.error(`Responsive check failed at ${stage}: ${detail.slice(0, 2000)}`); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (trainee) await prisma.trainee.delete({ where: { id: trainee.id } });
  if (plan) await prisma.trainingPlan.delete({ where: { id: plan.id } });
  if (libraries.length) await prisma.milestoneDefinition.deleteMany({ where: { id: { in: libraries.map(item => item.id) } } });
  if (trainer) await prisma.adminUser.delete({ where: { id: trainer.id } });
  await prisma.$disconnect();
});
