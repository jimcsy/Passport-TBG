# Ask Strobi reusable interface (#51)

`components/admin/strobi/AskStrobi.tsx` provides the optional inline assistant.
Its `useStrobiAssistant` hook owns temporary prompt/request/proposal state.
`lib/ai/strobi-client.ts` calls only the existing authenticated same-origin API
and validates response shapes; it contains no Gemini key/configuration access.

The component is now mounted in shared milestone creation in the library and the
builder’s shared-library inspector (#52). The separate custom milestone modal,
including plan-only content, remains #53. The saved feature flag remains disabled
until rollout.
No backend, database, Save/Add, materials, publication, progress or stamp behavior
is changed in #51. The fixture below is browser-test scaffolding, not an app route.

## Parent integration contract

Pass a stable `contextKey` for the open creation session, `isOpen`, optional real
`planId`, selected pillar, current title/description, optional `isSaving`, and safe availability state
(`available`, `disabled`, `unconfigured`). Compute availability on the server or
from a safe server response; never serialize the server configuration/key.

- `onApplyFields(patch)` updates **local wording only**. Merge partial patches using
  a functional state updater so code, pillar, checkbox and other fields are kept.
- `onUsePillar(pillar)` is a separate explicit local destination change. Preserve
  wording/proposal and manually edited codes; application-generated code updates
  belong to the parent integration in #52/#53.
- Keep the same context key when accepting a suggested pillar. Change it when the
  actual creation session changes. Pass `isOpen=false` on close, or unmount the
  component. A real close/reopen clears prompt/proposal state; nothing is resumed
  from storage. Selected-pillar changes invalidate pending responses while keeping
  an already received proposal available for explicit review.
- Do not disable the entire manual form while the assistant is pending. Only its
  Generate control is disabled. Existing Save/Add remains the sole persistence
  boundary; successful saving should close/reset the session to discard late work.

## Behavior

Typing plain text or `/strobi …` does not request generation. Generate (or
Ctrl/Cmd+Enter in the prompt) explicitly requests one proposal. First successful
generation fills only untouched empty title/description fields. If either field
was edited while pending—even edited then erased—no automatic filling occurs.
Existing wording is never overwritten automatically. Further generations always
require Apply suggestion before replacing wording.

Accepting wording never accepts a pillar. The actual destination is always shown;
Use [pillar] changes it explicitly. Codes and materials are never AI fields.
Applied wording is reviewed in the real fields below, avoiding duplicate previews.
Unapplied wording has a bounded, keyboard-scrollable inline preview. No extra modal.

Cancel, prompt changes, external destination changes, close/unmount, availability
or form-context changes abort/invalidate active requests. Monotonic request IDs
also discard late results when the transport cannot honor abort. Completion does
not steal focus. Cancel/Dismiss/Use pillar return focus to the prompt; Escape
cancels pending work without bubbling into the parent modal's close handler.

Errors are inline with explicit retry only. Disabled/unconfigured AI explains the
manual fallback. Invalid input dispatches nothing. Provider errors and cancellations
preserve manual fields. The component logs/stores neither prompts nor generated text.
Last-reported allowance/reset time is displayed in Manila time, since cancellation
or other trainers' requests can change counts before a new response arrives.
Sent requests may count even when cancelled; no automatic refunds are promised.

## Verification

```sh
# Playwright must be available; optionally set PLAYWRIGHT_MODULE to its module path.
node scripts/test_strobi_ui.cjs
npx tsc --noEmit
PASSPORT_BUILD_DIR=.next-mobile-check npm run build
```

The test first checks server pre-rendering for warnings, then bundles `scripts/fixtures/StrobiAssistantHarness.tsx` with the
real component and project Tailwind CSS. It starts a temporary local HTTP server,
intercepts every Strobi API request with deterministic fixture responses, uses
Chrome and cleans up the server and temporary bundle. It makes no live provider
calls or database writes. Never add this harness to production routes.

Coverage: inert typing; first/partial empty fill; existing wording; explicit apply,
dismiss and independent pillar acceptance; regeneration; edits during pending;
cancellation, ignored abort and out-of-order responses; prompt/context/pillar and
close/reopen invalidation; malformed/errors/manual retry; disabled/unconfigured
manual completion; keyboard shortcuts/focus; no implicit saves; and
320/390/768/1280 layouts with long wording and the longest pillar label.
Screenshots are written under the system temporary directory's
`strobi-ui-evidence` folder for visual inspection.

## Shared form integration (#52)

Both trainer server pages resolve configuration and pass only availability to
client components. They never pass the Gemini key/configuration object. The
library form omits plan context; the builder’s shared-library creation passes its
real plan ID so the generation service can resolve approved context on the server.

A local `LIB-{pillar}-{sequence}` code suggestion chooses the first free code in
the loaded library list. It is editable and is not a uniqueness guarantee: existing
server validation/create-only duplicate and canonical protection remain authoritative.
Untouched suggestions refresh with the chosen pillar. Once edited (including
cleared), a code stays manual across both suggested and dropdown pillar changes.

Each open form has its own mounted session. Close/cancel discards temporary fields
and assistant state. During explicit Save, `isSaving` invalidates pending AI work
and disables assistant changes while preserving prompt/proposal on save failure.
The submitted payload is captured before awaiting; successful creation still hands
the real saved ID to the existing inspector/material panel. No generation action
saves content, uploads materials, adds a plan node or publishes a version.

Additional verification:

```sh
node --import tsx scripts/test_shared_milestone_codes.ts
# Isolated built server: STROBI_AI_ENABLED=true PASSPORT_BUILD_DIR=.next-mobile-check npm run start -- -p 3100
# The browser test intercepts EVERY generation call; it never uses live Gemini.
node --env-file=.env scripts/test_strobi_shared_browser.cjs
STROBI_SHARED_SURFACE=builder node --env-file=.env scripts/test_strobi_shared_browser.cjs
node --env-file=.env scripts/test_milestone_creation_actions.cjs
node --env-file=.env scripts/test_milestone_library_reads.cjs
```

The integration test uses fixture trainers/definitions and a tiny real PDF upload.
It deletes only its fixtures and storage object after testing. Coverage includes
plain text and /strobi, independent pillar acceptance, code ownership, canonical
rejection with retained details/prompt, explicit saves, generated/manual 2,000-
character creation/editing, real-ID material access, cancelled sessions and mobile
layouts. Existing upload limits and independent Save draft/Publish behavior remain.

Verification on 2026-11-09 passed for both shared creation surfaces, the reusable
UI suite, code suggestions, existing creation actions, library read/browser suites,
TypeScript and production build. The complete existing plan-insertion browser suite
also passed, including preserved assignment, published curriculum and original
stamp. Longer builder checks required Playwright's matching test browser; system
Chrome 156 disconnected during those checks. Use the installed matching browser
(or set `CHROME_EXECUTABLE_PATH`) rather than treating a browser disconnect as an
application assertion failure. Browser downloads were temporary, not new app dependencies.
The saved disabled flag was separately verified with manual entry/save available.
