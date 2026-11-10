# Strobi Tips chat component

Phase [#59](https://github.com/jimcsy/Passport-TBG/issues/59) implements the reusable
chat UI and client transport. Phase #60 now mounts it across authenticated trainee
routes with current-module selection and session lifecycle handling. See the
[layout integration guide](strobi-trainee-tips-integration.md). Generation
contracts/authorization remain unchanged from #56–#58.

## Component and host contract

`components/trainee/strobi/StrobiTipsChat.tsx` exports `StrobiTipsChat` and the
typed `StrobiChatMilestone`/`StrobiTipsChatProps` interfaces.

- `sessionKey`: a stable, non-secret authenticated identity string, or null.
  Changing it remounts the entire session before another user's history can
  render; null removes the chat and aborts pending work. Never pass a JWT/cookie.
- `milestones`: current server-derived node ID, title, pillar, effective status,
  optional archive flag and revision marker. Map only these fields, not the full
  enriched passport/profile/reflection/material record. Backend checks remain
  authoritative; browser props do not grant access.
- `revision`: change when the assigned milestone snapshot changes, including
  wording changes not visible in the title. Removed/locked/archived nodes lose
  local history; changed pending context is cancelled and late output ignored.
- `availability`: the safe availability projection only (`available`, optional
  disabled/unconfigured reason), never the server key/model configuration.
- `currentNodeId`: optional module-route hint. A provided ID selects that context
  without generating. Null/undefined preserves an existing selection when moving
  to dashboard/passport; a fresh session with no hint chooses no arbitrary node.
- `onSessionExpired`: optional host callback for returning to sign-in/refetching
  authentication. A 401 already clears conversation/usage and hides the widget.

The #60 host mounts **one instance** under the persistent authenticated
layout. Do not key it by route or selected milestone: that would discard the
combined conversation. Clear its session on sign-out, expiry and identity changes,
and refresh milestone props when assignments/content/access change. The component
does not discover identity, poll page views or fetch a milestone list by itself.

## Appearance and interaction

- A labeled Ask Strobi launcher sits bottom-right; on mobile it is positioned
  above the existing bottom-navigation/safe-area space.
- Desktop (768px+) opens a 416px modeless native dialog. Materials, reflection and
  other page controls stay interactive. Mobile opens a full-screen native modal,
  with background scroll locked and focus contained inside the chat.
- Header: exact existing pillar mascot, Strobi Tips title, close button and current
  milestone selector. No new mascot assets or design-system replacement.
- A single scrolling timeline groups questions/replies with captured milestone
  headings. Switching the selector changes the next request, not old headings.
  Pending answers stay attached to their original node/question/revision.
- Exactly four preset question buttons. There is no text composer, attachment,
  automatic generation on hover/open/select/resize/navigation, or retry loop.
- The question controls/allowance help have their own bounded scroll area on short
  screens; the privacy notice remains visible outside that area. Timeline/footer
  scrolling does not force the whole mobile page to move.
- Generated, reused and prewritten tips have distinct text labels/icons. Plain
  strings/steps are React text, not HTML/Markdown/tools. Invalid responses never
  become interpreted markup or execute model actions.

The incumbent maroon/gold/cream, sans type, rounded controls and public PNG assets
are preserved. Selected mascot is taken from `STROBI_MASCOT_MAP`; archived/locked
selections still show the matching guide and explain why questions are unavailable.

## Requests, cancellation and access loss

`lib/ai/strobi-tips-client.ts` sends only `{ nodeId, questionId }` to the existing
same-origin POST API. It validates request/result contracts, uses same-origin
credentials/no-store/no redirects and exposes no server configuration. No previous
messages, personal records or materials are serialized. It makes no provider call.

One request may be active per widget. Cancel aborts the fetch, invalidates its
request identity and marks the captured exchange cancelled. A later result cannot
overwrite a new request, even if fetch ignores AbortSignal. Cancellation clears
last-known allowance rather than fabricating a refund; already-sent requests may
still count. Closing the panel keeps the session and allows a pending request to
finish quietly without reopening the chat.

API-reported lost/inaccessible/locked/archived/stale access clears prior tips for
that node immediately, clears that selection when current, and leaves the safe
error exchange. Other contexts survive. The denied node stays blocked until fresh
host metadata changes its signature. Prop-level removal or ineligibility also
clears its history; pending revision changes invalidate late answers. Session loss
clears everything, aborts work, closes the dialog and restores mobile scrolling.

## Allowance and fallback behavior

- Display only last-reported remaining/limit/reset values, formatted in Manila
  time; do not invent an initial balance or infer refunds.
- Zero remaining does not disable the buttons: an authorized cached tip can still
  be reused without a new generation, or the API can return a static fallback.
- Disabled/unconfigured safe availability uses the four validated prewritten tips
  locally, with no HTTP request. Only the host's current eligible nodes permit it.
- Valid server prewritten results preserve their reason/source. Network, malformed
  output and operational failures use clearly labeled local prewritten guidance;
  unauthorized/access errors do not masquerade as a successful AI answer.
- Materials and review remain independent; the chat never submits a reflection,
  changes a node/plan/progress record or awards/revokes a stamp.

## Accessibility and session lifetime

The dialog/selector/buttons have accessible names, focus-visible outlines,
Escape/close behavior and focus return. Mobile uses native inert behavior plus
explicit first/last Tab wrapping to cover browser edge cases. Resize changes
modal/modeless behavior without losing the conversation. Body overflow is restored
on close, viewport change and session unmount. Status updates use a polite atomic
live region; the timeline does not repeatedly announce its entire history.
Reduced-motion mode disables the pending spinner animation.

Conversation exists only in this component's authenticated layout memory.
Close/reopen and persistent-host navigation preserve it; refresh/unmount/sign-out/
identity change remove it. No localStorage, sessionStorage, database transcript or
provider conversation state is used. The server's seven-day generic tip cache is
a separate feature and is not the session transcript.

## Verification and scope

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/passport-strobi-browsers npm run test:strobi-tips-ui
npm run test:strobi-tips
npm run test:strobi-tips-api
npx tsc --noEmit
git diff --check
```

Use an installed Playwright browser path appropriate to the machine; the /tmp path
above is the verification environment's existing browser installation. Optional
`CHROME_EXECUTABLE_PATH` selects another executable.

The UI runner bundles real React/component code and actual app Tailwind/global
CSS, serves original mascot assets, and intercepts **every** trainee API call.
Only Next/Image is adapted to a plain image for the standalone fixture server.
It creates no app route, reads no .env, touches no database, spends no Gemini
allowance and changes no saved flag. The harness is not a production entry point.

Coverage: SSR without warnings, no server-only code in the browser bundle, four
explicit requests/minimal bodies, desktop background materials/review, all source
labels and zero-cap reuse, malformed/network fallback without retries, captured
mixed contexts, ignored-abort cancellation, stale revisions, all five mascots,
server access denial, empty/locked/archived states, identity/401/refresh clearing,
no browser persistence, modal/modeless resize, focus/Escape/scroll restoration,
320px long content, persistent notice, reduced motion and live announcements.

Visual captures are written to `/tmp/passport-strobi-tips-ui/desktop.png`,
`mobile.png` and `mobile-320-long.png`. Captures were viewed against the incumbent
system. The Impeccable detector returned no findings; the shipped finish reviewer
returned **ship** for this scoped component extension with no material visual
fixes. The documenter confirmed existing tokens/assets and left pre-existing
PRODUCT.md/DESIGN.md gaps unchanged. No redesign or system documentation rewrite
was authorized.

Actual trainee route mounting and integration regression are covered by [#60](strobi-trainee-tips-integration.md). Enabled live
Gemini smoke and final rollout are #61; mocked UI success is not live verification.

Recorded #59 result: all listed checks passed, including the final browser run
after server-denial history clearing. Visual reviewer rechecked that hardening
against recaptured states and retained **ship** at the component scope. No saved
flags, backend behavior, actual trainee routes or public assets changed; no new
dependencies, database access, real Gemini call, deployment, commit or push.
