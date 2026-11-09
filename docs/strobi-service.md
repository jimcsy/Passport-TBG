# Strobi milestone assistance: setup and operations

Ask Strobi is integrated into shared-library creation (including the builder's
library inspector) and the custom Path Builder modal. It generates **temporary,
editable wording**, not saved content. Codes are generated/validated by the app;
materials remain manual. Existing Save/Add, Save draft, Publish, progress and
stamp behavior remains unchanged.

The saved feature flag was left disabled during implementation. Verification uses
separate temporary processes; it does not enable the feature for normal users.

## Configure and enable

1. Use a Google AI Studio **Free** project and create a Gemini key. Keep billing
   unlinked for this prototype; the app cannot force a billed Google project onto
   free-tier pricing.
2. Put these server-only entries in local `.env` or the deployment's secret store:

   ```dotenv
   STROBI_AI_ENABLED=false
   GEMINI_API_KEY="your-real-key"
   GEMINI_MODEL="gemini-3.1-flash-lite"
   # Optional: these are the application defaults.
   STROBI_TRAINER_DAILY_LIMIT=10
   STROBI_PROJECT_DAILY_LIMIT=50
   STROBI_REQUEST_TIMEOUT_MS=30000
   ```

   Never use NEXT_PUBLIC names for Gemini, put keys in chat, or commit `.env`.
   The app sends only availability to client components, never this configuration.
3. Check the selected project's **Usage → Rate limits** in AI Studio. On
   2026-11-09 the user confirmed Free tier and **15 RPM, 250,000 TPM, 500 RPD** for
   Gemini 3.1 Flash Lite. These observed limits can change. Application caps are
   separate and remain 10/trainer/day and 50/project/day by default.
4. Apply the normal deployment migrations and generate Prisma client:

   ```sh
   npx prisma migrate deploy
   npx prisma generate
   ```

   `20261109000000_strobi_quotas` adds only `StrobiDailyQuota` and
   `StrobiRequestLease`. RLS is enabled and public/anon/authenticated table access
   revoked. Existing milestone, plan, progress and stamp tables are not altered.
5. When ready, set `STROBI_AI_ENABLED=true`, restart/redeploy, and reload the form.
   All authenticated persisted trainers/admins are eligible; there is no allowlist.
   Disabled/missing/invalid configuration leaves manual creation usable.

Gemini 3.1 Flash-Lite was explicitly selected and live-tested for this project.
The earlier 2.5 model returned 404 despite appearing in the model catalog. Catalog
presence alone is not proof of generation eligibility. Select/configure supported
models explicitly; the service never switches models or enables paid fallback.
Final verification observed one 30-second timeout and one successful browser check
with a temporary 60-second limit. Operators can explicitly set
`STROBI_REQUEST_TIMEOUT_MS=60000` if appropriate; the saved/default setting was not
changed and this is not an automatic fallback.
Use a host request timeout that accommodates the configured provider timeout plus
short database reservation/cleanup work.

## Trainer workflow

- Open **Create milestone** in the library/builder library, or **Add Milestone**
  inside a working plan. Describe the competency with plain text or `/strobi …`.
  Typing alone does not generate; choose **Generate**.
- First generation can fill untouched empty title/description fields. Existing
  wording or edits made while pending remain intact. **Apply suggestion** explicitly
  replaces wording; **Use [pillar]** separately changes the destination.
- Review the app-suggested code. Untouched codes refresh with the pillar; edited
  codes stay manual. Codes still undergo format and duplicate checks when submitted.
- In the library, **Save shared milestone** creates the reusable definition, then
  the material inspector uses its real ID. In the custom builder modal, **Add to
  draft** preserves the checkbox choice: shared definition plus working node when
  checked; plan-only working node when unchecked. **Save draft** persists the graph;
  **Publish** remains a separate recipient/progress-preserving operation.
- Cancel/dismiss or finish manually at any time. Closing discards temporary AI
  state. A trainer's explicit Save stores the reviewed milestone wording normally;
  generation alone does not store a proposal or conversation.

The input/proposal contracts retain code 3–25 with existing restricted syntax,
title 3–100, description/criteria 10–2,000 and the five existing pillar values.
Materials/links/codes are not AI response fields. Implementation details and parent
integration contracts are in [the assistant guide](strobi-assistant-ui.md).

## Privacy and authorization

Free-tier prompts/responses may be used by Google to improve products. The form
notice asks trainers to exclude personal/confidential information. Only prompt,
selected pillar, optional plan title and available department/position tags are
sent. Plan context is resolved on the server; forged client context is rejected.
Private-instance titles are omitted because they can contain trainee names. No
trainee relation, reflection, progress, stamp or material content is queried/sent.
Trainer prompts and plan/tag wording must themselves remain nonconfidential.

Generation stores only quota counts, subject IDs, calendar days and lease token/
expiry. Raw prompts, provider outputs/errors and keys are not logged or saved in
analytics. Temporary browser state is cleared when the creation session ends.

## API and failures

`POST /api/trainer/strobi` requires a trainer session, same-origin JSON and a valid
persisted trainer/admin. Available plans follow the existing trainer workspace's
shared access; missing/archived plans are rejected before quota reservation.

```json
{"prompt":"/strobi Practice reconciling sample entries","selectedPillar":"TECHNICAL","planId":"an-existing-plan-id"}
```

Omit planId for library creation. The service returns a validated proposal
(title, description, suggestedPillar, pillarRationale) and last-reported usage
(trainerRemaining, projectRemaining, resetsAt). Responses are no-store. JSON input
is bounded at 16 KiB and provider output at 64 KiB. Keys use a server request header,
not a URL. Structured output is validated again before application to fields.

