// PLAYWRIGHT_BROWSERS_PATH=/tmp/passport-registration-browser/browsers PLAYWRIGHT_MODULE=/tmp/passport-registration-browser/node_modules/playwright node --env-file=.env scripts/test_module_review_browser.cjs
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
  trainer = await prisma.adminUser.create({ data: { employeeId: `MODREV-${suffix}`, email: `strobi-${suffix}@example.invalid`, fullName: 'Module Review Test Trainer', passwordHash: 'unused-test-password' } });
  plan = await prisma.trainingPlan.create({ data: { title: 'Strobi browser fixture', roleIdentifier: 'STROBI_TEST', status: 'PUBLISHED', createdById: trainer.id } });
  const version = await prisma.planVersion.create({ data: { planId: plan.id, versionNumber: 1, status: 'PUBLISHED', publishedById: trainer.id } });
  const nodes = [];
  for (const [path, mascot] of Object.entries(STROBI_MASCOT_MAP)) {
    nodes.push(await prisma.planNode.create({ data: { planVersionId: version.id, path, code: `MODREV-${suffix}-${path}`, title: `${mascot.category} celebration test`, description: 'Isolated Strobi browser check', orderIndex: 1, posX: 0, posY: 0 } }));
  }
  trainee = await prisma.trainee.create({ data: { traineeCode: `MODREV-${suffix}`, fullName: 'Module Review Test Trainee', email: `strobit-${suffix}@example.invalid`, restaurantBrand: 'Test', branchLocation: 'Test', cohortBatch: 'Test', hireDate: new Date() } });
  await prisma.traineePlanAssignment.create({ data: { traineeId: trainee.id, planVersionId: version.id, assignedById: trainer.id } });
  await prisma.traineeProgress.createMany({ data: nodes.map(node => ({ traineeId: trainee.id, planNodeId: node.id, status: node.path === 'COMMUNICATION' ? 'LOCKED' : node.path === 'TECHNICAL' ? 'READY_FOR_REVIEW' : 'IN_PROGRESS', traineeNote: node.path === 'TECHNICAL' ? 'Already submitted reflection' : null, requestedAt: new Date() })) });
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
  await page.goto(origin + '/trainee/dashboard/booklet', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Onboarding', exact: true }).click();
  let stamp = page.getByRole('link', { name: 'Onboarding celebration test: incomplete, open module', exact: true }).first();
  await stamp.hover();
  await page.getByRole('tooltip').getByText('In Progress', { exact: true }).waitFor();
  assert.equal(await page.getByRole('region', { name: 'Stamp details', exact: true }).count(), 0);
  assert.equal(await page.getByRole('button', { name: /Submit for review|Mark for Review/ }).count(), 0);
  await stamp.click();
  await page.getByRole('heading', { name: 'Module details', exact: true }).waitFor();
  assert(page.url().endsWith('/modules/' + nodes[0].id));
  const review = page.getByRole('region', { name: 'Review & feedback', exact: true });
  const ordered = await page.evaluate(() => {
    const materials = document.querySelector('section[aria-label="Course materials"]');
    const review = Array.from(document.querySelectorAll('section')).find(section => section.textContent.includes('Review & feedback'));
    return !!(materials.compareDocumentPosition(review) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  assert(ordered, 'Materials must appear before review form');
  const note = 'I practiced the onboarding activities and reviewed the course materials.';
  await review.getByLabel('Add a reflection for your trainer (optional)', { exact: true }).fill(note);
  await review.getByRole('button', { name: 'Submit for review', exact: true }).dblclick();
  await review.getByRole('button', { name: 'Awaiting trainer review', exact: true }).waitFor();
  assert(await review.getByRole('button', { name: 'Awaiting trainer review', exact: true }).isDisabled());
  const progress = await prisma.traineeProgress.findUniqueOrThrow({ where: { traineeId_planNodeId: { traineeId: trainee.id, planNodeId: nodes[0].id } } });
  assert.equal(progress.status, 'READY_FOR_REVIEW');
  assert.equal(progress.traineeNote, note);
  await page.reload({ waitUntil: 'networkidle' });
  await review.getByText(note, { exact: true }).waitFor();
  assert.equal(await review.locator('textarea').count(), 0);
  console.log('PASS: passport hover preview, no callout/quick review, click navigates, materials precede inline reflection, submission persists and prevents repeats');
  for (const [index, expected] of [[1, 'Milestone locked'], [2, 'Awaiting trainer review']]) {
    await page.goto(origin + '/trainee/dashboard/modules/' + nodes[index].id, { waitUntil: 'networkidle' });
    assert(await page.getByRole('button', { name: expected, exact: true }).isDisabled());
    assert.equal(await page.locator('textarea').count(), 0);
  }
  const staff = await context({ id: trainer.id, employeeId: trainer.employeeId, fullName: trainer.fullName, role: 'TRAINER', portal: 'trainer' }, 'beat_admin_session');
  const admin = await staff.newPage();
  await admin.goto(origin + '/trainer/queue', { waitUntil: 'networkidle' });
  const toggle = admin.getByRole('button', { name: new RegExp(nodes[0].code + ':') });
  await toggle.click();
  const card = toggle.locator('..');
  await card.getByRole('button', { name: '+ Add feedback note', exact: true }).click();
  await card.locator('input[id^="trainer-note-"]').fill('Excellent onboarding reflection.');
  await card.getByRole('button', { name: '1-Click Verify & Stamp', exact: true }).click();
  await admin.getByText('Stamped & Verified!', { exact: true }).waitFor();
  await page.goto(origin + '/trainee/dashboard/modules/' + nodes[0].id, { waitUntil: 'networkidle' });
  await review.getByText('Excellent onboarding reflection.', { exact: true }).waitFor();
  await review.getByText('Module Review Test Trainer', { exact: true }).first().waitFor();
  await review.getByText(note, { exact: true }).waitFor();
  assert(await review.getByRole('button', { name: 'Verified & Stamped', exact: true }).isDisabled());
  await page.goto(origin + '/trainee/dashboard/booklet', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Onboarding', exact: true }).click();
  stamp = page.getByRole('link', { name: 'Onboarding celebration test: verified and stamped, open module', exact: true }).first();
  await stamp.hover();
  await page.getByRole('tooltip').getByText('Excellent onboarding reflection.', { exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await stamp.click();
  await page.getByRole('heading', { name: 'Module details', exact: true }).waitFor();
  assert(page.url().endsWith('/modules/' + nodes[0].id));
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  console.log('PASS: locked/pending controls, actual trainer approval and feedback on module page, completed hover metadata, mobile tap navigation, no browser errors');
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (trainee) await prisma.trainee.delete({ where: { id: trainee.id } });
  if (plan) await prisma.trainingPlan.delete({ where: { id: plan.id } });
  if (trainer) await prisma.adminUser.delete({ where: { id: trainer.id } });
  await prisma.$disconnect();
});
