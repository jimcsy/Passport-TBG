# Strobi configuration and quota design (#49)

Phase 1 defines contracts only. No Gemini calls, endpoint, automatic generation,
quota writes or schema migration are introduced here. #50 implements this design
before any enabled UI may dispatch requests. All authenticated trainers are eligible;
there is no allowlist. Manual workflows never depend on AI availability.

## Configuration boundary

`lib/ai/strobi-config.ts` is marked `server-only`; it reads the server environment
and validates it using the pure configuration schema. Exact `true` enables the
feature; absent/invalid key, model, limits or timeout yields unavailable, without
throwing or logging configuration. Do not serialize its configuration return value
to clients. Future actions may return only availability, safe error codes and usage.
Never use NEXT_PUBLIC keys for Gemini. `.env.example` contains placeholders only.
No current client imports the configuration module. Keep prompts/outputs out of logs.
The model is deliberately unset: verify free-tier structured-output support and
project quota during #50 setup. No automatic paid/model fallback.

## Durable storage to implement in #50

Use PostgreSQL through existing server-side Prisma access, not process memory:

- Daily quota rows: compound unique key `(scope, subjectId, day)`, nonnegative
  attempt count. Scope is TRAINER or PROJECT; one fixed project subject. Day is
  the Asia/Manila calendar date (not server-local midnight). Store no prompt/output.
- Active lease row: trainer ID primary key, random request token, expiry timestamp.
  An expired lease can be replaced atomically. Keep only enforcement metadata.
- Introduce only these additive usage/lease models and indexes in a new migration.
  Do not modify milestone, path, progress, stamp or publication models. Follow the
  existing private-table RLS/revoke pattern; no browser database access.

## Atomic reservation and dispatch

1. Authenticate/authorize trainer; validate request; resolve authorized plan context;
   check feature configuration before reserving. Reject without quota charge.
2. In a short database transaction, lock the lease and both daily rows in a stable
   order (project then trainer), creating absent rows safely with unique constraints.
   Use database time for expiry. Reject a live lease or either exhausted counter.
   Increment both counters and acquire the token/expiry together or roll back all.
   A serializable transaction with bounded conflict retries is an alternative;
   retries must not increment twice. Never hold a transaction over a provider call.
3. Dispatch immediately after reservation. Proven pre-dispatch failures can release
   reservation/counters atomically by token; once dispatch is attempted, retain the
   count even for timeout, failure, cancellation or uncertain network delivery.
   A process crash between reservation and dispatch conservatively retains the count
   to avoid overspending; document this rare outcome in operational guidance.
4. Release lease in finally only if its token still matches. An older request cannot
   release a newer lease. Expiry permits recovery after a crash. Bound provider timeout
   below lease duration with a cleanup margin; abort provider work on timeout when
   supported. Late responses are discarded by request identity on the client.

Use `Intl.DateTimeFormat` with explicit `Asia/Manila` (or SQL timezone conversion)
for day keys. Reset is next Manila midnight. A request reserved before midnight
belongs to that day even if it completes later. Return remaining trainer/project
allowance plus reset time; a provider quota may be lower than application caps.
Default limits: 10/trainer/day, 50/project/day, one active request/trainer.

## Deployment and verification

Apply the additive migration with the normal migration deployment workflow before
#50 dispatch is enabled; regenerate Prisma client. Deploy disabled initially.
Disabling the flag stops new admissions but does not erase consumed quota; manual
creation remains available. In-flight response cancellation is handled by #50/#51.
Retain quota rows only for operational enforcement; define cleanup in #50, without
storing prompts, outputs or unrelated trainee data. Keep additive tables on rollback
unless a separately reviewed migration removes them after callers are disabled.

#50 must prove atomic boundaries under concurrency, Manila midnight, token-safe
release, stale lease recovery and dispatch accounting. This document is a design,
not evidence that quotas are already enforced.

## Validation audit

Shared creation and editing now use the same milestone schema. Tree editing and
both create forms use the centralized description cap. Plan node save validation
uses the same description bounds so a valid 2,000-character milestone survives
Save draft/Publish. Plan-level descriptions, change notes and revocation reasons
retain their unrelated limits. Existing snapshot node title/code compatibility
bounds remain unchanged; custom milestone creation/editing retains code 3–25,
title 3–100 and description minimum 10. No existing stored data is rewritten.
