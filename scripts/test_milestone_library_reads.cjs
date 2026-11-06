// node --env-file=.env scripts/test_milestone_library_reads.cjs
const assert = require('node:assert/strict');
const Module = require('node:module');
require('tsx/cjs');
const { prisma } = require('../lib/db/prisma.ts');
const { listMilestoneLibrary } = require('../lib/db/repositories/milestone-library.ts');
const originalLoad = Module._load;
let session = null, readCalls = 0;
Module._load = function(request, parent, main) {
  if (request === '@/lib/auth/session') return { getAdminSession: async () => session };
  if (request === 'next/cache') return { revalidatePath() {} };
  if (request === '@/lib/db/repositories/milestone-library') return { listMilestoneLibrary: async filters => { readCalls++; return listMilestoneLibrary(filters); } };
  return originalLoad.call(this, request, parent, main);
};
const { listMilestoneLibraryAction: list } = require('../lib/actions/plans.ts');
const prefix = `TC02-${Date.now()}`;
let admin, trainee;
const planIds = [];
(async () => {
  assert.equal((await list()).success, false); assert.equal(readCalls, 0);
  admin = await prisma.adminUser.create({ data: { employeeId: prefix, fullName: 'Library fixture', email: `${prefix}@example.invalid`, passwordHash: 'unused' } });
  session = { id: admin.id, role: 'TRAINER', portal: 'trainer' };
  trainee = await prisma.trainee.create({ data: { traineeCode: prefix, fullName: 'PRIVATE FIXTURE NAME', email: `${prefix}@example.invalid`, restaurantBrand: 'Test', branchLocation: 'Test', cohortBatch: 'Test', hireDate: new Date() } });
  const custom = await prisma.milestoneDefinition.create({ data: { code: `${prefix}-C`, title: `${prefix} custom title`, description: 'Shared metadata fixture', path: 'TECHNICAL', isStandard: false } });
  const standard = await prisma.milestoneDefinition.create({ data: { code: `${prefix}-S`, title: `${prefix} standard title`, description: 'Canonical fixture', path: 'ONBOARDING', isStandard: true } });
  for (let i = 0; i < 2; i++) await prisma.courseMaterial.create({ data: { milestoneId: custom.id, fileName: `fixture${i}.pdf`, fileType: 'PDF', mimeType: 'application/pdf', fileSizeBytes: 10, storagePath: `${prefix}/PRIVATE-STORAGE-${i}`, uploadedById: admin.id } });
  const makePlan = async (type, status = 'PUBLISHED') => {
    const plan = await prisma.trainingPlan.create({ data: { title: type === 'INSTANCE' ? 'PRIVATE PLAN TITLE' : `${prefix} ${type || 'legacy'}`, roleIdentifier: prefix, status, createdById: admin.id } });
    planIds.push(plan.id);
    if (type) await prisma.learningPath.create({ data: { planId: plan.id, type, title: plan.title, isTemplate: type === 'MASTER', ...(type === 'INSTANCE' ? { traineeId: trainee.id } : {}) } });
    return plan;
  };
  const version = (plan, number, status) => prisma.planVersion.create({ data: { planId: plan.id, versionNumber: number, status, publishedById: admin.id } });
  const node = (v, def = custom, overrides = {}) => prisma.planNode.create({ data: { planVersionId: v.id, libraryMilestoneId: def.id, code: def.code, title: def.title, description: def.description, path: def.path, orderIndex: 1, posX: 0, posY: 0, isCustom: !def.isStandard, ...overrides } });
  const assign = v => prisma.traineePlanAssignment.create({ data: { traineeId: trainee.id, planVersionId: v.id, assignedById: admin.id } });
  // The database enforces one corporate MASTER; fixtures use reusable VARIANTs.
  const master = await makePlan('VARIANT');
  const old = await version(master, 1, 'SUPERSEDED'), live = await version(master, 2, 'PUBLISHED'), draft = await version(master, 3, 'DRAFT');
  await node(old); await node(live); await node(live); await node(draft); await node(draft, standard);
  await node(draft, custom, { libraryMilestoneId: null });
  // Existing updateMany also touches a custom code match linked to a different definition.
  await node(draft, custom, { libraryMilestoneId: standard.id });
  await node(draft, custom, { libraryMilestoneId: null, code: custom.code.toLowerCase() });
  await assign(old); await assign(live);
  const variant = await makePlan('VARIANT');
  const previous = await version(variant, 1, 'PUBLISHED'); await node(previous);
  await version(variant, 2, 'PUBLISHED'); // Latest version removed this milestone: history only.
  const instance = await makePlan('INSTANCE');
  const privateLive = await version(instance, 1, 'PUBLISHED'), privateDraft = await version(instance, 2, 'DRAFT');
  await node(privateLive); await node(privateDraft); await assign(privateLive);
  const legacy = await makePlan(null); await node(await version(legacy, 1, 'PUBLISHED'));
  const archived = await makePlan('VARIANT', 'ARCHIVED'); await node(await version(archived, 1, 'PUBLISHED'));
  let result = await list({ search: prefix }); assert.equal(result.success, true);
  const row = result.data.find(r => r.id === custom.id);
  assert.equal(row.materialCount, 2);
  assert.deepEqual(row.usage, {
    reusablePlanCount: 1, reusablePlans: [{ planId: master.id, title: master.title, type: 'VARIANT', draft: true, published: true }],
    historicalReusablePlanCount: 3, historicalVersionCount: 3, privateInstanceCount: 1, unclassifiedPlanCount: 1,
    activeTraineeCount: 1, materialAffectedActiveTraineeCount: 1,
    metadataAffectedDraftNodeCount: 4, metadataAffectedDraftPlanCount: 2, metadataCodeFallbackDraftNodeCount: 2,
  });
  assert.equal(result.data.find(r => r.id === standard.id).usage.metadataAffectedDraftNodeCount, 0);
  const serialized = JSON.stringify(result);
  for (const secret of [trainee.id, trainee.fullName, trainee.email, instance.id, 'PRIVATE PLAN TITLE', 'PRIVATE-STORAGE', 'storagePath', 'signedUrl']) assert.equal(serialized.includes(secret), false, secret);
  console.log('PASS: real material counts, deduplicated reusable/history/private references, active recipients, exact draft fallback impact, and privacy');
  assert.equal((await list({ search: custom.code.toLowerCase(), origin: 'CUSTOM', path: 'TECHNICAL' })).data.length, 1);
  assert.equal((await list({ search: `${prefix} STANDARD TITLE`, origin: 'STANDARD' })).data.length, 1);
  assert.equal((await list({ search: prefix, path: 'CULTURE' })).data.length, 0);
  assert.equal((await list({ origin: 'INVALID' })).success, false);
  assert.equal((await list({ path: 'INVALID' })).success, false);
  assert.equal((await list({ search: 'x'.repeat(101) })).success, false);
  assert.deepEqual((await list({ search: prefix })).data, result.data);
  console.log('PASS: authenticated filters, invalid input rejection, deterministic ordering and repeatable counts');
  let queries = 0;
  const measured = { $transaction: (callback, options) => prisma.$transaction(tx => callback(new Proxy(tx, { get(target, name) {
    if (['milestoneDefinition', 'planNode', 'planVersion'].includes(name)) return new Proxy(target[name], { get(model, method) { if (method === 'findMany') return args => { queries++; return model.findMany(args); }; return model[method]; } });
    return target[name];
  } })), options) };
  await listMilestoneLibrary({ search: prefix }, measured); assert.equal(queries, 3);
  console.log('PASS: fixed three batched repository reads for multiple library rows (no per-row queries)');
})().catch(error => { console.error(`Library read check failed: ${String(error.message).replace(/(?:postgres(?:ql)?|https?):\/\/\S+/g, '[URL]').slice(0, 1800)}`); process.exitCode = 1; }).finally(async () => {
  Module._load = originalLoad;
  if (trainee) await prisma.trainee.delete({ where: { id: trainee.id } });
  await prisma.trainingPlan.deleteMany({ where: { id: { in: planIds } } });
  await prisma.milestoneDefinition.deleteMany({ where: { code: { startsWith: prefix } } });
  if (admin) await prisma.adminUser.delete({ where: { id: admin.id } });
  await prisma.$disconnect();
});
