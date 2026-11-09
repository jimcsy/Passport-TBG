# Strobi milestone assistance: final verification

Date: 2026-11-09 (Asia/Manila). Status: verified; #54 and epic #48 acceptance complete.
Epic #48 covers phases #49–#54. No production deployment or saved flag change is
part of this verification.

## Acceptance matrix

| Requirement | Evidence |
| --- | --- |
| Both creation forms / builder library inspector | Shared-library, builder-shared and custom-builder browser checks |
| Editable proposal; explicit Save/Add only | First-fill/replacement UI tests; real persistence boundary assertions |
| Explicit pillar acceptance, preserved wording/manual codes | Both form integrations, renamed pillar and code-ownership assertions |
| Application codes, manual materials | Code unit tests, canonical/duplicate checks, real saved-ID PDF uploads |
| Description 10–2,000; title/code constraints retained | Contract boundaries plus manual/generated save/edit browser tests |
| Trainer-only, server-derived limited context | API/service tests and real persisted trainer/context reads |
| Atomic configurable quotas and active guard | Independent OS processes against an isolated PostgreSQL schema |
| Manila reset, expiry/refund/old-token protection | Database and pure boundary tests |
| Errors/cancellation/stale/manual fallback | Provider mocks, ignored-abort UI cases and disabled built-app checks |
| No progress/stamp/published snapshot mutation | Exact before/after comparisons in custom/insertion and existing regressions |
| Privacy notice, safe configuration and output | Client UI/transport checks, built-client key scan, safe live smoke output |
| Responsive theme, keyboard and focus | Real CSS/browser renders at 320–1440px, pending-Add focus and modal layering |
| Live Gemini model/project eligibility | Earlier HTTP 200 service check and final explicit live browser check |
| Setup/rollback and operational limits | `strobi-service.md`; actual Free tier screenshot recorded in #50 |

## Recorded commands and results

- `PASSPORT_BUILD_DIR=.next-mobile-check npm run build` — passed.
- `STROBI_TEST_PORT=3120 STROBI_DISABLED_TEST_PORT=3122 PLAYWRIGHT_BROWSERS_PATH=/tmp/passport-strobi-browsers npm run test:strobi` — all **14 checks passed**, including the namespace isolation regression. The runner used separate fake-config enabled and disabled servers, then stopped them.
- `STROBI_LIVE_CHECK=true PLAYWRIGHT_BROWSERS_PATH=/tmp/passport-strobi-browsers node --env-file=.env scripts/test_strobi_live_browser.cjs` — **HTTP 200**, one request, title length 42, description length 431; editable fields verified and Cancel chosen, no Save. No raw generated text, prompt, key or session token was logged.
- Live test configuration: selected Gemini 3.1 Flash-Lite, temporary server flag true and **60,000 ms** timeout. A prior **30,000 ms** attempt returned the intended TIMEOUT response; it counted as a dispatched attempt. No automatic retry/model switch occurred. Two earlier pre-dispatch origin failures made no provider call. Saved defaults/flag were not changed.
- `npx tsc --noEmit` and `git diff --check` — passed.
- `PATH_EDIT_PHASE=publish PLAYWRIGHT_BROWSERS_PATH=/tmp/passport-strobi-browsers node --env-file=.env scripts/test_path_edit_browser.cjs` — actual publication/sync passed; original progress rows, statuses and stamp hashes retained.
- Existing regression coverage — all 10 distinct selected suites passed: `milestone_creation_actions`, `milestone_library_reads`, `shared_creation_upload_browser`, `plan_insertion_browser`, `save_scope_browser`, `individual_publish_browser`, `path_edit_browser`, `stamp_revocation_browser`, `stamp_notifications_browser`, `module_review_browser`. After the namespace correction, the six-suite rerun (`individual_publish_browser path_edit_browser stamp_revocation_browser stamp_notifications_browser module_review_browser plan_insertion_browser`) exited 0. The other four had already passed.
- Built-client secret scan — configured API key absent; saved feature flag remains false.

Deterministic tests intercept provider calls and do not substitute for the live
check. These are development verification results, not a production deployment
or a guarantee of provider latency/availability.

## Deployment/operator actions

- Saved `.env` remains unchanged; enable STROBI_AI_ENABLED and restart/redeploy
  only when ready to expose the assistant to trainers.
- Set server secrets/model in each environment and deploy the additive quota
  migration before enabling there. Only the configured development database was
  migrated/verified in this work; other environments require their own deployment.
- Confirm that environment's current Free tier/model quota. Observed on Nov 9:
  Gemini 3.1 Flash Lite, 15 RPM, 250,000 TPM, 500 RPD. App defaults remain 10 per
  trainer/day and 50 project/day. Provider limits can change or reject short bursts.
- Schedule the trusted server-side quota cleanup helper if automatic age cleanup
  is required. This repository does not configure a hosting scheduler.
- Rollback is flag false plus restart/redeploy. Retain usage tables/counters and
  existing training/progress/stamp data.

## Fix discovered during final verification

Next.js can construct `Request.url` with an internal hostname different from the
browser's LAN/IP address. The previous origin comparison rejected legitimate
127.0.0.1 requests with 403. The API now compares Origin to the incoming Host with
the request protocol, without trusting forwarded-host input. Unit tests cover
valid internal/public aliases and rejection of foreign origins, forged forwarded
hosts, different ports and different schemes. The built real-HTTP and live-browser
checks confirm the fix. Authorization and all milestone business rules remain
unchanged.

## Provider latency observation

The live browser succeeded under a temporary 60-second limit after a 30-second
attempt timed out. The default remains 30 seconds; operators may explicitly set
`STROBI_REQUEST_TIMEOUT_MS=60000` if appropriate for their host and usage. This does
not change model/tier or add automatic retries. Manual editing/cancellation remains
available while waiting, and timeout/error cases preserve entries. No raw provider
response was retained.

## Database namespace isolation correction

The first preservation run found unqualified row-lock SQL failing after the quota
test's temporary schema was dropped. Metadata checks confirmed the real
`public.Trainee` table still existed; ORM reads were intact. The test had used a
transaction-pooled URL for temporary-schema connections, allowing search_path to
survive on pooled backend sessions. Those session settings were reset without
changing data, role defaults or terminating connections; checked sessions again
resolved the public table normally.

The isolation test now requires DIRECT_URL (direct/session endpoint), resets each
fixture session before disconnecting and asserts no temporary namespace leaks.
A regression test deliberately sets a **transaction-local** restricted search_path,
then verifies instance access, original/idempotent award hashing and audited
revocation. Existing trainee/training-plan row locks now explicitly target the
same `public` namespace as Prisma instead of depending on pooled search_path.
Parameters, lock ordering, business rules and data schemas are unchanged. The
publish/stamp/review reruns all passed after the correction.
