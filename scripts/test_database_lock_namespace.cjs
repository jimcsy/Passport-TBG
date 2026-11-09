require('tsx/cjs');
const assert = require('node:assert/strict');
const { prisma } = require('../lib/db/prisma.ts');
const { verifyAssignedMilestones } = require('../lib/db/repositories/verification.ts');
const { revokeAward } = require('../lib/db/repositories/stamp-revocation.ts');
const { ensureTraineePathInstance } = require('../lib/db/repositories/learning-paths.ts');
const { createInstanceForVersion } = require('../lib/db/services/learning-paths.ts');
const prefix = `NS54-${Date.now()}`;
let trainer, trainee, plan;
const restricted = { $transaction: (callback, options) => prisma.$transaction(async tx => {
  // LOCAL cannot leak onto a transaction-pooled backend after commit/rollback.
  await tx.$executeRawUnsafe('SET LOCAL search_path TO pg_catalog');
  const rows = await tx.$queryRaw`SELECT to_regclass('"Trainee"') IS NULL AS hidden`;
  assert(rows[0].hidden);
  return callback(tx);
}, options) };
(async () => {
  trainer = await prisma.adminUser.create({ data: { employeeId: prefix, fullName: 'Namespace fixture trainer', email: `${prefix}@example.invalid`, passwordHash: 'unused', role: 'TRAINER' } });
  trainee = await prisma.trainee.create({ data: { traineeCode: prefix, fullName: 'Namespace fixture trainee', email: `${prefix}-trainee@example.invalid`, restaurantBrand: 'Test', branchLocation: 'Test', cohortBatch: 'Test', hireDate: new Date() } });
  plan = await prisma.trainingPlan.create({ data: { title: 'Namespace fixture', roleIdentifier: prefix, createdById: trainer.id, status: 'PUBLISHED' } });
  const path = await prisma.learningPath.create({ data: { planId: plan.id, type: 'INSTANCE', title: plan.title, traineeId: trainee.id } });
  const version = await prisma.planVersion.create({ data: { planId: plan.id, versionNumber: 1, status: 'PUBLISHED', publishedById: trainer.id } });
  const node = await prisma.planNode.create({ data: { planVersionId: version.id, code: prefix, title: 'Namespace competency', description: 'Demonstrate the fixture skill for trainer verification.', path: 'ONBOARDING', orderIndex: 1, posX: 0, posY: 0 } });
  await prisma.traineePlanAssignment.create({ data: { traineeId: trainee.id, planVersionId: version.id, assignedById: trainer.id } });
  assert.equal((await ensureTraineePathInstance(trainee.id, restricted)).id, path.id);
  await restricted.$transaction(async tx => { assert.equal((await createInstanceForVersion(tx, trainee.id, version.id, trainer.id)).id, version.id); }, { timeout: 60000 });
  await verifyAssignedMilestones([trainee.id], node.id, trainer.id, 'Original fixture award', restricted);
  const award = await prisma.traineeProgress.findUniqueOrThrow({ where: { traineeId_planNodeId: { traineeId: trainee.id, planNodeId: node.id } } });
  assert.equal(award.status, 'VERIFIED'); assert(award.verificationHash);
  await verifyAssignedMilestones([trainee.id], node.id, trainer.id, 'Repeat does not replace stamp', restricted);
  assert.deepEqual(await prisma.traineeProgress.findUnique({ where: { id: award.id } }), award);
  assert((await revokeAward({ traineeId: trainee.id, progressId: award.id, expectedHash: award.verificationHash, reason: 'Namespace fixture revocation' }, trainer.id, restricted)).success);
  const audit = await prisma.stampRevocation.findFirstOrThrow({ where: { traineeId: trainee.id } }); assert.equal(audit.verificationHash, award.verificationHash);
  assert.equal(await prisma.planVersion.count({ where: { planId: plan.id } }), 1);
  console.log('PASS schema-qualified row locks: instance reads, verification/idempotent hash and audited revocation work with a restricted LOCAL search_path; transaction state cannot leak.');
})().catch(() => { console.error('FAIL row-lock namespace regression (connection details suppressed)'); process.exitCode = 1; }).finally(async () => { if (trainee) await prisma.trainee.delete({ where: { id: trainee.id } }); if (plan) await prisma.trainingPlan.delete({ where: { id: plan.id } }); if (trainer) await prisma.adminUser.delete({ where: { id: trainer.id } }); await prisma.$disconnect(); });
