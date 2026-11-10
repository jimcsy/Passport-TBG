// Actual JWT validation, production route/service/repository/store, isolated DB.
// Only provider/config are replaced. No live Gemini call or application writes.
require('tsx/cjs');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { PrismaClient } = require('@prisma/client');
const source = new URL(process.env.DIRECT_URL || 'http://missing.invalid');
if (!process.env.DIRECT_URL || source.port === '6543' || source.searchParams.get('pgbouncer') === 'true') throw Error('DIRECT_URL direct/session endpoint required.');
source.searchParams.set('connection_limit', '1'); source.searchParams.set('schema', 'public');
const root = new PrismaClient({ datasources: { db: { url: source.toString() } } });
const schema = `strobi_tips_access_${Date.now()}_${process.pid}`;
const scratch = new URL(source); scratch.searchParams.set('schema', schema);
const db = new PrismaClient({ datasources: { db: { url: scratch.toString() } }, log: [{ emit: 'event', level: 'query' }] });
let recordQueries = false; const authQueries = [];
db.$on('query', event => { if (recordQueries) authQueries.push(event.query); });
const original = Module._load;
let cookieToken, generate, dependencies;
Module._load = function(id, ...args) {
  if (id === 'server-only') return {};
  if (id === 'next/headers') return { cookies: () => ({ get: name => name === 'beat_trainee_session' && cookieToken ? { value: cookieToken } : undefined }) };
  if (id === './strobi-tips-db' || id === '@/lib/ai/strobi-tips-db') return { strobiTipsDb: db };
  if (id === '@/lib/ai/strobi-tips-service' && generate) return { generateStrobiTip: (input, signal) => generate(input, signal, dependencies) };
  return original.call(this, id, ...args);
};
const { encryptSession } = require('../lib/auth/session.ts');
const { resolveStrobiTipAccess, readStrobiChatChoices } = require('../lib/db/repositories/strobi-tips.ts');
const service = require('../lib/ai/strobi-tips-service.ts'); generate = service.generateStrobiTip;
const { getTraineePassportData } = require('../lib/db/repositories/trainee.ts');
const { POST } = require('../app/api/trainee/strobi/route.ts');
const { GET: contextGET } = require('../app/api/trainee/strobi/context/route.ts');
const { createStrobiTipCacheKey } = require('../lib/ai/strobi-tips-store.ts');
const domain = ['AdminUser','Trainee','MilestoneDefinition','TrainingPlan','PlanVersion','PlanNode','PlanEdge','TraineePlanAssignment','TraineeProgress','CourseMaterial','StampRevocation','StampNotificationRead','ReviewNotificationRead','TraineeContentView','LearningPath'];
const operational = ['StrobiDailyQuota','StrobiRequestLease','StrobiActorRequestLease','StrobiTipCache','StrobiTipCacheLease'];
const config = { enabled: 'true', apiKey: 'fake-key-for-isolated-test', model: 'test-model', traineeDailyLimit: 3, traineeProjectDailyLimit: 40, projectDailyLimit: 50, requestTimeoutMs: 1000 };
const tip = { answer: 'Practice explaining one routine task clearly.', steps: ['State its goal.', 'Check understanding with a colleague.'] };
let created = false, stage = 'schema setup', providerCalls = 0;
async function snapshot() {
  const query = domain.map(table => `'${table}', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::jsonb) FROM "${schema}"."${table}" t)`).join(',');
  return JSON.stringify((await root.$queryRawUnsafe(`SELECT jsonb_build_object(${query}) AS data`))[0].data);
}
async function clearOperations() { for (const table of operational) await db[table[0].toLowerCase()+table.slice(1)].deleteMany(); }
async function signed(trainee, expires = '1h') {
  return encryptSession({ portal: 'trainee', id: trainee.id, traineeCode: trainee.traineeCode, fullName: 'PRIVATE_TRAINEE_SENTINEL', email: 'private@example.invalid' }, expires);
}
async function call(token, nodeId, questionId = 'EXPLAIN_MILESTONE', preserve = true) {
  cookieToken = token; const before = preserve ? await snapshot() : null;
  const response = await POST(new Request('http://localhost/api/trainee/strobi', { method: 'POST', headers: { origin: 'http://localhost', 'content-type': 'application/json' }, body: JSON.stringify({ nodeId, questionId }) }));
  assert(response.headers.get('cache-control').includes('private')); assert(response.headers.get('cache-control').includes('no-store'));
  const result = await response.json();
  if (preserve) assert.equal(await snapshot(), before);
  return { status: response.status, result };
}
(async () => {
  await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`); created = true;
  for (const table of [...domain, ...operational]) await root.$executeRawUnsafe(`CREATE TABLE "${schema}"."${table}" (LIKE public."${table}" INCLUDING ALL)`);
  const trainer = await db.adminUser.create({ data: { employeeId: 'TIPS-AUTH', email: 'trainer@example.invalid', fullName: 'PRIVATE_TRAINER_SENTINEL', passwordHash: 'unused' } });
  const trainees = await Promise.all(['A','B','EMPTY'].map(code => db.trainee.create({ data: { traineeCode: code, fullName: 'PRIVATE_TRAINEE_SENTINEL', email: 'private@example.invalid', restaurantBrand: 'Test', branchLocation: 'Test', cohortBatch: 'Test', hireDate: new Date() } })));
  const [a,b,empty] = trainees, tokenA = await signed(a), tokenB = await signed(b);
  const plan = await db.trainingPlan.create({ data: { title: 'PRIVATE_PLAN_SENTINEL', roleIdentifier: 'TEST', status: 'PUBLISHED', createdById: trainer.id } });
  const versions = [];
  for (let i=0;i<3;i++) versions.push(await db.planVersion.create({ data: { planId: plan.id, versionNumber: i+1, publishedById: trainer.id } }));
  const nodeData = { path: 'COMMUNICATION', title: 'Practice active listening', description: 'Explain a routine task clearly and check understanding with a colleague.', orderIndex: 1, posX: 0, posY: 0 };
  const available = await db.planNode.create({ data: { ...nodeData, code: 'AVAILABLE', planVersionId: versions[1].id } });
  const locked = await db.planNode.create({ data: { ...nodeData, title: 'Locked communication skill', code: 'LOCKED', planVersionId: versions[1].id } });
  const verified = await db.planNode.create({ data: { ...nodeData, title: 'Verified communication skill', code: 'VERIFIED', planVersionId: versions[1].id } });
  const inReview = await db.planNode.create({ data: { ...nodeData, title: 'Communication skill in review', code: 'REVIEW', planVersionId: versions[1].id } });
  const other = await db.planNode.create({ data: { ...nodeData, code: 'AVAILABLE', planVersionId: versions[2].id } });
  const archived = await db.planNode.create({ data: { ...nodeData, code: 'ARCHIVED', planVersionId: versions[0].id } });
  const older = await db.planNode.create({ data: { ...nodeData, code: 'OLDER', planVersionId: versions[0].id } });
  await db.planEdge.create({ data: { planVersionId: versions[1].id, sourceNodeId: locked.id, targetNodeId: available.id } });
  const assignmentA = await db.traineePlanAssignment.create({ data: { traineeId: a.id, planVersionId: versions[1].id, assignedById: trainer.id } });
  await db.traineePlanAssignment.create({ data: { traineeId: a.id, planVersionId: versions[0].id, assignedById: trainer.id, assignedAt: new Date(Date.now()-86400000) } });
  await db.traineePlanAssignment.create({ data: { traineeId: b.id, planVersionId: versions[2].id, assignedById: trainer.id } });
  await db.traineeProgress.createMany({ data: [
    { traineeId: a.id, planNodeId: locked.id, status: 'LOCKED' },
    { traineeId: a.id, planNodeId: verified.id, status: 'VERIFIED', verifiedBy: trainer.id, verificationHash: 'preserved-hash', verifiedAt: new Date(), traineeNote: 'PRIVATE_REFLECTION_SENTINEL', trainerNote: 'PRIVATE_FEEDBACK_SENTINEL' },
    { traineeId: a.id, planNodeId: inReview.id, status: 'READY_FOR_REVIEW', requestedAt: new Date(), traineeNote: 'PRIVATE_REFLECTION_SENTINEL' },
    { traineeId: a.id, planNodeId: archived.id, status: 'VERIFIED', isArchived: true, archivedReason: 'REMOVED_FROM_UPDATED_PLAN', verificationHash: 'preserved-archived-hash' },
  ] });
  await db.stampNotificationRead.create({ data: { traineeId: a.id, verificationHash: 'preserved-hash' } });
  dependencies = { ...service.strobiTipsDependencies, getConfiguration: () => ({ available: true, configuration: config }), provider: async (_, body) => {
    providerCalls++;
    const data = JSON.parse(JSON.parse(body).contents[0].parts[0].text);
    assert.deepEqual(Object.keys(data), ['questionId','milestone']);
    assert.deepEqual(Object.keys(data.milestone), ['title','description','pillar']);
    assert(!JSON.stringify(data).includes('PRIVATE_'));
    return tip;
  } };
  stage = 'real JWT and access rejections';
  for (const token of [undefined, 'invalid.jwt.value', await encryptSession({ portal:'trainer', id:trainer.id, employeeId:'TIPS-AUTH', fullName:'Trainer', role:'TRAINER' }, '1h'), await signed(a,'0s'), await signed({ id:'deleted', traineeCode:'deleted' })]) {
    assert.equal((await call(token, available.id)).status, 401);
  }
  for (const [nodeId,status,code] of [[locked.id,403,'LOCKED_MILESTONE'],[archived.id,404,'ARCHIVED_MILESTONE'],[other.id,404,'INACCESSIBLE_MILESTONE'],[older.id,404,'INACCESSIBLE_MILESTONE'],['missing',404,'INACCESSIBLE_MILESTONE']]) {
    const response = await call(tokenA,nodeId); assert.equal(response.status,status); assert.equal(response.result.code,code);
  }
  assert.equal((await call(await signed(empty),available.id)).result.code,'INACCESSIBLE_MILESTONE');
  assert.equal(providerCalls,0); assert.equal(await db.strobiDailyQuota.count(),0);
  stage='read-only context endpoint'; cookieToken=tokenA;
  const stateBefore=await snapshot();
  const contextResponse=await contextGET(new Request('http://localhost/api/trainee/strobi/context'));
  assert.equal(contextResponse.status,200);assert(contextResponse.headers.get('cache-control').includes('no-store'));
  const chatState=await contextResponse.json();
  assert.deepEqual(Object.keys(chatState).sort(),['assignmentKey','availability','expiresAt','milestones','sessionKey']);
  assert.equal(chatState.milestones.find(node=>node.id===locked.id).status,'LOCKED');
  assert(!chatState.milestones.some(node=>[other.id,older.id,archived.id].includes(node.id)));
  for(const node of chatState.milestones) assert.deepEqual(Object.keys(node).sort(),['id','isArchived','pillar','revision','status','title']);
  assert.equal((await readStrobiChatChoices(a.id,archived.id,db)).milestones.find(node=>node.id===archived.id).status,'ARCHIVED');
  assert(!(await readStrobiChatChoices(a.id,other.id,db)).milestones.some(node=>node.id===other.id));
  assert.equal((await contextGET(new Request('http://localhost/api/trainee/strobi/context',{headers:{'sec-fetch-site':'cross-site'}}))).status,403);
  cookieToken=undefined;assert.equal((await contextGET(new Request('http://localhost/api/trainee/strobi/context'))).status,401);
  assert.equal(await snapshot(),stateBefore);assert.equal(await db.strobiDailyQuota.count(),0);
  recordQueries=true; await resolveStrobiTipAccess(a.id,available.id,db); recordQueries=false;
  for (const field of ['"fullName"','"email"','"traineeNote"','"trainerNote"','"verificationHash"','CourseMaterial']) assert(!authQueries.join('\n').includes(field));
  const passport = await getTraineePassportData(a.id,db);
  const shown = passport.paths.flatMap(p=>p.milestones);
  assert.equal(shown.find(m=>m.id===locked.id).status,'LOCKED'); assert.equal(shown.find(m=>m.id===available.id).status,'IN_PROGRESS');
  for (const node of [available,verified,inReview]) assert((await resolveStrobiTipAccess(a.id,node.id,db)).allowed);
  console.log('PASS actual signed JWT role/expiry/deleted-account checks and latest-assignment/locked/archived/foreign access match module status without private-field reads');

  stage = 'real cache and persistence boundary';
  assert.equal((await call(tokenA,available.id)).result.source,'GENERATED'); assert.equal(providerCalls,1);
  assert.equal(await db.strobiTipCache.count(),1); assert.equal(await db.strobiActorRequestLease.count(),0);
  assert.equal((await call(tokenB,other.id)).result.source,'REUSED'); assert.equal(providerCalls,1);
  // Cache existence must not grant access to an identical foreign node.
  assert.equal((await call(tokenA,other.id)).result.code,'INACCESSIBLE_MILESTONE');
  assert.equal((await call(undefined,available.id)).status,401);
  const key = createStrobiTipCacheKey({ title:available.title, description:available.description, pillar:available.path },'EXPLAIN_MILESTONE',config.model);
  const day = (await db.strobiDailyQuota.findFirst()).day;
  await db.strobiDailyQuota.updateMany({ where:{ scope:'PROJECT' }, data:{ attempts:50 } });
  await db.strobiDailyQuota.updateMany({ where:{ scope:'TRAINEE_PROJECT' }, data:{ attempts:40 } });
  await db.strobiDailyQuota.create({ data:{ scope:'TRAINEE',subjectId:b.id,day,attempts:3 } });
  assert.equal((await call(tokenB,other.id)).result.source,'REUSED'); assert.equal(providerCalls,1);
  const limited = await call(tokenA,available.id,'SHOW_EXAMPLE'); assert.equal(limited.result.source,'PREWRITTEN'); assert.equal(limited.result.reason,'DAILY_LIMIT');
  assert.equal(providerCalls,1); assert.deepEqual((await db.strobiTipCache.findUnique({ where:{key} })).tip,tip);
  await clearOperations();
  for (const node of [verified,inReview]) assert.equal((await call(tokenA,node.id)).result.source,'GENERATED');
  console.log('PASS actual generated/cache/prewritten route responses, cross-node/trainee zero-call reuse at all exhausted caps and exact learning/review/stamp/hash preservation');

  stage = 'real pre-dispatch stale/refund'; await clearOperations();
  const baseline = await snapshot(); const originalReserve=dependencies.reserve;
  dependencies={...dependencies,reserve:async(...args)=>{const result=await originalReserve(...args);await db.planNode.update({where:{id:available.id},data:{description:'Changed competency description and verification criteria.'}});return result;}};
  const stale=await call(tokenA,available.id,'EXPLAIN_MILESTONE',false);assert.equal(stale.result.code,'STALE_CONTEXT');
  assert.equal((await db.strobiDailyQuota.findFirst({where:{scope:'PROJECT'}})).attempts,0);
  assert.equal(await db.strobiActorRequestLease.count(),0);assert.equal(await db.strobiTipCache.count(),0);
  await db.planNode.update({where:{id:available.id},data:{description:available.description}});assert.equal(await snapshot(),baseline);
  dependencies={...dependencies,reserve:originalReserve};
  stage = 'real post-dispatch access loss';
  const originalProvider=dependencies.provider;
  dependencies={...dependencies,provider:async()=>{providerCalls++;await db.traineeProgress.create({data:{traineeId:a.id,planNodeId:available.id,status:'LOCKED'}});return tip;}};
  const denied=await call(tokenA,available.id,'PRACTICE_ACTIVITY',false);assert.equal(denied.result.code,'LOCKED_MILESTONE');assert.equal(await db.strobiTipCache.count(),0);
  assert.equal((await db.strobiDailyQuota.findFirst({where:{scope:'PROJECT'}})).attempts,1);
  await db.traineeProgress.delete({where:{traineeId_planNodeId:{traineeId:a.id,planNodeId:available.id}}});assert.equal(await snapshot(),baseline);
  await clearOperations();
  dependencies={...dependencies,provider:async()=>{providerCalls++;await db.traineePlanAssignment.update({where:{id:assignmentA.id},data:{status:'SUPERSEDED'}});return tip;}};
  assert.equal((await call(tokenA,available.id,'SHOW_EXAMPLE',false)).result.code,'INACCESSIBLE_MILESTONE');assert.equal(await db.strobiTipCache.count(),0);
  assert.equal((await resolveStrobiTipAccess(a.id,archived.id,db)).code,'ARCHIVED_MILESTONE');
  assert.equal((await db.strobiDailyQuota.findFirst({where:{scope:'PROJECT'}})).attempts,1);
  await db.traineePlanAssignment.update({where:{id:assignmentA.id},data:{status:'ACTIVE'}});assert.equal(await snapshot(),baseline);
  await clearOperations();
  dependencies={...dependencies,provider:async()=>{providerCalls++;cookieToken=await signed(a,'0s');return tip;}};
  assert.equal((await call(tokenA,available.id,'PREPARE_FOR_REVIEW')).result.code,'UNAUTHORIZED');assert.equal(await db.strobiTipCache.count(),0);
  assert.equal((await db.strobiDailyQuota.findFirst({where:{scope:'PROJECT'}})).attempts,1);
  dependencies={...dependencies,provider:originalProvider};
  console.log('PASS real pre-dispatch content-change refund and counted post-dispatch lock/assignment/JWT invalidation with no stale cache publication');
})().catch(error=>{
  console.error(`FAIL trainee API real auth/DB at ${stage} (${error.code||error.name}); credentials/context/raw diagnostics omitted.`);
  console.error(String(error.stack||'').split('\n').filter(line=>line.includes('scripts/test_strobi_tips_access_db.cjs:')).join('\n'));
  process.exitCode=1;
}).finally(async()=>{
  await db.$executeRawUnsafe('RESET search_path').catch(()=>{});await db.$disconnect();
  if(created)await root.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  const [{visible}]=await root.$queryRaw`SELECT to_regclass('"Trainee"') IS NOT NULL AS visible`;assert(visible);
  await root.$disconnect();Module._load=original;
  console.log('Isolated auth fixtures removed; direct/session namespace restored; no live Gemini call.');
});
