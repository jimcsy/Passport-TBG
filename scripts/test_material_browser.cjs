// Optional: PLAYWRIGHT_MODULE=/tmp/passport-browser/node_modules/playwright node --env-file=.env scripts/test_material_browser.cjs
// Set MATERIAL_TEST_PHASE=delete for the focused deletion check.
// Uses isolated fixtures, real Storage and actual server actions. Never prints credentials or URLs.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
require('tsx/cjs');
const { prisma } = require('../lib/db/prisma.ts');
const { SignJWT } = require('jose');
const { createClient } = require('@supabase/supabase-js');
const assert = require('node:assert/strict');
const origin = process.env.MATERIAL_TEST_ORIGIN || 'http://localhost:3100';
let browser, trainer, trainee, plan, milestone, stage = 'fixture setup';
(async () => {
  const suffix = Date.now();
  trainer = await prisma.adminUser.create({ data: { employeeId: `MATB-${suffix}`, email: `matb-${suffix}@example.invalid`, fullName: 'Materials Browser Trainer', role: 'TRAINER', passwordHash: 'unused-test-password' } });
  milestone = await prisma.milestoneDefinition.create({ data: { code: `MATB-${suffix}`, title: 'Browser materials fixture', description: 'Upload and preview browser acceptance fixture', path: 'ONBOARDING', isStandard: true } });
  plan = await prisma.trainingPlan.create({ data: { title: 'Materials browser fixture', roleIdentifier: 'MATERIAL_BROWSER', createdById: trainer.id } });
  const version = await prisma.planVersion.create({ data: { planId: plan.id, versionNumber: 1, status: 'DRAFT', publishedById: trainer.id } });
  const node = await prisma.planNode.create({ data: { planVersionId: version.id, libraryMilestoneId: milestone.id, path: 'ONBOARDING', code: milestone.code, title: milestone.title, description: milestone.description, orderIndex: 1, posX: 0, posY: 0 } });
  trainee = await prisma.trainee.create({ data: { traineeCode: `MATB-${suffix}`, fullName: 'Materials Browser Trainee', email: `matbt-${suffix}@example.invalid`, restaurantBrand: 'Test', branchLocation: 'Test', cohortBatch: 'Materials browser test', hireDate: new Date() } });
  await prisma.traineePlanAssignment.create({ data: { traineeId: trainee.id, planVersionId: version.id, assignedById: trainer.id } });
  browser = await chromium.launch({ executablePath: process.env.STAMP_BROWSER_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  async function context(payload, cookie) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    const key = new TextEncoder().encode(process.env.SESSION_SECRET || 'beat-growth-passport-super-secret-key-change-in-production-2024');
    const token = await new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(key);
    await ctx.addCookies([{ name: cookie, value: token, url: origin }]);
    return ctx;
  }
  const staff = await context({ id: trainer.id, employeeId: trainer.employeeId, fullName: trainer.fullName, role: 'TRAINER', portal: 'trainer' }, 'beat_admin_session');
  const page = await staff.newPage();
  page.on('pageerror', error => console.log('Browser runtime error: ' + String(error.message).split('\n')[0].replace(/https?:\/\/[^\s]+/g, '[URL redacted]')));
  stage = 'canvas material attachment';
  await page.goto(`${origin}/trainer/plans/${plan.id}/builder`, { waitUntil: 'networkidle' });
  stage = 'opening canvas material editor';
  await page.getByRole('button', { name: 'Attach Materials', exact: true }).first().click();
  const editor = page.getByRole('dialog', { name: 'Edit milestone' });
  stage = 'loading material list in editor';
  await editor.waitFor({ timeout: 10000 });
  console.log('Material editor opened');
  await editor.getByRole('heading', { name: 'Course materials (0)' }).waitFor({ timeout: 10000 });
  if (process.env.MATERIAL_TEST_PHASE === 'delete') {
  stage = 'deletion fixture setup';
  const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const materialId = require('node:crypto').randomUUID();
  const storagePath = `${milestone.code}/${materialId}/deletion.pdf`;
  const bytes = Buffer.from('%PDF-1.4\n%%EOF\n');
  const result = await service.storage.from('course-materials').upload(storagePath, bytes, { contentType: 'application/pdf' });
  assert.equal(result.error, null);
  await prisma.courseMaterial.create({ data: { id: materialId, milestoneId: milestone.id, fileName: 'deletion.pdf', mimeType: 'application/pdf', fileType: 'PDF', fileSizeBytes: bytes.length, storagePath, uploadedById: trainer.id } });
  await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Attach Materials', exact: true }).first().click();
  await editor.getByRole('heading', { name: 'Course materials (1)' }).waitFor();
  stage = 'browser deletion';
  await page.bringToFront();
  page.on('dialog', dialog => dialog.accept());
  const records = await prisma.courseMaterial.findMany({ where: { milestoneId: milestone.id } });
  for (const record of records) {
    await editor.locator('li').filter({ hasText: record.fileName }).getByRole('button', { name: 'Delete', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('[aria-label="Course materials"]')?.textContent.includes('Loading materials'));
    for (let attempt = 0; attempt < 40; attempt++) {
      if (!await prisma.courseMaterial.findUnique({ where: { id: record.id } })) break;
      await page.waitForTimeout(250);
    }
    assert.equal(await prisma.courseMaterial.count({ where: { id: record.id } }), 0);
    const storage = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    assert.ok((await storage.storage.from('course-materials').info(record.storagePath)).error);
  }
  console.log('PASS: browser deletion removes database records and Storage objects');
    return;
  }
  await page.evaluate(() => {
    window.__uploadProgress = [];
    new MutationObserver(() => document.querySelectorAll('[role=progressbar]').forEach(element => window.__uploadProgress.push(Number(element.getAttribute('aria-valuenow'))))).observe(document.body, { subtree: true, childList: true, attributes: true });
  });
  stage = 'sequential drag-and-drop uploads';
  const transfer = await page.evaluateHandle(() => {
    const data = new DataTransfer();
    // These fixtures check transport and preview elements, not media decoding.
    data.items.add(new File(['%PDF-1.4\n%%EOF\n'], 'browser.pdf', { type: 'application/pdf' }));
    data.items.add(new File([new Uint8Array(1024 * 1024)], 'browser.mp4', { type: 'video/mp4' }));
    data.items.add(new File([new Uint8Array([80,75,5,6,...new Array(18).fill(0)])], 'browser.pptx', { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }));
    return data;
  });
  await editor.locator('[class*="border-dashed"]').dispatchEvent('drop', { dataTransfer: transfer });
  await editor.getByText('3 files uploaded.', { exact: true }).waitFor({ timeout: 90000 });
  await editor.getByRole('heading', { name: 'Course materials (3)' }).waitFor();
  assert.equal(await prisma.courseMaterial.count({ where: { milestoneId: milestone.id } }), 3);
  const progress = await page.evaluate(() => window.__uploadProgress);
  assert.ok(progress.some(value => value > 0));
  assert.ok(progress.includes(100));
  console.log('PASS: canvas attachment, sequential real drag/drop uploads, and upload progress');
  stage = 'invalid file feedback';
  await editor.locator('input[type=file]').setInputFiles({ name: 'invalid.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('not allowed') });
  await editor.getByRole('alert').getByText(/Unsupported file type/).waitFor();
  console.log('PASS: invalid file type shows a clear error');
  stage = 'MP4, PDF, and PPTX preview components';
  for (const [file, selector] of [['browser.pdf', 'iframe'], ['browser.mp4', 'video'], ['browser.pptx', null]]) {
    const row = editor.locator('li').filter({ hasText: file });
    await row.getByRole('button', { name: 'Preview / download', exact: true }).click();
    const preview = page.getByRole('dialog', { name: file, exact: true });
    if (selector) { await preview.locator(selector).waitFor(); assert.ok(await preview.locator(selector).getAttribute('src')); }
    else await preview.getByText(/Presentation preview is available/).waitFor();
    await preview.getByRole('button', { name: 'Close material preview' }).click();
  }
  console.log('PASS: correct video/PDF/PPTX preview UI');
  stage = 'trainee signed material access';
  const learner = await context({ id: trainee.id, traineeCode: trainee.traineeCode, fullName: trainee.fullName, portal: 'trainee' }, 'beat_trainee_session');
  const learnerPage = await learner.newPage();
  await learnerPage.goto(`${origin}/trainee/dashboard/modules/${node.id}`, { waitUntil: 'networkidle' });
  await learnerPage.getByRole('heading', { name: 'Course materials (3)' }).waitFor();
  await learnerPage.getByRole('button', { name: 'Play video', exact: true }).click();
  await learnerPage.locator('video').waitFor();
  assert.ok(await learnerPage.locator('video').getAttribute('src'));
  assert.equal(await learnerPage.getByRole('button', { name: 'Delete', exact: true }).count(), 0);
  console.log('PASS: assigned trainee can view signed resources and play inline video; editing controls absent');
  console.log('PASS: upload/preview browser checks complete; deletion has its own focused script');
})().catch(error => { let detail = String(error.message || error.name).split('\n')[0].replace(/https?:\/\/[^\s]+/g, '[URL redacted]'); for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) if (process.env[key]) detail = detail.replaceAll(process.env[key], '[redacted]'); console.error(`Browser material check did not pass at: ${stage}. ${detail}`); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (milestone) {
    const records = await prisma.courseMaterial.findMany({ where: { milestoneId: milestone.id } });
    if (records.length) {
      const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
      const result = await client.storage.from('course-materials').remove(records.map(record => record.storagePath));
      if (result.error) { console.error('Temporary browser Storage cleanup needs retry.'); process.exitCode = 1; }
    }
  }
  if (trainee) await prisma.trainee.delete({ where: { id: trainee.id } });
  if (plan) await prisma.trainingPlan.delete({ where: { id: plan.id } });
  if (milestone) await prisma.milestoneDefinition.delete({ where: { id: milestone.id } });
  if (trainer) await prisma.adminUser.delete({ where: { id: trainer.id } });
  await prisma.$disconnect();
});
