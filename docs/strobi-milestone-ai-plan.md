# Strobi milestone assistance — implementation plan

Status: Plan and engineering defaults approved by the user on 2026-11-09.
Implementation is tracked by the GitHub issues linked below.

## Confirmed decisions

1. **Generate for trainer review (1A).** Generation populates an editable proposal.
   It does not save a shared definition, add a plan node, publish, verify or award
   a stamp. The existing explicit Save/Add actions remain responsible for writes.
2. **Suggest a pillar for confirmation (2B).** Strobi can recommend one of the five
   pillars. The trainer must accept it before the selected pillar changes.
3. **Use limited context (3A).** Send the trainer's request plus selected pillar,
   plan title and available department/position tags. Do not attach trainee
   identities, reflections, progress/stamp records or materials automatically.
4. **Separate prompt entry (4A).** Both creation forms get an Ask Strobi box that
   accepts `/strobi …` and a visible Generate button; manual entry remains usable.
5. **Explicit replacement (5A).** Empty fields can be populated on first generation.
   Existing text remains intact until the trainer explicitly applies the inline
   replacement proposal. Regeneration never silently overwrites their edits.
6. **More room for criteria (6B).** Increase the shared description/criteria limit
   from 500 to 2,000 characters across AI, manual creation and relevant editors.
   Titles retain the existing 100-character limit.
7. **Free-tier prototype (7A).** Use only nonconfidential prompts and context for
   the pilot. Provider project/model quotas must be checked at setup. No automatic
   paid-provider/model fallback or assumption of paid-service data treatment.
8. **Application limits (8A).** Allow 10 generation attempts per trainer per day,
   50 across the project per day, and one active request per trainer. Limits are
   configurable; lower provider quotas still apply.
9. **Inline pillar switching (9A).** Offer an explicit Use [suggested pillar]
   action. Accepting it changes the creation destination without losing entered
   text or the proposal. Refresh an untouched automatically generated code;
   preserve manually edited codes and validate them normally.
10. **All trainers (10B).** When the feature flag is enabled, every authenticated
    trainer can use it. There is no selected-trainer allowlist. Trainees cannot
    call the generation endpoint.

The requested scope covers both custom creation in the Path Builder and shared
milestone creation in the library/inspector. Materials remain manually attached
through the existing saved-milestone workflow. Codes remain application-generated
and validated, rather than trusting AI to guarantee uniqueness.

## Existing implementation constraints

- `components/canvas/CreateMilestoneModal.tsx`: currently fixes the pillar from
  its parent context and generates a role/pillar-based code. Accepting a different
  pillar will require explicit parent-context/placement and code handling.
- `components/admin/library/CreateSharedMilestoneForm.tsx`: permits pillar choice,
  validates/saves shared content, then hands off the real saved ID to materials.
- `lib/validations/milestones.ts`: code 3–25 characters with restricted syntax;
  title 3–100 characters; description/criteria 10–500 characters today. Decision
  6B requires aligning affected validators, forms, generation output and tests at
  10–2,000 characters without a new milestone lifecycle.
- Plan-only/shared-library choice, canonical protection, duplicate rejection,
  Save draft, Publish, progress preservation and stamps retain their semantics.

## Approved engineering defaults

- Keep proposals in the current open form only. Closing/discarding the form does
  not save an AI conversation or resume it later.
- Use one non-streaming structured response containing a title, combined
  description/verification criteria, suggested pillar and short pillar rationale.
  Generate competency codes in application code. Do not generate material links.
- Validate the response with Zod: title 3–100, description 10–2,000, pillar from
  the existing enum. Treat malformed, refused or empty output as a failed attempt;
  never persist or apply it. Prompt wording is not evidence of policy correctness.
- Disable repeated Generate while pending. Provide Cancel; invalidate cancelled
  or stale results so they cannot overwrite fields after edits, switching context
  or closing. Use a bounded server timeout. Manual editing stays available.
- Show inline errors for timeout, unavailable configuration, provider quota and
  invalid output. Retry is explicit, with no automatic retries or paid fallback.
- Reserve quota atomically before dispatch across server processes. An admitted
  provider request counts even if it fails or is cancelled; authentication/input
  rejection does not count. Use Asia/Manila calendar days and show remaining
  allowance/reset information. A provider quota failure may occur before app caps.
- Store only the minimal quota/operational metadata needed for enforcement; do
  not persist raw prompts or generated responses in analytics/logs. Durable quota
  enforcement may need an additive database migration, reviewed during phase 1.
- Keep the Gemini key and model selection server-only. Verify an available
  free-tier model with structured-output support at setup; do not hard-code an
  unverified model or expose the key through NEXT_PUBLIC variables.
- Reuse existing trainer authorization. Resolve plan context on the server and
  send only the agreed fields. Bound prompt length and ask trainers to exclude
  confidential/personal information. A free-tier notice explains this restriction.
- A visible Generate button works with plain text or an optional /strobi prefix;
  typing the command alone does not trigger a request.

## Workflow and layout

Both creation surfaces place a compact **Ask Strobi** prompt above the existing
manual fields, with Generate, pending/cancel state and usage feedback. The existing
form remains the primary editor. Show a replacement suggestion inline, alongside
Apply suggestion and Dismiss; do not add another modal.

