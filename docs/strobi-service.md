# Strobi generation service (#50)

The server now supports `POST /api/trainer/strobi`. Shared and custom creation forms now use Ask Strobi behind the feature flag
(#51–#53). See `strobi-assistant-ui.md`; #54 covers final rollout verification. Manual workflows are
unchanged. AI remains unavailable until server configuration is enabled and valid.

## Local setup

1. Sign in to https://aistudio.google.com/api-keys and create/select a **Free** tier
   project. Keep billing unlinked for this prototype; code cannot turn a billed
   Google project into a free project.
2. Create a key and put it directly in local `.env`, never chat or source control:

   ```dotenv
   STROBI_AI_ENABLED=false
   GEMINI_API_KEY="your-real-key"
   GEMINI_MODEL="gemini-3.1-flash-lite"
   STROBI_TRAINER_DAILY_LIMIT=10
   STROBI_PROJECT_DAILY_LIMIT=50
   STROBI_REQUEST_TIMEOUT_MS=30000
   ```

3. Google recommends Gemini 3.5 Flash-Lite for new projects; 2.5 access is restricted
   to prior users and may return 404 despite appearing in the model catalog. Verify
   free-tier text generation and structured-output support for the selected model. Confirm availability and actual RPM/TPM/RPD in your
   project's **Usage → Rate limits**. There is no universally guaranteed free
   allowance. Lower application caps to match your project if necessary.
4. Deploy migrations with the project's usual `prisma migrate deploy` workflow,
   then regenerate Prisma client. This phase adds only `StrobiDailyQuota` and
   `StrobiRequestLease`, with RLS and revoked public/API-role access. Existing
   milestone, progress, stamp and plan tables are untouched.
5. Enable `STROBI_AI_ENABLED=true` only when ready to admit requests; restart the
   app after changing environment variables. For the current phase it is fine to
   keep false and validate the provider separately before UI rollout.

## Request/response boundary

Authenticated same-origin JSON fetch (include `Origin`, normally set by the browser):

```json
{"prompt":"/strobi A milestone for reconciling sample ledger entries","selectedPillar":"TECHNICAL","planId":"an-existing-active-plan-id"}
```

`planId` is optional for library creation. Client-supplied department/position,
identities or extra fields are rejected. Server context includes only selected
pillar, request, optional plan title and available department/position tags.
All authenticated persisted trainers/admins may manage available plans, consistent
with existing workspace access. Missing/archived plans are rejected before quota.
Private-instance titles are omitted because they can contain a trainee name.
No trainee relation, reflection, progress, stamp or material content is queried.
Trainers must still keep their own prompts and plan/tag wording nonconfidential;
free-tier prompts/responses may be used by Google to improve products.

Success returns `success`, `proposal` (title, description, suggestedPillar,
pillarRationale) and `usage` (trainerRemaining, projectRemaining, resetsAt).
Nothing is persisted to milestone/path/progress/stamp tables. The existing Save/Add
controls remain the only creation steps. Codes and materials are not AI output.

Failures expose only safe `code` values, optionally usage. Authentication is 401;
invalid input 400; inaccessible plan 404; quota/busy/provider quota 429; timeout
504; cancellation 499; other unavailability/refusal/invalid output 503. Disabled
or misconfigured AI does not throw errors into existing manual creation.
Cross-origin requests are 403. Request bodies are bounded at 16 KiB; provider
responses at 64 KiB. Responses are no-store. Keys use `x-goog-api-key`, not URLs.

## Dispatch, quota and cancellation

The atomic PostgreSQL implementation follows `strobi-quota-design.md`. A fixed
project-wide transaction advisory lock serializes short reservation/release work
across processes. No transaction spans a provider request. Every admitted request
increments trainer/project counters together and acquires an expiring token-owned
lease. Lease duration is configured request timeout plus 30 seconds.

Validation/auth/config/context/pre-admission cancellation consume no attempt.
Cancellation detected after reservation but before dispatch refunds both counters
once while still owning the lease. At dispatch, uncertain network delivery counts;
timeout, provider rejection and cancellation after dispatch are never refunded.
Crashes between reservation and dispatch conservatively count the attempt. Expiry
recovers abandoned guards. Old requests cannot release/refund a newer lease.
A cleanup failure leaves the lease to expire; it never retries provider work.

The route passes the request's abort signal to a bounded Gemini fetch; the UI in
#51 must use AbortController and reject stale results. Hosts can vary in how
quickly disconnects propagate, so timeout/lease recovery also bound server work.
Client cancellation cannot guarantee that Google stops a request already received.

Daily app quotas reset at Manila midnight, based on database time at reservation.
Google's RPD resets use Pacific time and project/model quotas may exhaust earlier.
Remaining counts are a reservation-time snapshot, not a guarantee against another
trainer's simultaneous request. No automatic retries, model switches or paid fallback.

## Retention and rollback

Only subject IDs, calendar days, counts and request lease token/expiry are stored.
No raw prompts, generated text, keys or provider error bodies are logged/stored.
The exported server-only `cleanupStrobiQuota` can be called by an operator job to
remove quota rows older than seven days and leases expired over one day; configure
its schedule when deploying. It is intentionally not exposed as a public route.
Current-day records must never be deleted to reset quotas.

Set the feature flag false and restart/redeploy to stop new admissions. In-flight
requests finish/timeout normally. Keep additive tables and usage counts during
rollback; do not reset any learning/progress data. Manual creation remains usable.
All deployments sharing a Gemini project must share the same quota database;
other tools using that provider project can still consume Google's quota.

## Verification commands

```sh
node --import tsx scripts/test_strobi_contracts.ts
node scripts/test_strobi_config.cjs
node scripts/test_strobi_service.cjs
node scripts/test_strobi_route.cjs
node --env-file=.env scripts/test_strobi_quota.cjs
# With the built app running on port 3100 and AI disabled:
node --env-file=.env scripts/test_strobi_http.cjs
npx tsc --noEmit
PASSPORT_BUILD_DIR=.next-mobile-check npm run build
```

Quota integration tests use an isolated temporary schema and independent OS
processes, then drop only that schema. They do not consume real portal quota.
They also verify real-table RLS, persisted trainer authorization, private context
omission, and no domain mutations. Provider failure tests use deterministic mocks.
Live model availability and actual account quotas require the configured Google
project; mock tests do not establish those facts.

## Official references (checked 2026-11-09)

- https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-lite
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/structured-output
- https://ai.google.dev/api/generate-content
- https://ai.google.dev/gemini-api/docs/rate-limits
- https://ai.google.dev/gemini-api/docs/api-key
- https://ai.google.dev/gemini-api/terms

## Live check — 2026-11-09

Saved key/model presence and default limits validated without printing values.
One generic, quota-accounted generation request to the initially recommended
2.5 Flash-Lite returned HTTP 404 / NOT_FOUND. A read-only model catalog request
succeeded (200), and listed the configured model and newer Flash-Lite models.
Catalog presence therefore does not establish generation eligibility. Google’s
current model overview restricts 2.5 access for new projects and recommends 3.5
Flash-Lite. No automatic model fallback or retry was made. Feature remains disabled;
no .env values were changed. Issue #50 awaits an explicitly selected supported model,
a successful live proposal, and project quota confirmation in AI Studio.

Reference: https://ai.google.dev/gemini-api/docs/models

For this free-tier pilot, select `gemini-3.1-flash-lite` explicitly: it appears in
the authenticated catalog and Google documents its free-tier text generation.
Verify project eligibility/quota before another generation test; this is a manual
configuration change, not runtime model fallback.

### Successful live verification

After the user explicitly selected Gemini 3.1 Flash-Lite, one quota-accounted
request returned HTTP 200 and passed the strict proposal validator (title 37
characters, description 523, COMMUNICATION pillar). The lease was released through
the normal service path. Feature remained disabled and no milestone was saved.
Two total dispatched test attempts used app allowance; failed dispatches count as
specified. No secret or generated text was logged. Actual free-tier project limits
still need confirmation in AI Studio; successful generation does not disclose them.

### Project quota confirmed

On 2026-11-09, the user provided an AI Studio screenshot confirming **Free tier**
and Gemini 3.1 Flash Lite limits of **15 RPM, 250,000 TPM and 500 RPD**. These are
observed project limits, not permanent provider guarantees. Screenshot usage is
peak usage over the selected 28-day range. The prior pending account-quota gate is
now satisfied; issue #50 is verified. Application defaults remain **10 attempts per
trainer/day and 50 project/day** with one active request per trainer. Provider
minute/token limits can still reject bursts; existing safe quota errors handle
this without automatic retries. No flag/key/model changes were made at closure.
