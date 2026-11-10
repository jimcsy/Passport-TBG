# Strobi trainee tips: verification and rollout

Phase [#61](https://github.com/jimcsy/Passport-TBG/issues/61), final child of
[epic #55](https://github.com/jimcsy/Passport-TBG/issues/55). Saved flags remain off;
verification is not a deployment or authorization to enable normal-user AI.

## Reproduce final acceptance

```sh
PASSPORT_BUILD_DIR=.next-mobile-check npm run build
PLAYWRIGHT_BROWSERS_PATH=/tmp/passport-strobi-browsers npm run test:strobi-tips-final
npx tsc --noEmit
npx prisma validate
git diff --check
```

The deterministic runner owns enabled/disabled servers on 3130/3132 and runs the
existing trainer runner on 3140/3142. Port conflicts fail without reusing or killing
another process. Override `STROBI_TIPS_ENABLED_PORT`, `STROBI_TIPS_DISABLED_PORT` if
necessary; the nested trainer ports must also be unused. It uses the same built
server artifacts with opposite runtime feature configurations, so environment
changes cannot accidentally drift between separately compiled app versions.

All deterministic server/child processes receive fake Gemini credentials. Browser
generation requests are intercepted, or the real built endpoint is deliberately
disabled. Service tests inject bounded provider responses. None are evidence of a
live Gemini success. Each test owns its fixtures; no existing user, path, progress,
stamp or current-day quota counter is reset. Temporary schema tests require
`DIRECT_URL` on a direct/session endpoint, reject transaction pooling and restore
search_path before dropping schemas/disconnecting. Process races are bounded to
avoid exhausting the shared free-tier database.

The runner includes trainee contracts/provider/route tests, real process cache/
quota/lease/reset tests, actual JWT/authorization and full domain snapshots,
rendered chat/accessibility tests, built HTTP tests, actual app navigation/session
integration, all fourteen existing trainer Strobi checks and twelve relevant
content/material/publication/review/stamp regression suites. It also scans compiled
client assets for configured server credentials. Capture artifacts are synthetic
fixtures under `/tmp/passport-strobi-tips-ui` and `/tmp/passport-strobi-tips-integration`.

## Explicit live smoke

The live command is separate and refuses to run without an explicit opt-in:

```sh
STROBI_TIPS_LIVE_CHECK=true STROBI_REQUEST_TIMEOUT_MS=60000 PLAYWRIGHT_BROWSERS_PATH=/tmp/passport-strobi-browsers npm run test:strobi-tips-live
```

Use only a configured nonconfidential free-tier pilot project. It starts its own
loopback-only production server on port 3134 (`STROBI_TIPS_LIVE_PORT` override),
enables trainee AI only in that child, and disables trainer AI there. The saved
`.env` is not changed. The temporary 60-second timeout follows the previous trainer
latency observation; the saved default is unchanged. Use the hosting platform's
supported timeout when deploying.

The smoke creates two owned trainees with identical generic active-listening
milestone context, generates once, then requests the same question from the other
trainee and again from the first. Both later results must be actual cache hits.
It validates bounded output and visible source labels, exact unchanged fixture
learning records, no remaining active leases, one personal attempt, zero attempts
for the cache-only trainee, and exactly one additional shared/trainee-aggregate
attempt. It logs only HTTP status, source counts, word/character/step counts and
counter deltas. No raw answer/prompt, screenshot of live output, cookie, key or
connection string is logged. A source/error mismatch stops without retrying or
changing model. Failed dispatched attempts remain counted.

Owned learning fixtures and the unique smoke cache entry are removed. Actual
dispatched accounting remains until normal retention cleanup. A failed live check
leaves this issue open; deterministic success never substitutes for it. Run without
concurrent real AI activity so exact counter-delta assertions remain meaningful.

## Deployment prerequisites and flags

1. Configure server-only `GEMINI_API_KEY`, `GEMINI_MODEL` and the existing project
   budget in each environment. No NEXT_PUBLIC equivalents. Keep all deployments
   using the same Gemini project on the same quota/cache database. External users
   of the project can exhaust Google limits outside the app's accounting.
2. Deploy the additive `20261110000000_strobi_trainee_cache` migration after the
   existing trainer quota migration, using the project's normal reviewed migration
   workflow. Inspect unrelated pending migrations before applying. The configured
   development database was migrated in #57; other environments are not assumed
   migrated. Three new tables require RLS and no anon/authenticated API-role grants.
   See [storage/migration details](strobi-trainee-tips-storage.md).
3. Check that project's current tier/model quotas in Google AI Studio. The user's
   supplied Nov 9 screenshot showed Free tier, Gemini 3.1 Flash Lite, 15 RPM,
   250,000 TPM and 500 RPD. This is observed project evidence, not a permanent quota
   guarantee; API success verifies access, not billing tier or future availability.
   Recheck before enabling another environment. Google documents quotas per
   project/tier/model and RPD reset at Pacific midnight; the application's day
   resets at Asia/Manila midnight. [Google rate limits](https://ai.google.dev/gemini-api/docs/rate-limits).
4. Keep `STROBI_TRAINEE_AI_ENABLED=false` until verified. When separately authorized,
   set it true in that environment and restart/redeploy. `STROBI_AI_ENABLED`
   independently controls trainers. Missing/bad AI configuration leaves prewritten
   tips and manual learning usable.
5. Initial application budgets: three new trainee attempts/person/day, forty total
   trainee attempts inside the shared fifty trainer/trainee attempts/day. Trainer
   personal budget stays ten. Reuse/static tips consume no attempt. Dispatched
   errors, timeout, invalid/refused output and post-dispatch cancellation count;
   only a provably pre-dispatch reservation is refunded once. No automatic retry,
   paid fallback or model switching.
6. Use only nonconfidential milestone wording. The persistent chat/author notices
   explain free-tier handling and trainer authority. A shared cache is not a
   confidentiality filter. [Google unpaid-service terms](https://ai.google.dev/gemini-api/terms).

## Retention and scheduler status

Cache TTL is seven days. Every read enforces expiry immediately and revalidates
current eligibility; changing context, question, model or prompt/output version
changes the cache key. Cache content is generic guidance, not a session transcript.

Trusted cleanup entry point:

```sh
npm run strobi:tips-cleanup -- --confirm
```

This invokes the tested server helper and prints deletion counts only. It removes
expired cache, actor/cache leases expired for more than one day and operational
quotas older than the seven-day cutoff. It preserves current counters, live
owners and training/progress/stamp data. Legacy trainer leases use their existing
helper. It has no public API endpoint and refuses an unconfirmed CLI invocation.

**No hosting scheduler is configured or deployed by this issue.** Operators should
schedule this command daily in a trusted worker using server-only credentials and
the same database, with single-job ownership and bounded execution. Record the
actual hosting job and monitor exit status. Until then, expiry prevents reuse but
physical rows remain until cleanup runs. Do not claim automatic deletion exists.

## Diagnostics and independent rollback

- Missing launcher after authentication: inspect safe context endpoint status and
  active assignment; a failed context read hides only the widget. It does not
  prevent module/material/review access.
- Prewritten source: inspect the safe disabled/unconfigured/provider/limit reason,
  environment flag, validated model/configuration and remaining budgets. Do not
  dump process environment, prompts, cached answers or protected records.
- 401: reauthenticate. 403/404 for inaccessible/locked/archive context is expected;
  cache presence never grants permission. Check actual unlock/progress status.
- 429/503/timeout: use static guidance/manual learning; verify project quotas and
  host timeout. Cancellation after dispatch may count. Never reset counters or
  automatically retry/model-switch to hide a provider failure.
- Busy or waiting: another actor/cache owner may be active. Leases expire; only
  their token can complete/release. Do not delete another live owner's lease.
- For operational monitoring record status/category, latency and count only.
  No answer/prompt, materials, feedback, session tokens or secrets in diagnostics.

Rollback: set **only** `STROBI_TRAINEE_AI_ENABLED=false`, then restart/redeploy that
environment. Trainer AI remains governed by its own flag. Trainees retain clearly
prewritten tips, materials and manual review. Retain schema, cache/accounting
support and actual counters; do not drop tables, narrow scope constraints or reset
current-day counts. Existing assignments, progress and stamp hashes stay intact.
No hosting configuration, scheduler, deployment, commit or push is implied here.

## Acceptance evidence

Final command results and the epic coverage matrix are recorded below. Historical phase evidence remains in the contracts, storage,
API, UI and integration guides; final verification does not replace it.

### Live result — 2026-11-10 (Asia/Manila)

Live readiness is **not yet verified**. Two separately invoked smoke attempts
returned HTTP 200 from the application with a correctly labeled prewritten
`PROVIDER_UNAVAILABLE` fallback. Neither invocation retried. The second used the
verification-only IPC probe and recorded exactly one provider dispatch with
**Gemini HTTP 503**; no response body or credentials were retained. A read-only
configured-model metadata request returned HTTP 200 with generation support.
This confirms model metadata access, not successful answer generation.

The app stayed usable and cleanup removed each attempt's owned learning fixtures
and unique cache key. Real dispatched accounting was retained. No model switching,
paid fallback, saved flag change or normal-user enablement occurred. Live output
length, successful cache reuse and successful-request counter deltas cannot be
claimed until a later explicit smoke succeeds. #61 and epic #55 must remain open
while this acceptance condition is outstanding.

The probe in `scripts/fixtures/strobi_provider_probe.cjs` is loaded only by the
owned live verification child. Its private IPC reports dispatch count, HTTP status
and a small error-category allowlist, never body/prompt/key/URL. It is not a
production logging hook or public diagnostics endpoint.

### Epic coverage matrix

| Requirement | Reproducible evidence | Status |
| --- | --- | --- |
| Authenticated current eligible assignments; locked/archive/foreign/stale handling | `test_strobi_tips_access_db.cjs`, `test_strobi_tips_http.cjs`, integration suite | Passed |
| Exactly four questions; strict input and minimal provider context | Contract, route, service and real-access suites; four-output browser loop | Passed |
| Bounded plain-text output; no history/materials/private records | Contract/provider tests, private sentinels and exact payload keys | Passed |
| Cross-trainee cache reuse, content/question/model/version keys, seven-day TTL | Real DB/process store suite plus auth/cache route tests | Passed deterministically; live reuse outstanding |
| Coalescing and personal/aggregate/shared limits; unchanged trainer semantics | Real multi-process store suite and existing trainer quota suite | Passed, including all fourteen legacy trainer checks |
| Races, Manila midnight, expiry, stale tokens, refunds/failure/cancel accounting | Real DB/process suite plus service/transport failures | Passed |
| Combined timeline; switch/pending/navigation/close/reload/logout/identity | Rendered UI and actual-app integration | Passed |
| Generated/reused/prewritten labels; disabled/exhausted/failure guidance | UI/service/built-HTTP suites and live 503 fallback | Passed |
| Desktop/320px+/portrait/landscape; safe areas/focus/Escape/announcements/reduced motion | Rendered UI suite and actual-app integration | Passed |
| No generation mutation of learning/review/progress/materials/stamps/hashes | Full-domain isolated snapshots; original hash retention; existing regression suites | Passed, including twelve existing manual regression suites |
| Independent flags, server-only secrets, TypeScript/build, live success | Flag/configuration/UI integration; static-secret scan; build/types; explicit smoke | Build/types/scan passed; live success outstanding |
| Migration/cleanup/scheduler/quotas/diagnostics/rollback | This guide and storage guide; real RLS/retention tests | Documented; deployment/scheduler intentionally not performed |

Post-smoke read-only verification found PROJECT attempts **2** and TRAINEE_PROJECT attempts **2** for the current Manila day, with zero remaining owned live trainees, trainers or milestone nodes. Saved `.env` SHA-256 remained identical (the digest itself is not recorded).

Read-only `prisma migrate status` passed: configured database schema up to date, no unexpected pending migrations. No migration was applied in #61. All fourteen existing trainer Strobi acceptance checks passed, including real trainer quota/namespace safety, shared/custom builder authoring and material handoff.

### Final deterministic result — 2026-11-10

- `PASSPORT_BUILD_DIR=.next-mobile-check npm run build` — passed.
- `PLAYWRIGHT_BROWSERS_PATH=/tmp/passport-strobi-browsers npm run test:strobi-tips-final` — **exit 0**, all trainee checks, all fourteen existing trainer Strobi checks and all twelve selected manual regression suites passed. The runner stopped its owned servers. An initial harness invocation stopped at the disabled-HTTP opt-in guard; adding that explicit test flag fixed the runner, and the complete corrected run passed.
- `npx tsc --noEmit`, `npx prisma validate`, `git diff --check` — passed.
- Read-only migration status — passed, database up to date; no migration applied.
- Expanded compiled-client scan — passed for configured Gemini key, service-role key, session secret and both database URLs.
- Cleanup CLI without `--confirm` — refused before database writes; real helper retention/RLS behavior passed in isolated DB tests.

Manual suites: `milestone_creation_actions`, `milestone_library_reads`,
`material_actions`, `material_browser`, `shared_creation_upload_browser`,
`plan_insertion_browser`, `save_scope_browser`, `individual_publish_browser`,
`path_edit_browser`, `stamp_revocation_browser`, `stamp_notifications_browser`,
`module_review_browser`. Coverage includes real saved-ID uploads and signed
material access, draft/publish recipient scopes and personal customization,
original hash preservation, audited revocation/re-award and prevention of stamp
restoration on publish, first-open celebrations and actual trainer feedback.

**Disposition: deterministic acceptance passed; live acceptance outstanding.**
Do not close #61 or epic #55, or claim live readiness, until the separate explicit
live smoke succeeds and records actual cache reuse/counter deltas. No production
business logic, schema, saved environment, feature enablement, deployment, commit
or push changed in this phase.

Final teardown confirmed all five owned verification ports released, saved environment hash unchanged, and both saved AI flags false.

### Isolating recurring provider failures

`node --env-file=.env scripts/diagnose_strobi_provider.cjs` defaults to metadata
only: no generation, quota write, model change or feature enablement. The latest
read-only check returned HTTP 200 for configured `gemini-3.1-flash-lite` and
confirmed `generateContent` support. This does not prove generation availability.

The prepared explicit `STROBI_DIAGNOSTIC_LIVE=true` mode makes one minimal generic
request on that same model, without Strobi instructions or a structured schema.
It reserves/releases against existing trainee/shared budgets and retains a
counted dispatch. Only HTTP status and fixed error categories are printed; raw
provider bodies/answers/keys are not logged. Comparing this result with the app
smoke can distinguish basic model availability from a request-shape problem.
This extra live diagnostic has **not run**: automatic approval review rejected the
additional quota-consuming request under the earlier stop-retrying constraint.
Obtain explicit user approval before running it. No repeated calls or automatic
model switching are introduced.
