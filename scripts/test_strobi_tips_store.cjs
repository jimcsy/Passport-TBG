// Real DB, isolated schema, independent OS processes; never sends a provider request.
require('tsx/cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const { fork } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const originalLoad = Module._load;
Module._load = function(id, ...args) { return id === 'server-only' ? {} : originalLoad.call(this, id, ...args); };
const store = require('../lib/ai/strobi-tips-store.ts');
const trainer = require('../lib/ai/strobi-quota.ts');
const limits = { traineeDailyLimit: 3, traineeProjectDailyLimit: 40, projectDailyLimit: 50, requestTimeoutMs: 1000 };
const trainerLimits = { trainerDailyLimit: 10, projectDailyLimit: 50, requestTimeoutMs: 1000 };
const context = { title: 'Practice active listening', description: 'Explain a routine task clearly and check understanding with a colleague.', pillar: 'COMMUNICATION' };
const tip = { answer: 'Practice explaining one routine task clearly.', steps: ['State the goal.', 'Check understanding with your colleague.'] };
const key = (suffix = '') => store.createStrobiTipCacheKey({ ...context, title: context.title + suffix }, 'EXPLAIN_MILESTONE', 'test-model');

if (process.env.STROBI_TIPS_DB_WORKER === 'true') {
  const db = new PrismaClient();
  process.once('message', async ({ role, id, cacheKey }) => {
    try {
      const result = role === 'TRAINER' ? await trainer.reserveStrobiQuota(db, id, trainerLimits) : await store.reserveStrobiTip(db, id, cacheKey, limits);
      process.send({ result });
    } catch (error) { process.send({ error: error.code || error.name }); }
    finally { await db.$executeRawUnsafe('RESET search_path').catch(() => {}); await db.$disconnect(); process.exit(); }
  });
} else {
  if (!process.env.DIRECT_URL) throw new Error('DIRECT_URL direct/session endpoint required.');
  const source = new URL(process.env.DIRECT_URL);
  if (source.port === '6543' || source.searchParams.get('pgbouncer') === 'true') throw new Error('Transaction-pooled URL is not allowed for isolated schema tests.');
  source.searchParams.set('connection_limit', '1'); source.searchParams.set('schema', 'public');
  const root = new PrismaClient({ datasources: { db: { url: source.toString() } } });
  const schema = `strobi_tips_test_${Date.now()}_${process.pid}`;
  const scratch = new URL(source); scratch.searchParams.set('schema', schema);
  const db = new PrismaClient({ datasources: { db: { url: scratch.toString() } } });
  const children = new Set();
  let stage = 'schema creation', created = false;
  const tables = ['StrobiTipCache', 'StrobiTipCacheLease', 'StrobiActorRequestLease', 'StrobiRequestLease', 'StrobiDailyQuota'];
  function statements(sql) {
    const blocks = [];
    const plain = sql.replace(/DO \$\$[\s\S]*?\$\$;/g, block => { blocks.push(block); return ''; });
    return [...plain.split(';').map(x => x.trim()).filter(x => x && !/^(BEGIN|COMMIT)$/i.test(x)), ...blocks];
  }
  async function migrate(path) {
    await root.$transaction(async tx => {
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
      for (const sql of statements(fs.readFileSync(path, 'utf8')))
        await tx.$executeRawUnsafe(sql.replaceAll('public.', `"${schema}".`));
    }, { timeout: 30000 });
  }
  function worker(role, id, cacheKey = key(id)) {
    return new Promise((resolve, reject) => {
      const child = fork(__filename, [], { env: { ...process.env, DATABASE_URL: scratch.toString(), STROBI_TIPS_DB_WORKER: 'true' }, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
      children.add(child); let message;
      const timer = setTimeout(() => { child.kill('SIGTERM'); reject(Object.assign(new Error('Worker deadline exceeded'), { code: 'WORKER_TIMEOUT' })); }, 60000);
      child.once('message', value => { message = value; });
      child.once('error', () => { clearTimeout(timer); children.delete(child); reject(new Error('Worker could not start')); });
      child.once('exit', code => {
        clearTimeout(timer); children.delete(child);
        if (code || !message || message.error) reject(Object.assign(new Error('Worker database check failed'), { code: /^[a-z0-9_]+$/i.test(message?.error || '') ? message.error : 'WORKER_EXIT' }));
        else resolve(message.result);
      });
      child.send({ role, id, cacheKey });
    });
  }
  // Bound fixture connections on a shared free-tier DB; each batch still races
  // independent OS processes on the same durable locks and exact cap boundary.
  async function race(jobs) {
    const output = [];
    for (let i = 0; i < jobs.length; i += 3) output.push(...await Promise.all(jobs.slice(i, i + 3).map(job => worker(...job))));
    return output;
  }
  const reset = async () => { for (const table of tables) await db[table[0].toLowerCase() + table.slice(1)].deleteMany(); };
  const attempts = async scope => (await db.strobiDailyQuota.findFirst({ where: { scope } }))?.attempts ?? 0;
  async function seed(day, project, aggregate, personalId, personal = 0) {
    await db.strobiDailyQuota.createMany({ data: [
      { scope: 'PROJECT', subjectId: 'strobi', day, attempts: project },
      { scope: 'TRAINEE_PROJECT', subjectId: 'strobi', day, attempts: aggregate },
      ...(personalId ? [{ scope: 'TRAINEE', subjectId: personalId, day, attempts: personal }] : []),
    ] });
  }
  (async () => {
    await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`); created = true;
    await migrate('prisma/migrations/20261109000000_strobi_quotas/migration.sql');
    const [{ now }] = await root.$queryRaw`SELECT clock_timestamp() AS now`;
    const { day } = trainer.strobiDay(now);
    const legacy = await trainer.reserveStrobiQuota(db, 'legacy-trainer', trainerLimits);
    assert(legacy.success);
    const before = JSON.stringify(await Promise.all([db.strobiDailyQuota.findMany({ orderBy: { scope: 'asc' } }), db.strobiRequestLease.findMany()]));
    stage = 'additive migration preservation';
    await migrate('prisma/migrations/20261110000000_strobi_trainee_cache/migration.sql');
    assert.equal(JSON.stringify(await Promise.all([db.strobiDailyQuota.findMany({ orderBy: { scope: 'asc' } }), db.strobiRequestLease.findMany()])), before);
    assert.equal((await trainer.reserveStrobiQuota(db, 'legacy-trainer', trainerLimits)).code, 'BUSY');
    await trainer.releaseStrobiQuota(db, legacy.reservation, true);
    await trainer.releaseStrobiQuota(db, legacy.reservation, true);
    assert.equal(await attempts('PROJECT'), 0);
    console.log('PASS additive migration preserves trainer counters/active tokens and old releases/refunds still work');

    await reset(); stage = 'role-qualified active subjects';
    const tr = await trainer.reserveStrobiQuota(db, 'same-id', trainerLimits);
    const tn = await store.reserveStrobiTip(db, 'same-id', key(), limits);
    assert(tr.success); assert.equal(tn.status, 'RESERVED');
    assert.equal(await attempts('PROJECT'), 2);
    assert.equal(await db.strobiRequestLease.count(), 1); assert.equal(await db.strobiActorRequestLease.count(), 1);
    await trainer.releaseStrobiQuota(db, tr.reservation); await store.releaseStrobiTip(db, tn.reservation);

    await reset(); stage = 'same-trainee process race';
    const same = await Promise.all([worker('TRAINEE', 'same', key('a')), worker('TRAINEE', 'same', key('b'))]);
    assert.equal(same.filter(x => x.status === 'RESERVED').length, 1);
    assert.equal(same.filter(x => x.code === 'BUSY').length, 1);
    assert.equal(await attempts('PROJECT'), 1);
    await store.releaseStrobiTip(db, same.find(x => x.status === 'RESERVED').reservation);
    for (let i = 0; i < 2; i++) {
      const next = await store.reserveStrobiTip(db, 'same', key(`personal-${i}`), limits); assert.equal(next.status, 'RESERVED');
      if (!i) await assert.rejects(store.completeStrobiTip(db, next.reservation, { answer: '<script>bad</script>', steps: [] }));
      await store.releaseStrobiTip(db, next.reservation); // Dispatched error/timeout/cancel has no refund.
    }
    assert.equal((await worker('TRAINEE', 'same', key('fourth'))).code, 'DAILY_LIMIT');
    assert.equal(await attempts('TRAINEE'), 3); assert.equal(await attempts('PROJECT'), 3);
    console.log('PASS role-qualified leases, independent-process one-active guard and exact 3/person dispatched-attempt cap');

    await reset(); stage = 'identical cross-process misses';
    const sharedKey = key('shared');
    const contenders = await race(Array.from({ length: 6 }, (_, i) => ['TRAINEE', `reader-${i}`, sharedKey]));
    assert.equal(contenders.filter(x => x.status === 'RESERVED').length, 1);
    assert.equal(contenders.filter(x => x.status === 'WAIT').length, 5);
    assert.equal(await attempts('PROJECT'), 1);
    const owner = contenders.find(x => x.status === 'RESERVED').reservation;
    const cancelled = new AbortController(); cancelled.abort();
    assert.equal(await store.waitForStrobiTipCache(db, sharedKey, { signal: cancelled.signal }), null);
    assert.equal(await store.waitForStrobiTipCache(db, sharedKey, { timeoutMs: 25 }), null);
    const during = new AbortController();
    const waiting = store.waitForStrobiTipCache(db, sharedKey, { timeoutMs: 5000, signal: during.signal });
    during.abort(); assert.equal(await waiting, null);
    assert.equal((await db.strobiTipCacheLease.findUnique({ where: { key: sharedKey } })).token, owner.token);
    assert.equal(await attempts('PROJECT'), 1);
    assert(await store.completeStrobiTip(db, owner, tip));
    const row = await db.strobiTipCache.findUnique({ where: { key: sharedKey } });
    assert.equal(row.expiresAt - row.createdAt, 7 * 86400000);
    assert.deepEqual(await store.waitForStrobiTipCache(db, sharedKey, { timeoutMs: 5000 }), tip);
    for (let i = 0; i < 6; i++) assert.equal((await worker('TRAINEE', `cached-${i}`, sharedKey)).status, 'CACHED');
    assert.equal(await attempts('PROJECT'), 1); assert.equal(await db.strobiDailyQuota.count({ where: { scope: 'TRAINEE' } }), 1);
    await db.strobiDailyQuota.updateMany({ where: { scope: 'TRAINEE' }, data: { attempts: 3 } });
    assert.equal((await store.reserveStrobiTip(db, owner.subjectId, sharedKey, limits)).status, 'CACHED');
    await store.releaseStrobiTip(db, owner, true); // Completed ownership cannot be refunded.
    assert.equal(await attempts('PROJECT'), 1);

    stage = 'content and version invalidation';
    const sharedContext = { ...context, title: context.title + 'shared' };
    assert.equal(store.createStrobiTipCacheKey(sharedContext, 'EXPLAIN_MILESTONE', 'test-model'), sharedKey);
    const keys = [
      store.createStrobiTipCacheKey({ ...sharedContext, title: 'Different title' }, 'EXPLAIN_MILESTONE', 'test-model'),
      store.createStrobiTipCacheKey({ ...sharedContext, description: 'A different skill and verification criterion.' }, 'EXPLAIN_MILESTONE', 'test-model'),
      store.createStrobiTipCacheKey({ ...sharedContext, pillar: 'TECHNICAL' }, 'EXPLAIN_MILESTONE', 'test-model'),
      store.createStrobiTipCacheKey(sharedContext, 'SHOW_EXAMPLE', 'test-model'),
      store.createStrobiTipCacheKey(sharedContext, 'EXPLAIN_MILESTONE', 'different-model'),
      store.createStrobiTipCacheKey(sharedContext, 'EXPLAIN_MILESTONE', 'test-model', { prompt: 'v2', contract: '1' }),
      store.createStrobiTipCacheKey(sharedContext, 'EXPLAIN_MILESTONE', 'test-model', { prompt: 'trainee-tips-v1', contract: '2' }),
    ];
    assert.equal(new Set([sharedKey, ...keys]).size, 8);
    for (const changed of keys) assert.equal(await store.readStrobiTipCache(db, changed), null);
    await db.strobiTipCache.update({ where: { key: sharedKey }, data: { tip: { answer: '<b>invalid</b>', steps: [] } } });
    assert.equal(await store.readStrobiTipCache(db, sharedKey), null);
    await db.strobiTipCache.update({ where: { key: sharedKey }, data: { tip, createdAt: new Date(now - 8 * 86400000), expiresAt: new Date(now - 1000) } });
    assert.equal(await store.readStrobiTipCache(db, sharedKey), null);
    console.log('PASS one-owner cross-process cache misses, zero-charge cross-trainee reuse, waiter timeout/cancel, seven-day TTL and context/model/version invalidation');

    await reset(); stage = 'trainee aggregate and reserved trainer capacity';
    await seed(day, 39, 39);
    const aggregate = await race(Array.from({ length: 4 }, (_, i) => ['TRAINEE', `aggregate-${i}`]));
    assert.equal(aggregate.filter(x => x.status === 'RESERVED').length, 1);
    assert.equal(aggregate.filter(x => x.code === 'DAILY_LIMIT').length, 3);
    assert.equal(await attempts('TRAINEE_PROJECT'), 40); assert.equal(await attempts('PROJECT'), 40);
    const ten = await race(Array.from({ length: 11 }, (_, i) => ['TRAINER', `trainer-${i}`]));
    assert.equal(ten.filter(x => x.success).length, 10); assert.equal(ten.filter(x => x.code === 'DAILY_LIMIT').length, 1);
    assert.equal(await attempts('PROJECT'), 50); assert.equal(await attempts('TRAINEE_PROJECT'), 40);
    await reset(); stage = 'mixed trainer/trainee total race';
    await seed(day, 48, 38);
    const mixed = await race(Array.from({ length: 8 }, (_, i) => [i % 2 ? 'TRAINER' : 'TRAINEE', `mixed-${i}`]));
    assert.equal(mixed.filter(x => x.success || x.status === 'RESERVED').length, 2);
    assert.equal(await attempts('PROJECT'), 50); assert(await attempts('TRAINEE_PROJECT') <= 40);
    console.log('PASS real process races enforce 40 trainee aggregate, ten preserved trainer requests and exact shared 50 total');

    await reset(); stage = 'stale ownership and refunds';
    const old = (await store.reserveStrobiTip(db, 'old', key('lease'), limits)).reservation;
    await db.strobiActorRequestLease.updateMany({ data: { expiresAt: new Date(0) } });
    await db.strobiTipCacheLease.updateMany({ data: { expiresAt: new Date(0) } });
    const replacement = await worker('TRAINEE', 'old', old.cacheKey); assert.equal(replacement.status, 'RESERVED');
    await store.releaseStrobiTip(db, old, true); assert.equal(await store.completeStrobiTip(db, old, tip), false);
    assert.equal((await db.strobiTipCacheLease.findUnique({ where: { key: old.cacheKey } })).token, replacement.reservation.token);
    assert.equal(await attempts('PROJECT'), 2);
    await store.releaseStrobiTip(db, replacement.reservation, true); await store.releaseStrobiTip(db, replacement.reservation, true);
    assert.equal(await attempts('PROJECT'), 1); assert.equal(await attempts('TRAINEE_PROJECT'), 1); assert.equal(await attempts('TRAINEE'), 1);
    await reset();
    const first = (await store.reserveStrobiTip(db, 'a', key('different-owner'), limits)).reservation;
    await db.strobiActorRequestLease.updateMany({ data: { expiresAt: new Date(0) } });
    await db.strobiTipCacheLease.updateMany({ data: { expiresAt: new Date(0) } });
    const other = (await store.reserveStrobiTip(db, 'b', first.cacheKey, limits)).reservation;
    await store.releaseStrobiTip(db, first, true); assert.equal(await attempts('PROJECT'), 2);
    assert.equal(await store.completeStrobiTip(db, first, tip), false);
    assert(await store.completeStrobiTip(db, other, tip));

    await reset(); stage = 'Manila day and cross-midnight release';
    const yesterday = trainer.strobiDay(new Date(now - 86400000)).day;
    await seed(yesterday, 50, 40, 'reset', 3);
    const today = await worker('TRAINEE', 'reset'); assert.equal(today.status, 'RESERVED');
    assert.equal(today.reservation.day, day); assert.equal(today.reservation.usage.traineeRemaining, 2);
    const [{ expected }] = await root.$queryRaw`SELECT to_char(clock_timestamp() AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD') AS expected`;
    assert.equal(today.reservation.day, expected);
    assert.equal(today.reservation.usage.resetsAt, new Date(Date.parse(`${day}T00:00:00+08:00`) + 86400000).toISOString());
    await store.releaseStrobiTip(db, today.reservation);
    const yesterdayToken = randomUUID(), midnightKey = key('midnight');
    await db.strobiActorRequestLease.create({ data: { scope: 'TRAINEE', subjectId: 'reset', token: yesterdayToken, day: yesterday, cacheKey: midnightKey, expiresAt: new Date(Date.now() + 60000) } });
    await db.strobiTipCacheLease.create({ data: { key: midnightKey, token: yesterdayToken, expiresAt: new Date(Date.now() + 60000) } });
    const currentBefore = JSON.stringify(await db.strobiDailyQuota.findMany({ where: { day }, orderBy: { scope: 'asc' } }));
    await store.releaseStrobiTip(db, { ...today.reservation, token: yesterdayToken, day: yesterday, cacheKey: midnightKey }, true);
    assert.equal(JSON.stringify(await db.strobiDailyQuota.findMany({ where: { day }, orderBy: { scope: 'asc' } })), currentBefore);
    assert.equal((await db.strobiDailyQuota.findUnique({ where: { scope_subjectId_day: { scope: 'PROJECT', subjectId: 'strobi', day: yesterday } } })).attempts, 49);
    console.log('PASS expired-owner recovery, stale publication/release, one-time owned refunds, DB Manila reset and previous-day-only refunds');

    await reset(); stage = 'cleanup retention';
    const live = (await store.reserveStrobiTip(db, 'live', key('live'), limits)).reservation;
    const liveTrainer = await trainer.reserveStrobiQuota(db, 'live-trainer', trainerLimits); assert(liveTrainer.success);
    const expiredKey = key('expired'), freshKey = key('fresh');
    await db.strobiTipCache.createMany({ data: [
      { key: expiredKey, tip, createdAt: new Date(now - 8 * 86400000), expiresAt: new Date(now - 86400000) },
      { key: freshKey, tip, expiresAt: new Date(Date.now() + 86400000) },
    ] });
    const expiredToken = randomUUID();
    await db.strobiActorRequestLease.create({ data: { scope: 'TRAINEE', subjectId: 'expired', token: expiredToken, cacheKey: expiredKey, day: yesterday, expiresAt: new Date(now - 2 * 86400000) } });
    await db.strobiTipCacheLease.create({ data: { key: expiredKey, token: expiredToken, expiresAt: new Date(now - 2 * 86400000) } });
    await db.strobiDailyQuota.create({ data: { scope: 'TRAINEE', subjectId: 'ancient', day: trainer.strobiDay(new Date(now - 9 * 86400000)).day, attempts: 3 } });
    const keep = JSON.stringify(await db.strobiDailyQuota.findMany({ where: { day }, orderBy: { scope: 'asc' } }));
    assert.deepEqual(await store.cleanupStrobiTips(db), { cache: 1, cacheLeases: 1, actors: 1, quotas: 1 });
    assert.equal(JSON.stringify(await db.strobiDailyQuota.findMany({ where: { day }, orderBy: { scope: 'asc' } })), keep);
    assert.equal((await db.strobiActorRequestLease.findUnique({ where: { scope_subjectId: { scope: 'TRAINEE', subjectId: 'live' } } })).token, live.token);
    assert.equal((await db.strobiRequestLease.findUnique({ where: { trainerId: 'live-trainer' } })).token, liveTrainer.reservation.token);
    assert.deepEqual(await store.readStrobiTipCache(db, freshKey), tip);

    stage = 'RLS and cache privacy';
    const secured = await root.$queryRaw`SELECT relname, relrowsecurity FROM pg_class JOIN pg_namespace n ON n.oid = relnamespace WHERE n.nspname = ${schema} AND relname IN ('StrobiTipCache','StrobiTipCacheLease','StrobiActorRequestLease')`;
    assert.equal(secured.length, 3); assert(secured.every(x => x.relrowsecurity));
    const grants = await root.$queryRaw`SELECT grantee FROM information_schema.role_table_grants WHERE table_schema = ${schema} AND table_name IN ('StrobiTipCache','StrobiTipCacheLease','StrobiActorRequestLease') AND grantee IN ('PUBLIC','anon','authenticated')`;
    assert.equal(grants.length, 0);
    const policies = await root.$queryRaw`SELECT policyname FROM pg_policies WHERE schemaname = ${schema}`;
    assert.equal(policies.length, 0);
    const columns = await root.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema = ${schema} AND table_name = 'StrobiTipCache' ORDER BY column_name`;
    assert.deepEqual(columns.map(x => x.column_name), ['createdAt','expiresAt','key','tip']);
    console.log('PASS cleanup preserves current counters/live owners/fresh tips; private cache RLS, no API grants/policies and no identity/history columns');
  })().catch(error => {
    console.error(`FAIL trainee tip storage at ${stage} (${error.code || error.name}); credentials and database diagnostics omitted.`);
    if (error.name === 'AssertionError') console.error(error.message);
    process.exitCode = 1;
  }).finally(async () => {
    await Promise.all([...children].map(child => new Promise(resolve => { child.once('exit', resolve); child.kill('SIGTERM'); })));
    await db.$executeRawUnsafe('RESET search_path').catch(() => {}); await db.$disconnect();
    if (created) await root.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    const [{ visible }] = await root.$queryRaw`SELECT to_regclass('"Trainee"') IS NOT NULL AS visible`;
    assert(visible, 'Default schema must remain visible after isolated tests');
    await root.$disconnect(); Module._load = originalLoad;
    console.log('Isolated fixtures removed; direct/session connections reset; public namespace intact.');
  });
}
