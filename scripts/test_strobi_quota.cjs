require('tsx/cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const { fork } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');
const originalLoad = Module._load;
Module._load = function(id, ...args) { return id === 'server-only' ? {} : originalLoad.call(this, id, ...args); };
const { reserveStrobiQuota, releaseStrobiQuota, strobiDay } = require('../lib/ai/strobi-quota.ts');
const limits = { trainerDailyLimit: 2, projectDailyLimit: 3, requestTimeoutMs: 1000 };
if (process.env.STROBI_QUOTA_TEST_WORKER === 'true') {
  const db = new PrismaClient();
  process.on('message', async ({ trainerId, limits }) => {
    try { process.send(await reserveStrobiQuota(db, trainerId, limits)); }
    catch { process.send({ error: true }); }
    finally { await db.$disconnect(); process.exit(); }
  });
} else {
  const schema = `strobi_test_${Date.now()}_${process.pid}`;
  const root = new PrismaClient();
  const url = new URL(process.env.DATABASE_URL); url.searchParams.set('schema', schema);
  const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  const db2 = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  function worker(trainerId, overrides = limits) {
    return new Promise((resolve, reject) => {
      const child = fork(__filename, [], { env: { ...process.env, DATABASE_URL: url.toString(), STROBI_QUOTA_TEST_WORKER: 'true' }, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
      let settled = false;
      child.once('message', result => { settled = true; result.error ? reject(new Error('Worker failed')) : resolve(result); });
      child.once('exit', code => { if (!settled) reject(new Error('Worker exited')); });
      child.send({ trainerId, limits: overrides });
    });
  }
  let stage = 'create schema';
  (async () => {
    await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    const sql = fs.readFileSync('prisma/migrations/20261109000000_strobi_quotas/migration.sql', 'utf8').split('ALTER TABLE')[0];
    for (const command of sql.split(';').map(s => s.trim()).filter(Boolean)) {
      await root.$executeRawUnsafe(command.replace(/(TABLE|ON) "(Strobi\w+)"/g, `$1 "${schema}"."$2"`));
    }
    if (process.env.STROBI_CONTEXT_TEST_ONLY !== 'true') {
    // Independent OS processes contend on the same durable lease.
    stage = 'process contention';
    const same = await Promise.all([worker('same'), worker('same')]);
    assert.equal(same.filter(x => x.success).length, 1);
    assert.equal(same.filter(x => x.code === 'BUSY').length, 1);
    const first = same.find(x => x.success).reservation;
    await releaseStrobiQuota(db, first);
    const second = await reserveStrobiQuota(db2, 'same', limits); assert(second.success);
    await releaseStrobiQuota(db, second.reservation);
    assert.equal((await reserveStrobiQuota(db2, 'same', limits)).code, 'DAILY_LIMIT');
    const many = await Promise.all([worker('other-a'), worker('other-b')]);
    assert.equal(many.filter(x => x.success).length, 1);
    assert.equal(many.filter(x => x.code === 'DAILY_LIMIT').length, 1);
    stage = 'caps';
    const totals = await db.strobiDailyQuota.findMany({ where: { scope: 'PROJECT' } });
    assert.equal(totals[0].attempts, 3);
    await db.strobiRequestLease.deleteMany(); await db.strobiDailyQuota.deleteMany();
    stage = 'stale recovery';
    const stale = await reserveStrobiQuota(db, 'stale', limits); assert(stale.success);
    await db.strobiRequestLease.update({ where: { trainerId: 'stale' }, data: { expiresAt: new Date(0) } });
    const replacement = await reserveStrobiQuota(db2, 'stale', limits); assert(replacement.success);
    await releaseStrobiQuota(db, stale.reservation, true);
    assert.equal((await db.strobiRequestLease.findUnique({ where: { trainerId: 'stale' } })).token, replacement.reservation.token);
    assert.equal((await db.strobiDailyQuota.findFirst({ where: { scope: 'PROJECT' } })).attempts, 2);
    await releaseStrobiQuota(db, replacement.reservation, true);
    await releaseStrobiQuota(db, replacement.reservation, true);
    assert.equal((await db.strobiDailyQuota.findFirst({ where: { scope: 'PROJECT' } })).attempts, 1);
    await db.strobiRequestLease.deleteMany(); await db.strobiDailyQuota.deleteMany();
    // Previous calendar-day usage must not consume today's allowance in either process.
    const [{ now }] = await db.$queryRaw`SELECT clock_timestamp() AS now`;
    const yesterday = strobiDay(new Date(now.getTime() - 86400000)).day;
    await db.strobiDailyQuota.createMany({ data: [{ scope: 'TRAINER', subjectId: 'reset', day: yesterday, attempts: 2 }, { scope: 'PROJECT', subjectId: 'strobi', day: yesterday, attempts: 3 }] });
    stage = 'rollover';
    const reset = await worker('reset'); assert(reset.success);
    assert.equal(reset.reservation.day, strobiDay(now).day);
    assert.equal(reset.reservation.usage.trainerRemaining, 1); assert.equal(reset.reservation.usage.projectRemaining, 2);
    assert(new Date(reset.reservation.usage.resetsAt) > now);
    const secured = await root.$queryRaw`SELECT relname, relrowsecurity FROM pg_class JOIN pg_namespace n ON n.oid = relnamespace WHERE n.nspname = 'public' AND relname IN ('StrobiDailyQuota', 'StrobiRequestLease')`;
    assert.equal(secured.length, 2); assert(secured.every(x => x.relrowsecurity));
    const grants = await root.$queryRaw`SELECT grantee FROM information_schema.role_table_grants WHERE table_schema = 'public' AND table_name IN ('StrobiDailyQuota', 'StrobiRequestLease') AND grantee IN ('PUBLIC', 'anon', 'authenticated')`;
    assert.equal(grants.length, 0);
    }
    stage = 'clone service tables';
    // Exercise production context/auth readers and service against isolated real tables.
    await root.$executeRawUnsafe(`CREATE TYPE "${schema}"."LearningPathType" AS ENUM ('MASTER', 'VARIANT', 'INSTANCE')`);
    for (const table of ['AdminUser', 'TrainingPlan', 'LearningPath', 'MilestoneDefinition', 'TraineeProgress', 'StampRevocation']) {
      await root.$executeRawUnsafe(`CREATE TABLE "${schema}"."${table}" (LIKE public."${table}" ${table === "LearningPath" ? "INCLUDING DEFAULTS" : "INCLUDING ALL"})`);
    }
    stage = 'fixture enum conversion';
    await root.$executeRawUnsafe(`ALTER TABLE "${schema}"."LearningPath" ALTER COLUMN "type" TYPE "${schema}"."LearningPathType" USING "type"::text::"${schema}"."LearningPathType"`);
    await db.strobiRequestLease.deleteMany(); await db.strobiDailyQuota.deleteMany();
    stage = 'trainer fixture';
    const trainer = await db.adminUser.create({ data: { employeeId: 'STROBI-FIXTURE', fullName: 'Private trainer name', email: 'fixture@example.invalid', passwordHash: 'unused' } });
    let authenticatedId = trainer.id;
    Module._load = function(id, ...args) {
      if (id === 'server-only') return {};
      if (id === '@/lib/db/prisma') return { prisma: db };
      if (id === '@/lib/auth/session') return { getAdminSession: async () => ({ id: authenticatedId }) };
      return originalLoad.call(this, id, ...args);
    };
    const { generateStrobiProposal, strobiDependencies } = require('../lib/ai/strobi-service.ts');
    stage = 'context fixtures';
    const reusable = await db.trainingPlan.create({ data: { title: 'Finance track', roleIdentifier: 'FINANCE', createdById: trainer.id, learningPath: { create: { type: 'VARIANT', title: 'Finance track', targetDepartment: 'Finance Department', targetPosition: 'Accounting Assistant' } } } });
    const individual = await db.trainingPlan.create({ data: { title: 'PRIVATE TRAINEE NAME', roleIdentifier: 'PRIVATE', createdById: trainer.id, learningPath: { create: { type: 'INSTANCE', title: 'PRIVATE TRAINEE NAME' } } } });
    const archived = await db.trainingPlan.create({ data: { title: 'Archived', roleIdentifier: 'OLD', status: 'ARCHIVED', createdById: trainer.id } });
    stage = 'context reads';
    assert.deepEqual(await strobiDependencies.getContext(reusable.id), { planTitle: 'Finance track', department: 'Finance Department', position: 'Accounting Assistant' });
    assert.deepEqual(await strobiDependencies.getContext(individual.id), {});
    assert.equal(await strobiDependencies.getContext(archived.id), null);
    const before = await Promise.all([db.trainingPlan.count(), db.milestoneDefinition.count(), db.traineeProgress.count(), db.stampRevocation.count()]);
    const dependencies = { ...strobiDependencies,
      getConfiguration: () => ({ available: true, configuration: { ...limits, enabled: 'true', apiKey: 'fake-key', model: 'test-model' } }),
      provider: async (_, body) => {
        const context = JSON.parse(JSON.parse(body).contents[0].parts[0].text);
        assert.equal(context.planTitle, 'Finance track'); assert(!JSON.stringify(context).includes(trainer.fullName));
        return { title: 'Reconcile accounts', description: 'Reconcile sample ledger entries and explain discrepancies to the trainer.', suggestedPillar: 'TECHNICAL', pillarRationale: 'Demonstrates role skills.' };
      },
    };
    const input = { prompt: 'Create accounting practice', selectedPillar: 'TECHNICAL', planId: reusable.id };
    for (const planId of ['missing', archived.id]) assert.equal((await generateStrobiProposal({ ...input, planId }, undefined, dependencies)).code, 'INACCESSIBLE_PLAN');
    authenticatedId = 'deleted-trainer';
    assert.equal((await generateStrobiProposal(input, undefined, dependencies)).code, 'UNAUTHORIZED');
    authenticatedId = trainer.id;
    assert.equal(await db.strobiDailyQuota.count(), 0);
    stage = 'real service generation';
    const generated = await generateStrobiProposal(input, undefined, dependencies); assert(generated.success);
    assert.deepEqual(await Promise.all([db.trainingPlan.count(), db.milestoneDefinition.count(), db.traineeProgress.count(), db.stampRevocation.count()]), before);
    assert.equal(await db.strobiRequestLease.count(), 0);
    assert.equal((await db.strobiDailyQuota.findFirst({ where: { scope: 'TRAINER' } })).attempts, 1);
    console.log('PASS Strobi real DB service: persisted trainer authorization, archived/missing context rejection, private-instance title omission, safe context and no domain mutations.');
    if (process.env.STROBI_CONTEXT_TEST_ONLY !== 'true') console.log('PASS Strobi database quotas: independent-process contention, trainer/project caps, stale recovery, token-safe release, one-time refunds, day rollover and private-table RLS.');
  })().catch(error => { console.error('FAIL Strobi quota assertions at ' + stage + ' (' + (error.meta?.code || error.code || error.name) + ')'); if (error.name === 'AssertionError') console.error(error.message);  process.exitCode = 1; }).finally(async () => {
    await db.$disconnect(); await db2.$disconnect();
    await root.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await root.$disconnect(); Module._load = originalLoad;
  });
}