Initial generation fills only empty text fields. If any affected field already
contains text, keep the proposal available for explicit application. Subsequent
generation requires Apply suggestion before replacing text. Applying wording does
not silently accept a different pillar: the separate Use [pillar] action updates
the destination and preserves the wording. Show the final destination clearly.

In the builder, Add to draft retains its current plan-only/shared-library choice.
In the library, Save shared milestone retains its existing create-only behavior.
Materials become available through the existing saved-ID flow. Save draft and
Publish retain their current independent effects.

## Ordered implementation tasks

### 1. Contract, limits and feature configuration

- Audit every description validator/editor affected by the 2,000-character limit;
  centralize the shared limit and retain existing code/title rules.
- Define the proposal schema, optional command normalization and bounded prompt.
- Add a server-only feature flag and configuration validation. Disabled or missing
  configuration leaves manual creation fully functional.
- Choose durable atomic quota storage; document any additive migration. Do not
  change milestone, progress, stamp or draft/publish models or semantics.

### 2. Gemini generation service

- Add an authenticated trainer-only action/service using authoritative context.
- Implement atomic quota reservation and an expiring active-request guard.
- Request structured output, validate locally and return typed proposal/errors.
- Add timeout/cancellation handling, safe operational logging and no paid fallback.
- Verify the chosen free model and project quotas against current Google docs.

### 3. Shared Ask Strobi interface

- Build reusable prompt, pending/error/usage and inline proposal controls.
- Track field edits so responses cannot silently overwrite newer manual work.
- Provide keyboard-accessible labels, focus behavior and mobile layout using the
  existing burgundy/gold theme.

### 4. Integrate both creation forms

- Integrate the library form without changing Save or material attachment logic.
- Integrate the builder modal; make explicit pillar switching update the parent
  destination without triggering its current field-reset behavior.
- Track whether the competency code is automatic or manually edited. Revalidate
  syntax and duplicates after accepted pillar changes and before normal saving.
- Preserve shared-library opt-in and all existing save/add/publish boundaries.

### 5. Verification and rollout documentation

- Test authorization, exact quota boundaries, concurrent requests, daily reset,
  provider failures, malformed output and stale/cancelled responses.
- Test empty-field filling, explicit replacement, manually edited code retention,
  accepted/rejected pillar suggestions and correct placement in both forms.
- Verify 2,000-character manual and AI descriptions through normal save/edit
  flows; reject over-limit values consistently.
- Verify generation alone creates no milestone, node, publication or stamp and
  changes no trainee progress. Confirm normal saving and uploads still work.
- Run relevant existing regressions, TypeScript checks and npm run build.
- Document server configuration, free-tier restrictions, quota behavior, manual
  fallback and feature-flag rollback. Live generation is a separate setup check
  once server credentials are configured; never include secrets in test output.

## Acceptance checklist

- [ ] Both creation forms offer the same optional Ask Strobi workflow.
- [ ] Trainers review/edit generated wording before the existing Save/Add action.
- [ ] Pillar changes are explicit and preserve text and manual codes.
- [ ] Codes pass application validation; materials are never AI generated.
- [ ] Description limits are aligned at 2,000 across affected flows.
- [ ] All authenticated trainers can use the enabled feature; trainees cannot.
- [ ] Daily limits and active-request protection work across server processes.
- [ ] Errors and cancellation preserve manual work and permit manual completion.
- [ ] Prompt/context privacy restrictions and free-tier notice are visible.
- [ ] Generation leaves draft/publish behavior, progress and stamps unchanged.
- [ ] Relevant checks/build pass and setup/rollback documentation is complete.

## Provider research

- [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output):
  JSON-schema output can support a constrained response; application validation
  remains required before showing/applying/saving fields.
- [Gemini data-use terms](https://ai.google.dev/gemini-api/terms): service tier
  affects treatment of submitted prompts/responses. This must be settled before
  live organizational context is sent.
- [Rate limits](https://ai.google.dev/gemini-api/docs/rate-limits): limits depend
  on the project/tier/model and should be checked in AI Studio during setup.

This planning work changes documentation only. Implement application changes through
the ordered issues; configure credentials separately without exposing secrets.

## GitHub implementation roadmap

Epic: [#48](https://github.com/jimcsy/Passport-TBG/issues/48).

1. [Phase 1: Define Strobi contracts, validation limits and feature configuration](https://github.com/jimcsy/Passport-TBG/issues/49)
2. [Phase 2: Implement authenticated Gemini generation and atomic quotas](https://github.com/jimcsy/Passport-TBG/issues/50)
3. [Phase 3: Build reusable Ask Strobi prompt and inline proposal controls](https://github.com/jimcsy/Passport-TBG/issues/51)
4. [Phase 4A: Integrate Ask Strobi into shared milestone creation](https://github.com/jimcsy/Passport-TBG/issues/52)
5. [Phase 4B: Integrate Ask Strobi into custom Path Builder milestones](https://github.com/jimcsy/Passport-TBG/issues/53)
6. [Phase 5: Verify Strobi end to end and document setup/rollback](https://github.com/jimcsy/Passport-TBG/issues/54)

Start with #49. Close each issue only after its acceptance criteria are verified.
