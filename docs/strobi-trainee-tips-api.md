# Strobi trainee tips API and service

Phase [#58](https://github.com/jimcsy/Passport-TBG/issues/58) of
[epic #55](https://github.com/jimcsy/Passport-TBG/issues/55). See
[contracts/configuration](strobi-trainee-tips-contracts.md) and
[shared accounting/cache](strobi-trainee-tips-storage.md) for prerequisites.

The backend is implemented; the floating chat UI is phase #59 and trainee-wide
integration is #60. This phase does not enable a saved feature flag, migrate more
tables, deploy an app or perform live Gemini generation. Live smoke is #61.

## Endpoint

`POST /api/trainee/strobi`, authenticated by the existing trainee cookie.

```json
{ "nodeId": "an-eligible-assigned-node-id", "questionId": "EXPLAIN_MILESTONE" }
```

The only other question IDs are `PRACTICE_ACTIVITY`, `SHOW_EXAMPLE` and
`PREPARE_FOR_REVIEW`. Node/question are the complete request, not a prompt or
client-authored context. JSON is limited to 4,096 bytes while streaming; malformed
JSON, extra fields and invalid identifiers are rejected before service dispatch.
Use the browser's same-origin POST; missing/foreign Origin, different port/scheme,
malformed Host or forged forwarded-host do not bypass the guard. Incoming Host
supports legitimate LAN/IP aliases even when Next uses an internal hostname.

All route responses, including auth/input/origin failures, use private/no-store
cache headers, `Vary: Cookie, Origin` and `nosniff`. No CDN/public cache is used.
The response is revalidated against the public result schema before serialization,
so unknown diagnostics or accidental extra fields become a safe unavailable error.

| Result | HTTP status |
| --- | --- |
| Generated, reused or eligible prewritten guidance | 200 |
| Missing/expired/wrong-portal session or missing trainee | 401 |
| Invalid body | 400 |
| Foreign/missing/unassigned node; owned archive | 404 |
| Locked milestone or rejected origin | 403 |
| Assignment/version/content changed | 409 |
| Cancelled request | 499 |
| Operational error without deliverable guidance | Safe 429/503/504 as appropriate |

Operational failures for a still-authorized milestone normally return **200 with
source PREWRITTEN and a reason**, not a fabricated generated answer. Access errors
never become prewritten success. Foreign and nonexistent IDs have the same public
inaccessible result; only an owned archive can be distinguished.

## Authorization and minimal data

`resolveStrobiTipAccess()` is a read-only selective repository query. It resolves
the latest ACTIVE assignment by the same ordering as the passport and looks only
within its version. It does not probe arbitrary global nodes. The selection omits
profile names/email, reflection/trainer notes, materials, verifier details and
stamp hashes. Progress identity/status is used for access, never provider context.

Effective progress lookup matches `getTraineePassportData`: active-version exact
node ID, then retained library identity, then competency code. LOCKED is denied;
IN_PROGRESS, READY_FOR_REVIEW and VERIFIED are eligible. No progress defaults to
IN_PROGRESS as on the existing module page. Unknown statuses fail closed. An
explicitly archived row also fails closed even if stale assignment data still
points at its node.

Current module behavior derives unlocking from effective progress status; graph
edges are not an additional read-access gate. This API does not invent a new
prerequisite rule or change existing module/material/review access.

The captured snapshot includes assignment/version/node identity and validated
title/description/pillar only. The service re-reads session and current access
before dispatch, before publishing and before returning every generated/reused/
prewritten result. A changed assignment/version/context is stale; loss of access
returns the corresponding safe error without usage/content. It checks JWT again
after the asynchronous lookup so expiry during that lookup is caught.

Existing authentication is a signed stateless cookie: JWT expiration, portal
validation and persisted trainee access remain authoritative. There is no new
server-side logout/token blacklist. Clearing a browser cookie does not revoke an
already-sent signed token by itself; the chat UI must abort pending work and clear
session state on logout/identity change in phases #59/#60. Tests do not claim a
new cross-device token revocation mechanism.

## Cache-first generation

`generateStrobiTip()` performs these steps:

1. Authenticate, strictly validate input and resolve eligible current context.
2. If the separate trainee flag is off or configuration is invalid, deliver a
   clearly prewritten tip after reauthorization. No quota/cache/provider call.
3. Build the exact content/question/model/version key and fixed-question provider
   request. An abort during context lookup exits before quota admission.
4. Atomically admit through the existing store: return an authorized cached tip
   even at exhausted quotas, boundedly follow another owner, offer static guidance
   on limits/busy, or obtain an owned reservation.
5. For a reservation, recheck current session/context/config before dispatch.
   Known pre-dispatch cancellation/staleness refunds only the owned reservation.
   Predispatch configuration fallback omits usage rather than claiming a successful
   refund before cleanup has completed.
6. Invoke the provider exactly once. Once invoked, uncertain delivery/failure is
   counted; cancellation, timeout, invalid output and refusal do not refund.
7. Validate output again, reauthorize, publish only while still owning unexpired
   leases, read current usage and reauthorize the response. Old responses never
   replace a newly selected context; the future UI also pairs its own request ID
   with captured node/question headings rather than inferring context from text.
8. Always attempt token-safe release. Cleanup failure is contained and the guard
   expires; raw DB/provider errors are neither logged nor returned.

The Gemini transport is shared with trainer proposal generation but validates the
appropriate output schema for each feature. Existing trainer function signatures,
body/response behavior, refusal/status mappings and no-retry semantics are retained.
Both use one fixed-host POST, no redirects, a bounded 65,536-byte response and an
AbortController race that enforces timeout/cancellation even if a fetch ignores
its signal. There is no automatic retry, alternate model or paid fallback.

The only provider data is the fixed question and milestone title, description
(including criteria) and pillar. No conversation, identities, assignments,
progress, reflection, materials or feedback are serialized. Model output is
bounded plain text/steps, never tool calls or learning-state actions.

## Quiet database access

`strobi-tips-db.ts` uses a server-only Prisma client with **all query/error logging
disabled**, including development. The ordinary development client logs query
parameters and would otherwise print cached JSON answers. The dedicated client
is reused through hot reload and defaults its pool to two connections unless the
operator already configured `connection_limit`. No environment values are logged.
Trainer and other application database logging behavior is unchanged.

## Verification commands

```sh
npm run test:strobi-tips
npm run test:strobi-tips-api
npm run test:strobi-tips-access
node scripts/test_strobi_service.cjs
node scripts/test_strobi_route.cjs
npx tsc --noEmit
PASSPORT_BUILD_DIR=.next-mobile-check npm run build
git diff --check
```

The access suite runs production JWT validation, route, repository and cache/
quota helpers against temporary real DB schemas using DIRECT_URL direct/session.
Only provider/configuration are substituted; no saved flag is changed. It checks
module-status parity and selective reads, expired/wrong-role/deleted identities,
foreign/locked/archived/older assignments, generated/cached/prewritten results,
cache reuse under all exhausted caps and exact before/after domain snapshots,
including progress notes, existing hashes, review and notification records.
It also verifies pre-dispatch content-change refund and counted post-dispatch
lock/assignment/expired-JWT changes without stale publication. Fixtures are removed
and connections/namespace restored. Provider contract tests use fake fetches only.

For the optional **disabled-server** built HTTP check, start a separate production
server with trainee AI explicitly false (never target an enabled server):

```sh
STROBI_TRAINEE_AI_ENABLED=false STROBI_AI_ENABLED=false \
  PASSPORT_BUILD_DIR=.next-mobile-check npm run start -- -p 3130 -H 127.0.0.1
```

Then, in another terminal with that server still running:

```sh
STROBI_TIPS_DISABLED_HTTP_CHECK=true STROBI_TRAINEE_AI_ENABLED=false \
  node --env-file=.env scripts/test_strobi_tips_http.cjs
```

The script requires explicit disabled-check flags and a loopback target. It owns
and removes temporary public-schema fixtures, checks real signed cookies and
private headers, verifies eligible/completed prewritten DISABLED results without
learning/quota writes, and scans built static assets for the configured key. Stop
only the dedicated verification server afterward. Enabled live Gemini verification
remains separate in #61; successful mocked generation is not a live smoke result.

## Recorded phase #58 results

- `npm run test:strobi-tips`, `npm run test:strobi-tips-api` and
  `npm run test:strobi-tips-access` — passed. The final real DB run includes the
  explicit archived-row guard when stale active assignment data points at it.
- `node scripts/test_strobi_service.cjs` and
  `node scripts/test_strobi_route.cjs` — existing trainer regressions passed.
- `npx tsc --noEmit`, `git diff --check` and final
  `PASSPORT_BUILD_DIR=.next-mobile-check npm run build` — passed; the new route
  compiles as a dynamic server endpoint with no client JavaScript payload.
- Explicit disabled built-server HTTP command above — passed actual cookie
  role/expiry, origin/input/missing/locked rejection, eligible/completed static
  responses and exact fixture learning/stamp/quota preservation. All owned
  public fixtures were removed; only the owned port-3130 server was stopped.
- Configured API key absent from final built static assets. Query/error logging
  is disabled in the trainee AI database client, including development.

All seven #58 acceptance criteria are covered. No saved environment/flag change,
live Gemini request, new migration, app deployment, commit or push was performed.
The UI is not yet present; next phase is #59.
