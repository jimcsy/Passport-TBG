// Storage is mocked here. Live Supabase tests must also pass before closing #32.
const assert = require('node:assert/strict');
const Module = require('node:module');
require('tsx/cjs');
const { prisma } = require('../lib/db/prisma.ts');
const sessions = require('../lib/auth/session.ts');
let admin = null, trainee = null, failRemove = false;
const objects = new Map();
const signedReads = [];
const storage = {
  createSignedUploadUrl: async path => ({ data: { signedUrl: `https://storage.example.invalid/${path}` }, error: null }),
  info: async path => objects.has(path) ? { data: objects.get(path), error: null } : { data: null, error: new Error('missing') },
  remove: async paths => { if (failRemove) return { error: new Error('offline') }; for (const path of paths) objects.delete(path); return { error: null }; },
  createSignedUrl: async (path, expiresIn, options) => { signedReads.push({ path, expiresIn, options }); return { data: { signedUrl: 'https://storage.example.invalid/signed-view' }, error: null }; },
};
const originalLoad = Module._load;
Module._load = function(request, parent, main) {
  if (request === '@/lib/auth/session') return { ...sessions, getAdminSession: async () => admin, getTraineeSession: async () => trainee };
  if (request === '@/lib/supabase/server') return { MATERIAL_BUCKET: 'course-materials', getSupabaseAdmin: () => ({ storage: { from: () => storage } }) };
  if (request === 'next/cache') return { revalidatePath: () => {} };
  return originalLoad.call(this, request, parent, main);
};
const actions = require('../lib/actions/materials.ts');
let milestone, testTrainee, plan;
(async () => {
  const trainer = await prisma.adminUser.findFirstOrThrow();
  milestone = await prisma.milestoneDefinition.create({ data: { code: `MATACT-${Date.now()}`, title: 'Material action test', description: 'Isolated Storage mock integration', path: 'TECHNICAL', isStandard: false } });
  const input = { milestoneId: milestone.id, fileName: 'lesson.pdf', mimeType: 'application/pdf', fileSizeBytes: 10 };
  assert.equal((await actions.requestUploadUrlAction(input)).success, false);
  admin = trainer;
  assert.equal((await actions.requestUploadUrlAction({ ...input, fileSizeBytes: 50 * 1024 * 1024 + 1 })).success, false);
  const requested = await actions.requestUploadUrlAction(input);
  assert.equal(requested.success, true);
  const { ticket, storagePath, materialId } = requested.data;
  assert.ok(storagePath.startsWith(`${milestone.code}/${materialId}/`));
  assert.equal((await actions.confirmUploadAction(ticket)).success, false, 'missing object rejected');
  objects.set(storagePath, { size: 11, contentType: input.mimeType });
  assert.equal((await actions.confirmUploadAction(ticket)).success, false, 'size mismatch rejected');
  assert.equal(objects.has(storagePath), false);
  objects.set(storagePath, { size: 10, contentType: input.mimeType });
  admin = { ...trainer, id: 'another-trainer' };
  assert.equal((await actions.confirmUploadAction(ticket)).success, false, 'trainer-bound ticket');
  admin = trainer;
  assert.equal((await actions.confirmUploadAction(ticket + 'tampered')).success, false);
  assert.equal((await actions.confirmUploadAction(ticket)).success, true);
  assert.equal((await actions.confirmUploadAction(ticket)).success, true, 'retry is idempotent');
  assert.equal(await prisma.courseMaterial.count({ where: { id: materialId } }), 1);
  assert.equal((await actions.getMaterialSignedUrlAction(materialId)).success, true);
  assert.equal(signedReads.at(-1).expiresIn, 3600);
  await actions.getMaterialSignedUrlAction(materialId, true);
  assert.equal(signedReads.at(-1).options.download, 'lesson.pdf');
  testTrainee = await prisma.trainee.create({ data: { traineeCode: `MATACT-${Date.now()}`, fullName: 'Materials test', email: 'materials@example.invalid', restaurantBrand: 'Test', branchLocation: 'Test', cohortBatch: 'Test', hireDate: new Date() } });
  admin = null; trainee = testTrainee;
  assert.equal((await actions.getMaterialSignedUrlAction(materialId)).success, false, 'unassigned trainee denied');
  assert.equal((await actions.getMaterialsForMilestoneAction(milestone.id)).success, false);
  assert.equal((await actions.deleteMaterialAction(materialId)).success, false);
  assert.equal((await actions.reorderMaterialsAction(milestone.id, [materialId])).success, false);
  plan = await prisma.trainingPlan.create({ data: { title: 'Material access fixture', roleIdentifier: 'MAT_TEST', createdById: trainer.id } });
  const version = await prisma.planVersion.create({ data: { planId: plan.id, versionNumber: 1, publishedById: trainer.id } });
  await prisma.planNode.create({ data: { planVersionId: version.id, libraryMilestoneId: milestone.id, path: 'TECHNICAL', code: milestone.code, title: milestone.title, description: milestone.description, orderIndex: 1, posX: 0, posY: 0 } });
  await prisma.traineePlanAssignment.create({ data: { traineeId: trainee.id, planVersionId: version.id, assignedById: trainer.id } });
  assert.equal((await actions.getMaterialSignedUrlAction(materialId)).success, true, 'active assigned trainee allowed');
  const list = await actions.getMaterialsForMilestoneAction(milestone.id);
  assert.equal(list.success, true); assert.equal('storagePath' in list.data[0], false);
  await prisma.traineePlanAssignment.updateMany({ where: { traineeId: trainee.id }, data: { status: 'SUPERSEDED' } });
  assert.equal((await actions.getMaterialSignedUrlAction(materialId)).success, false, 'superseded assignment denied');
  admin = trainer; trainee = null; failRemove = true;
  assert.equal((await actions.deleteMaterialAction(materialId)).success, false);
  assert.equal(await prisma.courseMaterial.count({ where: { id: materialId } }), 1, 'storage failure retains metadata');
  failRemove = false;
  assert.equal((await actions.deleteMaterialAction(materialId)).success, true);
  assert.equal(objects.has(storagePath), false);
  assert.equal(await prisma.courseMaterial.count({ where: { id: materialId } }), 0);
  console.log('Material action checks passed with mocked Storage: authorization, bound tickets, object validation, idempotency, one-hour URLs, downloads, active assignments, and retryable deletion.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  Module._load = originalLoad;
  if (testTrainee) await prisma.trainee.delete({ where: { id: testTrainee.id } });
  if (plan) await prisma.trainingPlan.delete({ where: { id: plan.id } });
  if (milestone) await prisma.milestoneDefinition.delete({ where: { id: milestone.id } });
  await prisma.$disconnect();
});
