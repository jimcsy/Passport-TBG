# Strobi trainee tips: shared accounting and cache

Implementation phase [#57](https://github.com/jimcsy/Passport-TBG/issues/57), following
[contracts/configuration](strobi-trainee-tips-contracts.md). This phase adds storage
primitives, not a trainee endpoint or chatbot. Phase #58 must authenticate and
authorize current milestone eligibility **before every cache access/admission**.

## Additive migration and compatibility

`20261110000000_strobi_trainee_cache` runs atomically and adds:

- `StrobiActorRequestLease`: explicit `(scope: TRAINEE, subjectId)` active-request
  identity, owning token, content key, admitted calendar day and expiry.
- `StrobiTipCache`: content/version hash, validated generic answer, creation time
  and expiry. No context text, node/trainee ID, prompt or conversation columns.
- `StrobiTipCacheLease`: content key, owning token and expiry for coalesced misses.

The existing quota check constraint additionally permits `TRAINEE` and
`TRAINEE_PROJECT`. Existing `TRAINER` and `PROJECT` rows are not rewritten, copied
or reset. Legacy `StrobiRequestLease.trainerId` values and tokens stay untouched;
old builds and in-flight trainer releases continue to operate. A trainee with
the same ID as a trainer is a separate role-qualified active subject.

All three new tables have RLS enabled and PUBLIC/anon/authenticated table grants
revoked. No API-role policies are created. Only trusted server database access is
intended; do not expose these storage helpers as server actions or public cache
endpoints, and do not cache protected HTTP responses in a public CDN.

Apply through the normal trusted deployment workflow:

```sh
npx prisma migrate deploy
npx prisma generate
```

No seed/reset is required. Deploy migration before any build that calls the new
store. Both old and new builds use the same existing PROJECT counter and advisory
lock. Keep configured limits consistent across processes/deployments sharing the
Gemini project/database. Do not create a second project subject for trainees.

## Quota semantics

| Budget | Initial allowance | Subject |
| --- | --- | --- |
| Combined trainer + trainee | 50/day | Existing PROJECT / strobi |
| Trainee aggregate, within combined budget | 40/day | TRAINEE_PROJECT / strobi |
| Individual trainee | 3/day | TRAINEE / authenticated trainee ID |
| Individual trainer | Existing 10/day | Existing TRAINER / trainer ID |

`STROBI_QUOTA_LOCK` is exported from the existing trainer module without changing
its numeric value or behavior. Cache-first trainee admission, trainer admission,
owned releases and cleanup serialize short transactions through that same lock.
Database `clock_timestamp()` determines admission day and next midnight in
Asia/Manila. No transaction stays open for provider requests or follower polling.

`reserveStrobiTip()` validates limits, then returns:

- `CACHED`: validated unexpired generic tip plus current usage. No counters/leases
  change, including when personal/aggregate/project allowance is exhausted.
- `WAIT`: another actor owns the same missing tip. This caller receives no owned
  token and consumes no attempt; it can boundedly wait or use static guidance.
- `REJECTED`: own new-generation work is active (`BUSY`) or one of the applicable
  daily budgets is exhausted (`DAILY_LIMIT`). No attempts are spent.
- `RESERVED`: one owning token atomically guards the trainee and missing tip;
  all three trainee/aggregate/combined counters increment exactly once.

An active trainee cannot start another missing tip even in a different tab. A
valid cache hit can still be read. Shared misses coalesce only for identical
server-derived context/question/version; different content never shares a lease.
Lease life is configured provider timeout plus 30 seconds, matching trainer
reservation recovery. Expired guards can be replaced without deleting counters.

The service owns the dispatch boundary: `releaseStrobiTip(reservation, true)` is
only for **proven pre-dispatch** cancellation and requires both matching leases.
The default false counts dispatched failures, refusal/invalid output, timeout and
post-dispatch cancellation. Release is idempotent; an old token cannot refund or
release newer ownership, even if another trainee replaced the same content lease.
Refund uses the reservation's admitted day and stored actor/day match, never the
current calendar day. Quota help must describe attempts, not guaranteed answers.

## Cache identity, publication and follower reads

`createStrobiTipCacheKey()` hashes a fixed ordered tuple of validated title,
description, pillar, fixed question, configured model, prompt version and contract
version. It uses the same trimmed context as provider preparation. Node and trainee
IDs do not affect sharing. Do not accept a client-provided cache key or use title
alone. Include version bumps whenever instructions/output interpretation changes.

`completeStrobiTip()` revalidates the strict bounded answer, then verifies both
unexpired owned leases. It publishes only generic answer/steps, with database time
and an exact seven-day TTL, and releases its leases in the same transaction.
Invalid output is not cached; expired/replaced ownership cannot publish. The
caller still releases counted failed work safely. Completion never refunds.

`readStrobiTipCache()` revalidates stored JSON and checks expiry against database
time on every read. Corrupt/expired/missing records behave as misses. New context,
question, model or prompt/contract version naturally uses a different hash.
Current authorization remains mandatory even if an old entry exists.

`waitForStrobiTipCache()` polls read-only for up to one second by default, with an
explicit maximum five-second deadline. Abort/timeout returns null promptly, even
if a slow read finishes later; that read performs no quota/lease writes and no
further polls continue. The caller may offer a prewritten tip. Followers never
dispatch, refund or release the owner's work; no automatic provider retries occur.

`getStrobiTipUsage()` reads the same current counters and validates remaining
allowances/reset metadata. Limits use the same project setting as trainers;
trainee aggregate must preserve ten requests within that project allowance.

## Retention and trusted cleanup

`cleanupStrobiTips(prisma)` is a server-only operator/job helper; it is not an
unauthenticated/public route. It removes:

- Cache records at or beyond their expiry, immediately unusable even before cleanup.
- New actor/cache leases expired for more than one day, preserving a cancellation
  grace period and never removing live owners.
- Operational daily quota rows older than the existing seven-day cutoff. Current
  counters are never cleared; legacy trainer leases are left to their own helper.

Run this helper from a trusted server task, for example daily, and record the
host scheduler configuration during deployment. **No hosting scheduler is created
by this issue.** Until scheduled, expiry still prevents reuse; physical records
remain until an operator runs cleanup. Cache content is generic learning guidance,
not a permanent conversation or a privacy filter for confidential authored text.

Rollback is the separate trainee flag false plus restart/redeploy. Retain tables,
scope support, counters and ownership metadata; don't drop new tables or narrow
the constraint while new records/instances may exist. Trainer functionality is
independent and old builds remain compatible. No training/progress/stamp data is
part of this migration or cleanup.

## Verification

```sh
npm run test:strobi-tips
npm run test:strobi-tips-db
node --env-file=.env scripts/test_strobi_quota.cjs
npx tsc --noEmit
npx prisma validate
git diff --check
```

The real DB suite requires DIRECT_URL on a direct/session endpoint, refuses a
transaction-pooled URL, uses temporary schemas and a single connection per
fixture/worker, and restores search_path before disconnect/drop. It races
independent OS processes in bounded batches to avoid exhausting a shared free-tier
database. Near-cap seeded counters exercise exact 40/50 boundary races without
spending actual Gemini requests. Fixtures and their counters are isolated; no
application counts are reset. A final public-namespace check catches leakage.

Coverage includes migration preservation of active trainer ownership, role/ID
separation, personal/aggregate/combined caps, identical misses and cross-trainee
reuse, cancellation/deadline followers, seven-day expiry/version changes, invalid
cache data, stale completion/release, one-time/previous-day refunds, Manila reset,
cleanup retention and actual RLS/grants metadata. Existing trainer quota/service
regressions remain separate and must pass before closing #57.

## Recorded phase #57 results

- `npm run test:strobi-tips` — passed (contracts/configuration, instructions,
  fallbacks and server/client boundaries).
- `npm run test:strobi-tips-db` — passed all real DB/process scenarios above;
  isolated schemas removed and public namespace remained visible. The first
  high-fanout fixture run failed during the quota stage; bounded three-process
  batches passed the full suite without changing production admission semantics.
- `node --env-file=.env scripts/test_strobi_quota.cjs` — existing trainer real DB
  authorization/context and quota/service regressions passed, including previous
  caps, stale tokens, refunds, rollover and private-table protection.
- `node scripts/test_strobi_service.cjs` and
  `node scripts/test_strobi_config.cjs` — passed.
- `npx tsc --noEmit`, `npx prisma validate`, `npx prisma generate` and
  `git diff --check` — passed.
- Applied only migration `20261110000000_strobi_trainee_cache` to the configured
  database after checking no unrelated migrations were pending. Before/after
  snapshots confirmed existing TRAINER/PROJECT rows and legacy active leases
  unchanged. All three new live tables have RLS and zero API-role table grants.

No live Gemini request, saved feature-flag change, hosting scheduler, trainee API,
chat UI, deployment, commit or push was performed. Other environments still need
their own migration deployment. Next implementation phase: #58.

Current operator command and scheduler status: [final rollout guide](strobi-trainee-tips-rollout.md#retention-and-scheduler-status). No hosted cleanup job is configured.
