// PLAYWRIGHT_MODULE=/tmp/passport-registration-browser/node_modules/playwright node --env-file=.env scripts/test_individual_publish_browser.cjs
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
require('tsx/cjs');
const assert = require('node:assert/strict');
const { prisma } = require('../lib/db/prisma.ts');
const { SignJWT } = require('jose');
const { createRoleVariant } = require('../lib/db/repositories/learning-paths.ts');
const { assignPlanToTrainee } = require('../lib/db/repositories/assignments.ts');
const { savePlanVersion, publishPlanVersion } = require('../lib/db/repositories/plans.ts');
const { verificationData } = require('../lib/stamps/hash.ts');
const origin = process.env.SCOPE_TEST_ORIGIN || 'http://localhost:3100';
const suffix = String(Date.now()); let trainer, browser, stage = 'fixtures'; const trainees = [];
(async () => {
  trainer = await prisma.adminUser.create({ data: { employeeId: `SCP-${suffix}`, fullName: 'Scope Browser Trainer', email: `scp-${suffix}@example.invalid`, passwordHash: 'fixture-unused' } });
  const variant = await createRoleVariant({ title: `Scope Browser ${suffix}`, targetDepartment: 'ICT Department', targetPosition: 'Application Developer' }, trainer.id);
  const template = await prisma.planVersion.findFirstOrThrow({ where: { planId: variant.planId }, include: { nodes: true } });
  const initial = await savePlanVersion({ planId: variant.planId, publishedById: trainer.id, status: 'DRAFT', nodes: template.nodes.filter(node => ['ONB-01','ONB-02','ONB-03'].includes(node.code)), edges: [] });
  await publishPlanVersion({ versionId: initial.id, syncTrainees: false }, trainer.id);
  for (const name of ['Alice', 'Bob']) {
    const trainee = await prisma.trainee.create({ data: { traineeCode: `SCP-${suffix}-${name}`, fullName: `${name} Scope Fixture`, email: `${name}-${suffix}@example.invalid`, department: 'ICT Department', position: 'Application Developer', restaurantBrand: 'Test', branchLocation: 'Test', cohortBatch: 'Test', hireDate: new Date() } });
    await assignPlanToTrainee({ traineeId: trainee.id, planVersionId: initial.id, assignedById: trainer.id }); trainees.push(trainee);
  }
  const [a, b] = trainees;
  const active = id => prisma.traineePlanAssignment.findFirstOrThrow({ where: { traineeId: id, status: 'ACTIVE' }, include: { planVersion: { include: { nodes: true } } } });
  const aa = await active(a.id), bb = await active(b.id);
  const original = await prisma.traineeProgress.findFirstOrThrow({ where: { traineeId: a.id, planNode: { code: 'ONB-01' } } });
  const stamp = await prisma.traineeProgress.update({ where: { id: original.id }, data: verificationData(a.id, original.planNodeId, trainer.id, new Date(), 'Keep original stamp') });
  const extra = code => ({ code: `SC-${suffix.slice(-8)}-${code}`, title: `${code} requirement`, description: 'Scope browser fixture custom milestone', path: 'TECHNICAL', orderIndex: 4, posX: 0, posY: 0, isCustom: true });
  const bDraft = await savePlanVersion({ planId: bb.planVersion.planId, publishedById: trainer.id, status: 'DRAFT', nodes: bb.planVersion.nodes.map(node => node.code === 'ONB-01' ? { ...node, title: 'Bob personalized orientation' } : node).concat(extra('BOB')), edges: [] });
  await publishPlanVersion({ versionId: bDraft.id, syncTrainees: true }, trainer.id);
  const bBefore = (await active(b.id)).planVersionId;
  const token = await new SignJWT({ id: trainer.id, employeeId: trainer.employeeId, fullName: trainer.fullName, role: 'TRAINER', portal: 'trainer' }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1h').sign(new TextEncoder().encode(process.env.SESSION_SECRET));
  let page, personalDefinition;
  async function openBuilder(editPersonal = false) {
    if (browser) await browser.close();
    browser = await chromium.launch(process.env.SCOPE_USE_BUNDLED_BROWSER === '1' ? { headless: true } : { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 950 } });
    await context.addCookies([{ name: 'beat_admin_session', value: token, url: origin }]);
    page = await context.newPage(); page.setDefaultTimeout(20000);
    await page.goto(`${origin}/trainer/plans/${aa.planVersion.planId}/builder`, { waitUntil: 'networkidle' });
    if (editPersonal) {
      await page.setViewportSize({ width: 390, height: 844 });
      const personalCode = `SC-${suffix.slice(-8)}-PERSONAL`;
      const definition = await prisma.milestoneDefinition.findUniqueOrThrow({ where: { code: personalCode } });
      personalDefinition = definition;
      const outline = page.getByLabel('Learning path outline');
      const card = outline.locator('article[data-path="TECHNICAL"]').filter({ hasText: personalCode });
      await card.locator('summary').click();
      await card.getByRole('button', { name: 'Stamp design / materials', exact: true }).click();
      const editor = page.getByRole('dialog', { name: 'Edit milestone in this draft', exact: true });
      await editor.locator('#editMilestoneTitle').fill('Personal title stays private');
      await editor.getByRole('button', { name: 'Save changes', exact: true }).click();
      assert.equal((await prisma.milestoneDefinition.findUniqueOrThrow({ where: { id: definition.id } })).title, definition.title);
      console.log('PASS: individual custom-node editing does not rename the shared library definition before publication');
    }
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Choose who receives path changes', exact: true });
    await modal.getByRole('radio', { name: /^Only this trainee/ }).waitFor(); return modal;
  }
  async function confirm(modal) {
    await modal.getByRole('button', { name: 'Confirm and publish', exact: true }).click();
    const result = await Promise.race([
      modal.waitFor({ state: 'detached', timeout: 60000 }).then(() => 'published'),
      modal.getByRole('alert').waitFor({ timeout: 60000 }).then(async () => `Publish error: ${await modal.getByRole('alert').textContent()}`),
    ]);
    assert.equal(result, 'published');
  }
  async function draft(code, title) {
    if (browser) { await browser.close(); browser = undefined; }
    const current = await active(a.id);
    await savePlanVersion({ planId: current.planVersion.planId, publishedById: trainer.id, status: 'DRAFT', nodes: current.planVersion.nodes.map(node => node.code === 'ONB-01' ? { ...node, title } : node).concat(extra(code)), edges: [] });
  }
  stage = 'individual default and cancel';
  await draft('PERSONAL', 'Alice personal orientation');
  let modal = await openBuilder(true);
  assert.equal(await modal.getByRole('radio', { name: /^Only this trainee/ }).isChecked(), true, 'individual scope must default/reset on opening');
  await modal.getByText(/has 2 enrolled trainees/).waitFor();
  await modal.getByRole('radio', { name: /^Update the shared variant/ }).check();
  assert.equal(await modal.getByRole('checkbox', { name: /Bob Scope Fixture/ }).isChecked(), false, 'other trainees must be unchecked');
  assert.equal(await modal.getByRole('checkbox', { name: /Alice Scope Fixture/ }).isChecked(), true, 'source trainee must be included');
  await modal.getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.equal((await active(a.id)).planVersionId, aa.planVersionId);
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  modal = page.getByRole('dialog', { name: 'Choose who receives path changes', exact: true });
  assert.equal(await modal.getByRole('radio', { name: /^Only this trainee/ }).isChecked(), true, 'individual scope must default/reset on opening');
  await modal.getByRole('button', { name: 'Review impact', exact: true }).click();
  await modal.getByRole('region', { name: 'Publish impact preview', exact: true }).waitFor();
  assert.equal(await modal.locator('article').count(), 1);
  await confirm(modal);
  assert.equal((await active(b.id)).planVersionId, bBefore);
  assert.equal((await prisma.milestoneDefinition.findUniqueOrThrow({ where: { id: personalDefinition.id } })).title, personalDefinition.title);
  assert.equal(await prisma.planVersion.count({ where: { planId: variant.planId } }), 1);
  console.log('PASS: personal scope defaults, enrollment count, other trainees unchecked, cancel/reset and one-trainee publication');

  stage = 'selected shared publication';
  await draft('SHARED', 'Shared orientation');
  modal = await openBuilder();
  await modal.getByRole('radio', { name: /^Update the shared variant/ }).check();
  await modal.getByRole('checkbox', { name: /Bob Scope Fixture/ }).check();
  await modal.getByRole('button', { name: 'Review impact', exact: true }).click();
  await modal.getByRole('region', { name: 'Publish impact preview', exact: true }).waitFor();
  assert.equal(await modal.locator('article').count(), 2);
  await modal.getByText(/individual title retained/).waitFor();
  await confirm(modal);
  const bUpdated = await active(b.id);
  assert.equal(bUpdated.planVersion.nodes.find(node => node.code === 'ONB-01').title, 'Bob personalized orientation');
  assert.ok(bUpdated.planVersion.nodes.some(node => node.code.endsWith('-BOB')));
  assert.ok(bUpdated.planVersion.nodes.some(node => node.code.endsWith('-SHARED')));
  console.log('PASS: explicit shared recipient selection, per-trainee impact/conflict preview and preserved personal customization');

  stage = 'curated variant mobile';
  await draft('CURATED', 'Curated orientation');
  modal = await openBuilder();
  await page.setViewportSize({ width: 390, height: 844 });
  await modal.getByRole('radio', { name: /^Create a new reusable variant/ }).check();
  await modal.getByLabel('Variant Title', { exact: true }).fill(`Curated Scope ${suffix}`);
  await modal.getByLabel('Variant Department', { exact: true }).selectOption('Finance Department');
  assert.equal(await modal.getByLabel('Variant Position', { exact: true }).inputValue(), '');
  await modal.getByLabel('Variant Position', { exact: true }).selectOption('Accounting Assistant');
  await modal.getByRole('button', { name: 'Review impact', exact: true }).click();
  await modal.getByRole('region', { name: 'Publish impact preview', exact: true }).waitFor();
  assert.equal(await modal.locator('article').count(), 1);
  await confirm(modal);
  const instance = await prisma.learningPath.findUniqueOrThrow({ where: { planId: aa.planVersion.planId } });
  assert.notEqual(instance.parentId, variant.id);
  assert.equal((await prisma.learningPath.findUniqueOrThrow({ where: { id: instance.parentId } })).title, `Curated Scope ${suffix}`);
  assert.equal((await active(b.id)).planVersionId, bUpdated.planVersionId);
  assert.equal((await prisma.traineeProgress.findUniqueOrThrow({ where: { id: stamp.id } })).verificationHash, stamp.verificationHash);
  console.log('PASS: mobile curated-variant flow, department/position reset, isolated relinking and original stamp retention');
})().catch(error => { console.error(`Scope browser test failed at ${stage}: ${String(error.message || error.name).replace(/https?:\/\/[^\s]+/g, '[URL]').slice(0, 1600)}`); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  const paths = trainer ? await prisma.learningPath.findMany({ where: { plan: { createdById: trainer.id } } }) : [];
  const custom = trainer ? await prisma.planNode.findMany({ where: { isCustom: true, planVersion: { plan: { createdById: trainer.id } } }, select: { code: true } }) : [];
  await prisma.trainee.deleteMany({ where: { id: { in: trainees.map(trainee => trainee.id) } } });
  await prisma.trainingPlan.deleteMany({ where: { id: { in: paths.filter(path => path.type === 'INSTANCE').map(path => path.planId) } } });
  await prisma.trainingPlan.deleteMany({ where: { id: { in: paths.filter(path => path.type === 'VARIANT').map(path => path.planId) } } });
  if (custom.length) await prisma.milestoneDefinition.deleteMany({ where: { code: { in: custom.map(node => node.code) } } });
  if (trainer) await prisma.adminUser.delete({ where: { id: trainer.id } });
  await prisma.$disconnect();
});
