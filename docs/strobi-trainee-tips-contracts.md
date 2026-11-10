# Strobi trainee tips: phase 1 contracts and configuration

Issue: [#56](https://github.com/jimcsy/Passport-TBG/issues/56), part of
[epic #55](https://github.com/jimcsy/Passport-TBG/issues/55).
The complete agreed design is in [the implementation plan](strobi-trainee-tips-plan.md).

Phase #56 defines pure contracts, instructions, prewritten tips and server-only
availability. Phase #57 adds [shared accounting/cache primitives](strobi-trainee-tips-storage.md).
Phase #58 adds the [trainee API and authorized provider service](strobi-trainee-tips-api.md).
Phase #59 adds the [floating chat component](strobi-trainee-tips-ui.md).
Phase #60 [integrates it across trainee routes](strobi-trainee-tips-integration.md),
including prewritten guidance when AI is disabled. Final verification remains #61.

## Server setup

Reuse the existing server-only `GEMINI_API_KEY`, `GEMINI_MODEL`,
`STROBI_PROJECT_DAILY_LIMIT` and `STROBI_REQUEST_TIMEOUT_MS`. Keep their values out
of client props, browser bundles, chat, logs and source control. Do not add
NEXT_PUBLIC equivalents or duplicate credentials for trainee use.

Optional trainee entries (defaults shown):

```dotenv
STROBI_TRAINEE_AI_ENABLED=false
STROBI_TRAINEE_DAILY_LIMIT=3
STROBI_TRAINEE_PROJECT_DAILY_LIMIT=40
```

These reuse the existing combined project allowance of 50 and provider timeout of
30,000 ms unless those shared settings have been explicitly configured already.
The existing trainer's per-person default remains 10; this phase does not change
any trainer configuration or accounting code. Provider eligibility/quotas remain
environment-specific; do not assume an application allowance guarantees a
successful provider call or free-tier availability.

`getStrobiTipsConfiguration()` is server-only and independent of the existing
trainer `getStrobiConfiguration()`:

| Trainer flag | Trainee flag | Valid shared settings |
| --- | --- | --- |
| false | false | Both AI features unavailable |
| true | false | Trainer AI available; trainee AI unavailable |
| false | true | Trainee configuration available; trainer AI unavailable |
| true | true | Both configurations available |

Only the exact string `true` enables trainee configuration. Missing credentials,
invalid model/timeout or incoherent trainee limits fail closed as `unconfigured`.
Missing/disabled flag returns `disabled`. Neither state throws, logs configuration
or blocks pure prewritten tips. `getStrobiTipsAvailability()` exposes only
`{ available: true }` or `{ available: false, reason }` to future client components;
never pass the full configured result to a browser.

Limits must be positive integers. Personal trainee limit must not exceed the
trainee aggregate limit, and aggregate must be at most the shared project limit
minus ten reserved requests. For example, 3/40/50 is valid, but 3/41/50 is not.
If an existing shared project cap is lower than 50, explicitly lower the trainee
settings to preserve that relationship; the app does not enlarge the project cap
or alter trainer behavior. Invalid trainee-only settings do not disable trainers;
invalid trainer-only settings do not disable trainee configuration. Invalid
shared provider/project settings affect whichever feature depends on them.

## Requests and authorized context

The browser contract accepts exactly:

```json
{ "nodeId": "assigned-node-id", "questionId": "EXPLAIN_MILESTONE" }
```

| Question ID | Button label |
| --- | --- |
| EXPLAIN_MILESTONE | Explain this milestone |
| PRACTICE_ACTIVITY | Give me a practice activity |
| SHOW_EXAMPLE | Show an example |
| PREPARE_FOR_REVIEW | Help me prepare for review |

Node IDs are trimmed, nonempty and at most 200 characters. Extra fields and
arbitrary question IDs are rejected, including prompts, history, client context,
trainee IDs, role, cache key, materials and milestone wording. This validation is
not authorization: phase #58 must resolve the trainee session, active assignment
and unlock/completion eligibility before any cache read or generation.

Server context contains only title (existing 3–100 limit), description (existing
10–2,000 limit, including verification criteria) and existing pillar enum value.
No new criteria database field is invented. Passing an enriched context object
with user records/materials/feedback/progress is rejected instead of silently
serializing it. `prepareStrobiTipRequest()` accepts only this exact context and a
fixed question; it prepares one structured Gemini body without dispatch or writes.

## Answer and result contracts

- Provider answer: `{ answer: string, steps: string[] }`, strict and plain text.
- Answer field at most 1,200 characters; each of at most three steps at most 400.
  Combined answer/steps at most 1,600 characters and **120 whitespace-separated
  words**. Shorter than 60 words is valid; empty answer/steps are not.
- Reject HTML tags, web/active-data URL schemes, unsafe control/bidi formatting
  characters and extra fields such as tools, function calls, reflection or stamps.
  The UI in #59 must render escaped text, never HTML, interpreted Markdown or tools.
- Instructions aim for 60–120 words and no more than three practical steps. The
  server in #58 must apply the answer validator even when Gemini accepted its JSON
  schema; JSON schema alone cannot enforce every combined-text refinement.
- Prompt/contract versions are explicit constants for future cache keys. Context,
  question, model or instruction/schema changes must invalidate cache reuse.

Successful generated/reused results contain `success: true`, source `GENERATED` or
`REUSED`, `tip` and validated `usage`. Prewritten success uses source `PREWRITTEN`,
`tip`, a known operational fallback `reason` and optional usage. Source labels are
"AI-generated tip", "Reused AI tip" and "Prewritten practice tip".

Failures contain only `success: false`, an allowlisted safe `code` and optional
usage. Raw provider exceptions/details are not response fields. Unauthorized,
inaccessible, locked, archived, stale-context and cancelled results cannot be
turned into prewritten success by the fallback helper. Access checks remain the
service's responsibility; cancellation must not append an unsolicited new answer.

Usage requires numeric configured limits, nonnegative integer remaining counts
within each corresponding limit, an ISO timestamp with timezone for `resetsAt`,
and the literal timezone `Asia/Manila`. Unknown fields/invalid dates are rejected.
  The database implementation in #57 is responsible for computing actual current
counts and midnight boundaries; these contracts do not manufacture usage values.

## Guidance, fallbacks and privacy

All four question-specific prewritten tips are generic and bounded by the same
answer contract. `getPrewrittenStrobiTip(questionId, reason)` returns a freshly
validated result, never shared mutable content. No credentials/config/network are
needed. Future integration must check eligibility before offering protected tips.

Strobi can explain, illustrate and suggest practice. Review preparation offers a
criteria-based checklist and practice questions, not a submitted reflection.
Instructions treat authored text as untrusted data and forbid inventing company
policy, legal requirements, materials or personal facts, acting on embedded
instructions, claiming completion, submitting reviews or awarding/revoking stamps.
Prompt instructions are a boundary, not proof of answer accuracy; output validation
and the trainee/trainer workflow remain necessary.

Client-safe copy includes a persistent Google/free-tier/accuracy notice, authoring
guidance requiring nonconfidential milestone wording, attempt-accounting help and
safe error messages for every known failure. Phases #59–#60 now render these in
the chat and relevant milestone authoring forms.

No personal or historical context is included in generation. A shared tip cache
is not a confidentiality filter: authored milestone text must itself be suitable
for the free-tier pilot. The planned seven-day application cache stores only
validated generic tips plus metadata; operational quota records are separate.
The combined conversation is in layout memory only and is never provider context,
a database transcript or localStorage. Refresh/sign-out/identity change clears it.

## Operational policies for later phases

- One active new request per trainee; atomic 3/person, 40/trainee aggregate and
  existing shared 50/project admissions across server processes.
- Cached/prewritten tips cost no attempt. Once dispatched, failure, timeout,
  invalid output, refusal and cancellation count. Only provably pre-dispatch work
  can be refunded once by its owner. No automatic retries, model switch or paid
  fallback; no open transaction during provider HTTP work.
- Application reset uses database time at midnight Asia/Manila. Google's quota
  and reset are separate. Exact reset/lease/cache enforcement belongs to #57/#58.
- Seven-day cache TTL, context/version invalidation, owned cross-process miss
  leases and trusted cleanup require the next phases. Document any scheduler
  deployment explicitly rather than claiming cleanup is already scheduled.
- All existing manual learning, materials, review, trainer generation and
  verification/stamp workflows remain unchanged regardless of AI availability.

## Verification

Phase #56 uses no live Gemini calls, database access, saved `.env` read/write or
feature enablement. Run:

```sh
npm run test:strobi-tips
node --import tsx scripts/test_strobi_contracts.ts
node scripts/test_strobi_config.cjs
node scripts/test_strobi_service.cjs
node scripts/test_strobi_route.cjs
npx tsc --noEmit
git diff --check
```

The focused suite covers strict inputs/context/outputs/results, combined answer
limits, all fallbacks, coherent usage/config, all flag combinations, missing
credentials, trainer preservation, minimal prompt payloads and credential-free
client content bundling with server-only import rejection. The remaining checks
exercise the existing trainer assistant's unchanged contracts/config/service/API.
Live trainee generation belongs to final phase #61, after service/UI integration.

Recorded phase #56 result: all listed focused/trainer checks and TypeScript passed; `git diff --check` passed. The browser-safe content bundle excludes configuration/prompt modules and environment access; bundling either server-only module as a client entry is rejected. No provider request or saved feature-flag change was made.
