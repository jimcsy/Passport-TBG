# Strobi trainee layout integration

Issue [#60](https://github.com/jimcsy/Passport-TBG/issues/60), phase 5 of
[epic #55](https://github.com/jimcsy/Passport-TBG/issues/55).

## Current behavior

One `StrobiChatHost` lives inside the authenticated dashboard layout. The same
chat serves dashboard, passport and module routes. Desktop navigation preserves
the open panel and combined in-memory timeline; mobile navigation closes the
full-screen panel while retaining the timeline. Reload starts a fresh timeline.
No route visit or selector change generates an AI request.

An eligible module route selects its milestone without generation. Dashboard and
passport require an explicit first selection and retain an existing valid choice.
The selector uses the latest active assignment and the same effective progress
lookup as the existing module UI/API. Locked milestones remain blocked. An owned
removed/archived milestone can be represented for its current module route, but
cannot generate. Foreign IDs are never reflected in context results. Existing
manual module access and review rules are unchanged.

`GET /api/trainee/strobi/context` is an authenticated, read-only, private/no-store
endpoint. It rejects cross-site reads and returns only a non-secret session key,
assignment key, expiration, availability and milestone ID/title/pillar/status/
archive/revision fields. It does not return descriptions, profile data, materials,
reflections, keys, cookies or model configuration. It spends no quota and makes no
provider call. Existing generation authorization remains authoritative.

## Session and overlay handling

The host refreshes context on navigation, server layout updates, visible 30-second
intervals, focus, visibility resume and restored pages. Reads have a 10-second
bound; stale responses are ignored. Failed reads remove only the widget, leaving
normal learning controls usable. Identity/assignment changes discard the previous
chat and refresh page data. Milestone revisions invalidate stale local context.

Sign-out clears the chat before the existing server action runs and optionally
notifies other tabs through a transient BroadcastChannel. Expired/unauthorized
sessions clear chat and return to sign-in. Long-lived expiration timers avoid the
JavaScript timer overflow limit. No conversation is stored in browser persistence.
Existing stateless cookie semantics are unchanged; this adds no token revocation
store or new authentication policy.

On mobile the launcher sits above bottom navigation and safe areas. Chat uses a
native full-screen modal with focus containment, Escape/close and scroll restoration.
Route changes, including Back, close it. Short landscape viewports place the
conversation and question controls side by side, keeping the privacy notice visible.
Desktop remains a modeless panel. Notifications pages, notification popovers and
stamp celebrations hide/close chat without discarding its timeline; review and
stamp logic is unchanged.

## Feature flags and author guidance

`STROBI_TRAINEE_AI_ENABLED` remains independent of trainer `STROBI_AI_ENABLED`.
Disabled/unconfigured trainee AI still exposes prewritten guidance without a
provider request. Saved environment settings are not changed by this work.

The shared-library creation form and builder milestone create/edit forms display
the existing nonconfidential authoring notice. This is visible guidance, not a
claim that arbitrary entered content has been automatically sanitized. Materials,
progress, assignments, review decisions and digital stamps are not AI outputs.

## Verification

`npm run test:strobi-tips-access` covers real authenticated context reads using
owned database fixtures, whitelist validation, locked/archived/foreign contexts,
401/403 responses and unchanged learning/stamp/quota snapshots.

`npm run test:strobi-tips-integration` uses two dedicated production servers:

```sh
PASSPORT_BUILD_DIR=.next-mobile-check npm run build
PASSPORT_BUILD_DIR=.next-mobile-check STROBI_TRAINEE_AI_ENABLED=true STROBI_AI_ENABLED=false GEMINI_API_KEY=integration-fake-key GEMINI_MODEL=gemini-2.5-flash npm run start -- -p 3130
# In another terminal:
PASSPORT_BUILD_DIR=.next-mobile-check STROBI_TRAINEE_AI_ENABLED=false STROBI_AI_ENABLED=true GEMINI_API_KEY=integration-fake-key GEMINI_MODEL=gemini-2.5-flash npm run start -- -p 3132
# With both servers running:
PLAYWRIGHT_BROWSERS_PATH=/tmp/passport-strobi-browsers npm run test:strobi-tips-integration
```

Use the same configured local database/session environment as the app. The suite
creates and removes only its own public fixtures. All browser generation POSTs
are intercepted; fake provider credentials prevent accidental real generation.
It tests route persistence, assignment/identity changes, stale replies, sign-out,
expiry, no-plan states, flag independence, author notices, mobile Back and navigation,
notifications, first-open stamp celebration, and actual manual review submission.
It verifies original awarded hashes and zero trainee AI quota expenditure.
Captures are written under `/tmp/passport-strobi-tips-integration/` at 1280×900,
390×844 and 844×390. Stop only the dedicated servers you started.

Additional checks: standalone chat UI suite (including a short-landscape conversation/notice regression), service/route/contracts suites,
TypeScript, production build and diff whitespace check. Existing module-review
and stamp-notification browser regression cases also passed. Live enabled Gemini
verification and the final epic-wide matrix remain #61. No schema migration,
saved flag change, deployment, commit or push is part of #60.

Recorded result: all commands above passed, including the final actual-app run
and the added short-landscape regression after correcting the dialog display
specificity. The one Impeccable detector pass returned no component findings.
The visual reviewer found the three captures valid and the scoped interface
consistent; its sole persistence fix was to record the confirmed product contract
in `PRODUCT.md`. It scored that fix resolved with disposition **ship**, at that
fix's scope. System documentation comparison preserved the incumbent design.

Current final-verification status: [#61 rollout/evidence guide](strobi-trainee-tips-rollout.md). Live readiness remains unverified after Gemini HTTP 503; saved flags remain off.
