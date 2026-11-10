# Strobi trainee tips — planning decisions

Status: approved by the user; implementation tracked by [epic #55](https://github.com/jimcsy/Passport-TBG/issues/55) and phases #56–#61. Phases #56–#60 contracts/configuration, private cache/shared accounting, authorized trainee API, floating chat UI and authenticated layout integration are implemented. Final verification remains #61. See [contracts/setup](strobi-trainee-tips-contracts.md), [storage](strobi-trainee-tips-storage.md), [API](strobi-trainee-tips-api.md) and [UI](strobi-trainee-tips-ui.md) and [layout integration](strobi-trainee-tips-integration.md).

## Confirmed decisions

1. Guidance is scoped to a selected assigned milestone, not general questions.
2. Four preset questions only: explain the milestone, suggest practice, show an
   example, and help prepare for trainer review. No free-text input.
3. Provider context contains the selected milestone title, description (including
   verification criteria) and pillar. Materials, personal records, reflections,
   trainer comments and stamps are excluded.
4. A floating Strobi entry is available across trainee pages.
5. The interface shows a scrolling conversation with the preset question buttons.
6. Initial proposed application limits accepted: three generated tips per trainee
   per day, plus a shared project cap accounting for trainer generation too.
   Reusing a generated tip for unchanged milestone content makes no provider call.
7. Provider failure or exhausted limits offers a clearly labeled prewritten tip;
   materials and review submission remain available.
8. Module pages select their milestone automatically. Dashboard and passport
   pages offer selection from assigned milestones and display the selection.
9. Each answer is independent and uses only the selected milestone context;
   previous chat messages are not sent to the provider.
10. Visible conversation lasts for the current session only. Reusable generated
    tips are separate from chat history; no permanent account conversation.
11. AI tips are available for available and completed milestones in the active
    plan. Locked milestones show an unlock message; archived milestones retain
    their normal details without AI tips.
12. A generated tip can be reused across trainees for identical milestone content
    and the same preset question for up to seven days. Milestone content changes
    invalidate reuse. No personal context is included in a shared tip.
13. Floating chat opens as a compact bottom-right desktop panel and a full-screen
    mobile view with a close/back control. Strobi matches the selected pillar.
14. Keep the shared total cap at 50 dispatched requests/day across both features.
    Trainee dispatches also have an aggregate 40/day ceiling, preserving ten
    requests of capacity for trainer use. Trainer dispatches still reduce the
    shared total available to trainees; these are not separate additive budgets.
15. Show a short persistent free-tier notice in chat without a blocking consent
    dialog: AI may make mistakes, milestone text goes to Google, and only
    nonconfidential training content is suitable. Explain the restriction to
    milestone authors too.
16. Review preparation provides criteria-based checklists and practice questions,
    not a reflection to submit. Strobi never declares a trainee verified, submits
    a review or awards a stamp.
17. Keep one scrolling session conversation across milestone selections. Insert
    milestone headings so each question and answer has unambiguous context.
18. Answers should be around 60–120 words, with a short explanation or no more
    than three practical steps. Do not pad a simple answer to meet a minimum.
19. All authenticated trainees with eligible milestones may use the feature once
    enabled. Use a separate trainee-chat flag; keep it off until verified.

## Existing implementation facts

- Existing trainer defaults: 10 attempts per trainer/day, shared project cap 50,
  timeout 30 seconds. Application day resets at midnight Asia/Manila.
- Provider dispatch errors/timeouts count; existing quota semantics must remain
  explicit. Reused tips and prewritten tips must not consume generation attempts.
- Existing quota records contain operational metadata only. Tip storage requires
  separate design; no response cache currently exists.
- Server session and authorized assignment must determine allowed milestone
  context. Never trust client-supplied trainee identity or milestone wording.
- Verification criteria currently live inside the milestone description.

## Intended workflow and layout

1. A labeled Strobi launcher is available in the trainee layout. On mobile place
   it above the existing bottom navigation and safe area, away from other actions.
2. Opening the desktop panel keeps the module readable. Mobile opens a full-screen
   dialog with a header and close/back control, consistent with the agreed chat
   presentation rather than replacing the existing navigation tabs.
3. Header: Strobi mascot matching the selected pillar, "Strobi Tips", current
   milestone selector, and close control. Choose from authorized eligible current
   milestones; do not automatically choose an arbitrary milestone on dashboard.
4. On entering a module page, select its milestone if eligible. For a locked or
   archived module, show why tips are unavailable for it and allow selection of
   another eligible current milestone without changing the page's access rules.
5. Show a short persistent notice: "AI tips can be wrong. Milestone text is sent
   to Google, which may use free-tier content to improve its products. Use only
   nonconfidential training content. Your trainer decides verification."
6. Four fixed question buttons; no free-text composer or attachments:
   - Explain this milestone.
   - Give me a practice activity.
   - Show an example.
   - Help me prepare for review.
7. Append the selected question and answer to one timeline. Add a milestone
   heading when context changes; capture its title/pillar with each message so
   selecting another milestone never relabels old answers. A pending request also
   retains its original context. Answer generation never uses the timeline.
8. Identify the source accurately: AI-generated tip, reused AI tip, or prewritten
   practice tip. Show new-generation allowance separately from reusable tips.
9. Show loading and Cancel without claiming the tip has already been generated.
   Closing the panel does not discard the visible conversation. Do not generate
   automatically on opening, selection, navigation, polling or hover.
10. Session conversation remains only in the authenticated layout's memory across
    client navigation. Refresh, sign-out, session expiry or identity change clears
    it. No permanent transcript, browser localStorage or provider conversation.

Preserve burgundy/gold tokens, familiar controls and accessible text sizing. Keep
the panel within the existing page margins, avoid overlap with navigation, and
support 320px mobile widths, keyboard focus, Escape, focus return, reduced motion,
and announced loading/answer status. Mobile chat must fit dynamic viewport/safe
areas and scroll its message area without scrolling the page behind the dialog.

## Server context and answer contract

- Authenticate as trainee and resolve the latest active assignment on the server.
  Confirm availability with the same dependency/unlock rules used by the module
  UI, not merely membership in the active plan. Completion does not prevent tips.
- Browser submits only an authorized node identifier and an allowlisted question
  identifier. Reject arbitrary prompts, submitted context, role or trainee IDs.
- Provider gets only milestone title, description (including embedded criteria),
  pillar and the fixed question instruction. Personal details, progress, trainer
  feedback, reflections, materials and prior messages are not provider context.
- Treat milestone wording as untrusted content, not instructions. The system
  instruction bounds answers to learning guidance and the selected question.
- Use server-validated structured output with bounded plain text/steps. Reject
  malformed/empty/oversized output; never execute model tools, HTML or links.
- Do not invent access to materials or company policy, guarantee success, write
  the trainee's submission, verify a milestone or issue/revoke a stamp. Practice
  examples remain illustrative rather than claims about an individual's work.
- Verify authorization/current context again before releasing a result; obsolete
  requests must not replace the current selection. After access/session loss,
  remove affected selections and clear protected conversation state.

## Shared tip cache

This is an application database cache, not Gemini provider-side context caching.

- Key identical server-derived title/description/pillar, question ID, configured
  model, prompt version and output-contract version using a stable hash. Do not
  key by title alone or trust a client-supplied content hash.
- Cache only validated generic output and necessary version/expiry metadata.
  No trainee identity, session conversation, provider raw response or personal
  context belongs in the shared cached answer.
- Cache hits still require current authentication, eligible assignment and access
  checks. An entry's existence never grants access to its milestone or content.
- Expire after seven days; context/model/prompt changes invalidate reuse. Expired
  entries are unusable immediately. Add trusted cleanup and deployment scheduling
  instructions for physical deletion; do not claim scheduled deletion without a
  configured job. Keep response cache separate from operational quota metadata.
- Coalesce simultaneous identical misses using a bounded, cross-process lease:
  only the request that dispatches consumes attempts. Waiters may reuse the
  resulting validated answer, otherwise receive a fallback; no automatic retry.
- Use token ownership/expiry so abandoned or cancelled work cannot delete a newer
  request's lease. No database transaction stays open during provider HTTP work.
- Store entries behind server-only access/RLS. Do not expose a public cache API,
  put protected tips into public CDN caching, or allow trainee cache writes.

## Quotas, failures and configuration

| Allowance | Initial application limit |
| --- | --- |
| New provider attempts per trainee/day | 3 |
| All trainee provider attempts/day | 40 |
| Combined trainer and trainee attempts/day | 50 |
| Existing trainer per-person allowance | Unchanged: 10/day |

- Reuse the exact combined PROJECT budget/locking domain used by trainer
  generation. All deployments using that Gemini project must share accounting.
  Trainee aggregate 40 is a ceiling within total 50, not an additional allowance.
- Count/reserve all applicable budgets atomically across processes. Generalize
  role-qualified subjects without pretending trainee IDs are trainer IDs; retain
  existing counters and in-flight ownership through any additive migration.
- One active new-generation request per trainee across tabs/processes. Cache hits
  and prewritten tips make no provider call and consume no daily attempts.
- Preserve existing attempt accounting: dispatched failures, timeout, malformed
  output, safety rejection and post-dispatch cancellation count. Refund only
  provably pre-dispatch reservations, once, with correct ownership. Explain this
  briefly in quota help; never imply three guaranteed successful answers.
- Use database time for midnight Asia/Manila application-day boundaries. Google
  limits are separate and may reject requests earlier; do not equate the app's
  day/caps with the provider's limits/reset or promise free-tier availability.
- Handle 429/503, timeout, cancellation and stale responses without automatic
  provider retries, paid fallback or model switching. Bound timeouts and leases;
  explicit later clicks remain subject to allowances and provider availability.
- On exhausted limits or unavailable generation, use question-specific prewritten
  tips clearly labeled as such. Do not present these as generated or verified.
  Auth/eligibility failures explain access rather than generating anyway.
- Proposed separate flag: `STROBI_TRAINEE_AI_ENABLED=false`. It governs trainee
  AI independently of existing `STROBI_AI_ENABLED` trainer behavior. Reuse existing
  server-only Gemini key/model configuration; never expose credentials. A usable
  manual/prewritten experience remains when trainee AI is off/unconfigured.
- Show the configured limit/reset and remaining personal new-attempt count with
  appropriately refreshed server values. Existing generated cache hits can still
  be read at allowance exhaustion after authorization.
- No prompts, generated answers, secrets or protected context in logs/analytics.
  The intentional cache stores validated tips, not a shadow chat/audit transcript.

## Data and behavior boundaries

New backend work is required for trainee authorization, quota subjects, aggregate
budget enforcement, response cache and cache-miss leases. Use additive migrations
that retain trainer accounting and existing configuration behavior. This is not
only a UI addition.

Generation may write only its new cache and operational usage records. It must
not mutate learning paths, milestone definitions, materials, assignments,
TraineeProgress, review submissions, verification history, earned stamps or stamp
hashes. Existing module access, material use, manual reflection and trainer review
remain authoritative and must work regardless of AI availability.

Only nonconfidential milestone content is suitable for this free-tier design.
Repeat that constraint in relevant authoring guidance. A shared cache is not a
confidentiality filter; do not claim arbitrary authored text has been sanitized.

## Implementation sequence

1. **Contracts and configuration:** fixed question IDs, bounded answer schema,
   separate availability flag, server-only context boundary and fallback copy.
2. **Shared accounting and cache:** additive migrations; trainee subjects, 40/day
   aggregate, existing combined 50/day budget, seven-day cache and expiring leases.
3. **Trainee generation API/service:** assignment/unlock authorization, cache-first
   flow, Gemini structured generation, cancellation and safe error translation.
4. **Floating chat UI:** combined milestone-grouped session timeline, selector,
   four buttons, source labels, persistent notice and desktop/mobile presentation.
5. **Layout integration:** trainee-wide authenticated host, current-module context,
   route/session transitions, safe-area positioning and independent feature flag.
6. **Verification and rollout:** focused tests, existing trainer/progress/stamp
   regressions, type/build checks, opt-in live smoke, cleanup/operator guide and
   flag rollback. Enable only after acceptance is verified; no deployment implied.

## Acceptance checklist

- [ ] Only authenticated trainees can request tips for their currently eligible
  assigned milestones; locked, archived, foreign and stale requests are handled.
- [ ] All four preset questions work; arbitrary/free-text prompts are rejected.
- [ ] Provider receives only the agreed context; output is bounded and safely
  rendered. No history/materials/personal records are sent.
- [ ] Cross-trainee cache hits consume no request; correct context/question/model
  changes and seven-day expiry invalidate reuse; unauthorized cache reads fail.
- [ ] Concurrent identical misses coalesce; different requests enforce personal,
  aggregate and combined caps without changing trainer quota semantics.
- [ ] Trainer/trainee races, Manila midnight, lease expiry, pre-dispatch refund,
  stale tokens and dispatched failure/cancel accounting are tested in a real DB.
- [ ] One combined timeline preserves milestone headings/context under switching,
  pending work, navigation, repeated questions and close/reopen. Refresh/sign-out
  clears in-memory history; previous messages never influence AI generation.
- [ ] AI/generated cache/prewritten sources are distinct; failures, exhausted
  limits and disabled configuration preserve usable static guidance.
- [ ] Desktop/mobile views fit; keyboard, focus return, Escape, screen-reader
  announcements, reduced motion and bottom navigation remain usable.
- [ ] Generation changes no curriculum, assignment, materials, progress, review,
  stamp/hash or trainer verification record; existing regressions pass.
- [ ] Separate flags work in both directions, keys remain server-only, type checks
  and production build pass, and real Gemini smoke results are safely recorded.
- [ ] Migrations, cleanup scheduling, current project quota verification,
  diagnostics and rollback are documented. No auto-retry or paid fallback exists.

## Provider references

Checked against official Google sources during planning:

- [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits): limits
  depend on project/tier and can be checked in AI Studio; RPD resets Pacific time.
- [Gemini API additional terms](https://ai.google.dev/gemini-api/terms): unpaid
  service content may be used for product improvement, subject to applicable
  service/regional terms. This plan continues the nonconfidential-only pilot.

## Final review

Product choices are recorded above. Engineering defaults include session-memory
transcripts, versioned server-only cache, no automatic provider retries and
unchanged trainer behavior. The user confirmed this consolidated plan and authorized the implementation guide issues. Implement through the linked phases; verify acceptance before closing each issue.

## GitHub implementation guide

Epic: [#55 — Trainee Strobi Tips chatbot](https://github.com/jimcsy/Passport-TBG/issues/55). The epic embeds the complete approved specification so it is usable before this local document is committed.

- [x] [#56 — [ST-01] Phase 1: Define trainee tips contracts, configuration and fallback content](https://github.com/jimcsy/Passport-TBG/issues/56)
- [x] [#57 — [ST-02] Phase 2: Add shared tip cache, trainee quotas and cross-process leases](https://github.com/jimcsy/Passport-TBG/issues/57)
- [x] [#58 — [ST-03] Phase 3: Implement authorized trainee Gemini tips API and cache-first service](https://github.com/jimcsy/Passport-TBG/issues/58)
- [x] [#59 — [ST-04] Phase 4: Build accessible Strobi floating chat and combined session timeline](https://github.com/jimcsy/Passport-TBG/issues/59)
- [x] [#60 — [ST-05] Phase 5: Integrate trainee chat across dashboard, passport and module routes](https://github.com/jimcsy/Passport-TBG/issues/60)
- [ ] [#61 — [ST-06] Phase 6: Verify trainee Strobi end to end and document rollout](https://github.com/jimcsy/Passport-TBG/issues/61)

Work in the listed dependency order. Keep issue checklists open until acceptance evidence passes. Phase #61 verifies all earlier phases before closing the epic.