| Result | Behavior / recovery |
| --- | --- |
| UNAUTHORIZED (401) | Sign in as a trainer; trainees cannot generate. |
| INVALID_INPUT (400) | Correct the prompt/fields; rejected input is not charged. |
| INACCESSIBLE_PLAN (404) | Reopen an available plan or create manually. |
| DISABLED / UNCONFIGURED (503) | Continue manually; administrator checks server configuration. |
| BUSY / DAILY_LIMIT (429) | Wait for the active request/reset; manual creation remains available. |
| PROVIDER_QUOTA (429) | Google minute/token/day limits may exhaust first; wait or continue manually. |
| TIMEOUT (504) | Retry explicitly or complete manually. |
| REFUSED / INVALID_OUTPUT / PROVIDER_UNAVAILABLE / UNAVAILABLE (503) | Rephrase/check model availability or try later; entries are preserved. |
| CANCELLED (499) | No late result is applied; already dispatched work may count. |

Cross-origin requests return 403. Origin matching uses the incoming Host authority
with the request protocol, so legitimate LAN/IP aliases work even when Next uses an
internal hostname. A client-supplied forwarded host cannot bypass this check. No automatic retries, model switches or paid
fallback occur. Check AI Studio model availability/quota when provider errors
persist; do not paste raw responses, signed URLs or credentials into issue reports.

## Quota, cancellation and retention

Short PostgreSQL transactions use a shared advisory lock to reserve trainer/project
counters and an expiring trainer lease atomically across processes. Defaults are
10 attempts/trainer/day, 50/project/day and one active request/trainer. A lease
lasts the provider timeout plus 30 seconds; no transaction spans an HTTP request.

Auth/input/config/context rejection and pre-admission cancellation consume nothing.
Proven cancellation after reservation but before dispatch refunds once while the
request owns its lease. Once dispatch is attempted, failure, timeout, cancellation
or uncertain delivery counts. A crash between reservation and dispatch conservatively
counts. Expiry recovers abandoned guards; old tokens cannot release a newer lease.
Cleanup failure leaves the lease to expire without retrying provider work.

App days/reset times use **Asia/Manila** and database time at reservation. Google's
provider RPD reset is Pacific time; other tools using the same provider project
also consume its allowance. Remaining app counts are a response-time snapshot.
All deployments sharing one Gemini project must share the quota database for the
application's project-wide cap to cover them together.

The server-only `cleanupStrobiQuota(prisma)` helper removes daily rows older than
seven days and leases expired over one day. Production operators must schedule
that helper in their trusted server maintenance job. **No host scheduler is
configured by this repository**, so the age policy is not automatic until scheduled.
Never delete current-day counts to reset allowances or expose cleanup publicly.
Cancellation propagates an AbortController signal where the host supports it;
timeout/lease recovery also handle disconnected clients. Google may still finish
work it already received. Stale results never overwrite newer manual input.

## Rollback

Set `STROBI_AI_ENABLED=false` and restart/redeploy; reload open forms. New admissions
stop, while in-flight requests finish or time out. Manual creation stays available.
Keep additive tables and usage counters during rollback. Do not reset the database,
remove training content or alter trainee progress/stamps. A separate reviewed
migration would be required to remove operational tables after all callers stop.

## Verification

```sh
npm ci
npx playwright install chromium
PASSPORT_BUILD_DIR=.next-mobile-check npm run build
npm run test:strobi
```

The 14-check suite owns temporary enabled/disabled servers on 3100/3102, fails if
ports are occupied, uses non-secret fake provider configuration and intercepts all
browser generation. It runs contract/config/provider/API/code tests, independent-
process PostgreSQL quota tests, a row-lock namespace regression and both shared/custom UI workflows, then stops
only its own servers. Database/storage fixtures are removed. The isolated schema test requires
DIRECT_URL to use a direct/session connection, never a transaction pool; it resets
session settings before disconnecting and checks that public tables remain visible. It makes no live
Gemini calls and never changes `.env`. Use STROBI_TEST_PORT and
STROBI_DISABLED_TEST_PORT to choose other unused ports; use PASSPORT_BUILD_DIR for
another prebuilt directory. Playwright is a pinned development dependency.

A **separate, explicit** one-request live browser check uses real server credentials:

```sh
# Terminal 1: temporary local server; saved .env can stay disabled.
STROBI_AI_ENABLED=true PASSPORT_BUILD_DIR=.next-mobile-check npm run start -- -p 3104 -H 127.0.0.1
# Terminal 2: consumes one real project request; generic prompt, no Save.
STROBI_LIVE_CHECK=true node --env-file=.env scripts/test_strobi_live_browser.cjs
# Stop the temporary server afterward.
```

The live check creates/removes a fixture trainer, generates editable fields, then
cancels without saving. It logs only status, lengths and request count; no raw
prompt/output, key, session token or signed URL. The real quota attempt remains
accounted for. It never runs automatically in the deterministic suite.

[Final verification evidence and acceptance matrix](strobi-rollout.md) records the
commands/results and remaining operator actions. Mocked checks do not establish
live provider availability.

## Official references

- [API keys](https://ai.google.dev/gemini-api/docs/api-key)
- [Models](https://ai.google.dev/gemini-api/docs/models)
- [Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Structured output](https://ai.google.dev/gemini-api/docs/structured-output)
- [Generate content API](https://ai.google.dev/api/generate-content)
- [Rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Terms](https://ai.google.dev/gemini-api/terms)
