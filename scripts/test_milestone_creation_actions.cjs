// node --env-file=.env scripts/test_milestone_creation_actions.cjs
const assert = require('node:assert/strict');
const Module = require('node:module');
require('tsx/cjs');
const { prisma } = require('../lib/db/prisma.ts');
const sessions = require('../lib/auth/session.ts');
let admin = null;
const refreshed = [];
const originalLoad = Module._load;
Module._load = function(request, parent, main) {
  if (request === '@/lib/auth/session') return { ...sessions, getAdminSession: async () => admin };
  if (request === 'next/cache') return { revalidatePath: value => refreshed.push(value) };
  if (request === '@/lib/supabase/server') return { MATERIAL_BUCKET: 'course-materials', getSupabaseAdmin: () => { throw new Error('Storage writes are outside the creation boundary test'); } };
  return originalLoad.call(this, request, parent, main);
};
const { createCustomLibraryMilestoneAction: create } = require('../lib/actions/plans.ts');
const { getMaterialsForMilestoneAction } = require('../lib/actions/materials.ts');
const prefix = `TC1-${String(Date.now()).slice(-8)}`;
let stage = 'authentication';
(async () => {
  const input = { code: `${prefix}-NEW`, title: 'Safe milestone creation', description: 'A fixture competency for the validated shared milestone boundary.', path: 'TECHNICAL' };
  assert.equal((await create(input)).success, false);
  assert.equal(await prisma.milestoneDefinition.count({ where: { code: input.code } }), 0);
  assert.equal(refreshed.length, 0);
  admin = { id: 'tc01-action-trainer', employeeId: 'TC01', fullName: 'Creation action fixture', role: 'TRAINER', portal: 'trainer' };
  stage = 'server validation';
  for (const invalid of [null, {}, { ...input, code: 'A' }, { ...input, code: 'A'.repeat(26) }, { ...input, code: 'INVALID/CODE' }, { ...input, title: ' ' }, { ...input, title: 'A'.repeat(101) }, { ...input, description: 'short' }, { ...input, description: 'A'.repeat(501) }, { ...input, path: 'INVALID' }]) {
    const result = await create(invalid); assert.equal(result.success, false); assert.ok(result.fieldErrors);
  }
  assert.equal(await prisma.milestoneDefinition.count({ where: { code: input.code } }), 0);
  assert.equal(refreshed.length, 0);
  console.log('PASS: unauthenticated and invalid server requests cannot create milestones or invalidate successful-save views');

  stage = 'existing content protection';
  for (const isStandard of [true, false]) {
    const original = await prisma.milestoneDefinition.create({ data: { ...input, code: `${prefix}-${isStandard ? 'STANDARD' : 'CUSTOM'}`, isStandard } });
    const result = await create({ ...input, code: ` ${original.code.toLowerCase()} `, title: 'Attempted overwrite', description: 'This must not replace any existing milestone details.', path: 'COMMUNICATION' });
    assert.equal(result.success, false); assert.ok(result.fieldErrors.code);
    assert.deepEqual(await prisma.milestoneDefinition.findUniqueOrThrow({ where: { id: original.id } }), original);
  }
  assert.equal(refreshed.length, 0);
  console.log('PASS: duplicate codes cannot change canonical or custom definitions, including normalized code matches');

  stage = 'real persisted identity';
  const result = await create({ ...input, code: ` ${input.code.toLowerCase()} `, title: ` ${input.title} `, description: ` ${input.description} `, isStandard: true });
  assert.equal(result.success, true); assert.ok(result.data.id); assert.equal(result.data.id.startsWith('custom-def-'), false);
  const stored = await prisma.milestoneDefinition.findUniqueOrThrow({ where: { id: result.data.id } });
  assert.equal(stored.code, input.code); assert.equal(stored.title, input.title); assert.equal(stored.description, input.description); assert.equal(stored.isStandard, false);
  const materials = await getMaterialsForMilestoneAction(stored.id);
  assert.equal(materials.success, true); assert.deepEqual(materials.data, []);
  assert.equal((await create(input)).success, false);
  assert.equal(await prisma.milestoneDefinition.count({ where: { code: input.code } }), 1);
  console.log('PASS: successful creation returns a real saved custom definition ID accepted by the existing material access flow; retry cannot overwrite it');

  stage = 'simultaneous duplicate requests';
  const code = `${prefix}-RACE`;
  const candidates = await Promise.all([create({ ...input, code, title: 'Concurrent candidate one' }), create({ ...input, code, title: 'Concurrent candidate two' })]);
  const winners = candidates.filter(item => item.success);
  assert.equal(winners.length, 1); assert.equal(candidates.filter(item => !item.success).length, 1);
  assert.ok(candidates.find(item => !item.success).fieldErrors.code);
  assert.equal(await prisma.milestoneDefinition.count({ where: { code } }), 1);
  const winner = await prisma.milestoneDefinition.findUniqueOrThrow({ where: { code } });
  assert.equal(winner.id, winners[0].data.id); assert.equal(winner.title, winners[0].data.title);
  assert.equal(refreshed.length, 2);
  console.log('PASS: simultaneous requests produce one immutable winner and one actionable conflict, with no duplicate rows');
})().catch(error => { console.error(`Milestone creation action check failed at ${stage}: ${String(error.message || error.name).replace(/(?:postgres(?:ql)?|https?):\/\/\S+/g, '[URL]').slice(0, 1400)}`); process.exitCode = 1; }).finally(async () => {
  Module._load = originalLoad;
  await prisma.milestoneDefinition.deleteMany({ where: { code: { startsWith: prefix } } });
  await prisma.$disconnect();
});
