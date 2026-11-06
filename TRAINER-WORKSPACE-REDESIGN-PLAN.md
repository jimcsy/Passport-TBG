# Trainer content workspace redesign plan

Date: 2026-11-06
Status: Implemented and reviewed on `feat/trainer-content-workspace`; tracked by [GitHub epic #35](https://github.com/jimcsy/Passport-TBG/issues/35).
Scope: Trainer content management. Implementation proceeded through the approved dependency-linked issues.

Handoff: [trainer usage guide](docs/trainer-content-guide.md) · [screenshots, evidence and limitations](docs/trainer-content-handoff.md) · [regression checks](docs/trainer-content-regressions.md).

## 1. Objective

Make managing reusable milestones, materials, and training plans one coherent workflow, informed by LinkedIn Learning's administration patterns and expressed in the existing BEAT design system.

Primary task journey:

**Find or create a milestone → manage its materials → add it to a plan draft → arrange the curriculum → review impact → publish.**

Success means trainers can complete that journey without losing context, reloading to locate newly created content, or confusing shared content changes with plan-draft changes.

## 2. Decisions agreed in the interview

| Decision | Agreed direction |
| --- | --- |
| Priority | Improve content management first, rather than redesigning the entire trainer workspace. |
| Organization | One **Training Content** area with **Training Plans** and **Milestone Library** tabs. |
| Plan editor | Open plans in a curriculum outline; keep Canvas as an optional view. |
| Library editing | Searchable list and contextual right inspector; full-screen inspector on mobile. |
| Milestone creation | Save a reusable milestone, then upload materials in the same inspector without reloading. |
| Library presentation | Compact rows showing code, title, pillar, material count, and usage. |

Keep burgundy/gold branding, the five pillars, existing plan identities, and the trainer-verified passport model. Reuse the recent compact catalog and builder improvements.

## 3. Reference patterns and their TBG adaptations

LinkedIn documents administration areas for People, Content, and Insights. Borrow its grouping by task to consolidate content management; retain TBG's existing review and trainee destinations. [LinkedIn administration overview](https://www.linkedin.com/help/linkedin/answer/a700823/linkedin-learning-management-admin-pages-overview?lang=en).

LinkedIn's documented learning-path editing supports sections and drag-and-drop ordering. Adapt this as five pillar sections with ordered milestone rows and accessible reorder controls. [LinkedIn learning-path editing](https://www.linkedin.com/help/linkedin/answer/a725414/how-can-admins-edit-or-update-a-learning-path-or-collection-?lang=en-US).

Its documented creation flow starts from a content library and supports new or copied learning paths. Adapt the library entry point to our reusable milestones and existing master/variant hierarchy. [LinkedIn learning-path creation](https://www.linkedin.com/help/linkedin/answer/a599875).

These are interaction references, not a specification of LinkedIn's exact current screen appearance. Public guides and screenshots span different interface versions. The TBG layouts below are our proposed design.

## 4. Vocabulary and scope boundaries

| Term | Meaning in this project |
| --- | --- |
| Master | Universal foundation template. |
| Role variant | Reusable department/position training track. |
| Instance | Individual trainee's assigned path. |
| Pillar / development path | One of the five existing categories within a plan. |
| Milestone | Competency requiring trainer verification. |
| Material | MP4, PDF, or PPTX attached to a shared milestone definition. |
| Stamp | Trainer's verified award, with existing verification and revocation history. |

Do not introduce a new Course model or rename milestones into courses. The current mobile shortcut **New Course** creates a role variant; align that label with its actual action.

Preserve:

- One corporate master and its role variants, with individual instances accessed through trainee profiles.
- Draft/published snapshots, version history, recipient selection, and publish-impact previews.
- Existing assignment, reconciliation, customization, progress archival, verification, revocation, and audit rules.
- Canonical BEAT milestone protections and existing authentication/authorization boundaries.
- Private Supabase storage, signed access, and the current 50 MB per-file limit for MP4/PDF/PPTX.
- Trainee navigation, passport, Strobi, notification, reflection, and review workflows.

Exclude new watch tracking, automatic completion, quizzes, ratings, certificates, thumbnails, recommendation engines, and engagement analytics. New read queries and narrowly scoped action fixes are identified below; no schema changes are expected for the agreed design.

## 5. Implemented information architecture

Preserve the existing four main trainer destinations. Rename **Training Plans** to **Training Content** and place the two content tabs inside that area.

```text
Trainer navigation
  Hub
  Verifications
  Training Content
    Training Plans
    Milestone Library
  Trainees
```

Implemented routes preserve existing bookmarks and links:

| Screen | Route |
| --- | --- |
| Training Content / Training Plans | `/trainer/plans` |
| Training Content / Milestone Library | `/trainer/plans/library` |
| Selected library milestone | `/trainer/plans/library?milestone=<id>` |
| Plan curriculum editor | `/trainer/plans/[id]/builder` |

Opening a URL must not create a milestone, modify a plan, or publish content. Selected-row and filter query parameters describe view state only.

## 6. Screen layouts in words

### 6.1 Training Plans tab

- Page heading: **Training Content**.
- Local tabs: **Training Plans** and **Milestone Library**.
- Keep the existing compact foundation summary and **Edit master** action.
- Keep role variants as divided rows with title, department/position, version, milestone count, and enrolled count.
- Retain **Create role variant**, search, status filtering, inline metadata editing, and contextual deletion.
- A plan title or **Edit plan** opens the curriculum outline.
- Preserve all existing variant creation, promotion, metadata, deletion, and publishing capabilities.

### 6.2 Milestone Library tab — desktop

```text
Training Content
[ Training Plans ] [ Milestone Library ]                 [ Create milestone ]

[ Search code or title... ] [ Pillar ] [ All / BEAT / Custom ]

Code / title             Pillar       Materials    Used in plans
Milestone row            Onboarding       3              2
Selected milestone       Technical        1              4   | Inspector
Milestone row            Leadership       0              1   | Details
...                                                         | Materials
                                                            | Used in plans
```

- Use compact divided rows, not nested cards or mandatory imagery.
- Display standard/custom origin as text. Do not invent a library Draft/Published lifecycle.
- Clicking the title or its keyboard-accessible control selects the row and opens the inspector.
- Keep search, filters, selection, and list scroll position when editing or closing the inspector.
- Show meaningful loading, no-results, empty-library, failure, and retry states.
- A milestone with zero materials remains valid; do not impose a new completion requirement.

### 6.3 Contextual inspector

Reuse common editor sections with explicit context; do not expose controls that cannot be saved in that context.

| Context | Details | Materials | Stamp design | Usage |
| --- | --- | --- | --- | --- |
| Shared library milestone | Edit permitted custom fields; protect canonical BEAT metadata. | Shared file management. | No global stamp-design control: this belongs to plan nodes. | Referencing plans and affected active trainees. |
| Milestone in a plan draft | Existing draft-local editing rules. | Shared file management when linked to a saved definition. | Existing plan-node customization. | Shared-material impact information. |
| Published plan milestone | Existing read-only content inspection. | Preserve existing access rules; do not grant editing through a read-only inspector. | Read-only display. | Contextual reference information. |

Inspector order:

1. Milestone code/title, context label, and close control.
2. Details, with a clear save action and existing validation.
3. Materials, with upload/preview/download/reorder/delete actions already supported.
4. Used-in-plans information and links.
5. Contextual **Add to plan** or **Add to this draft** action where applicable.

Explain scope at the relevant controls:

- **Shared details:** existing custom-library updates also synchronize matching draft nodes; published snapshot metadata remains unchanged.
- **Materials:** changes affect references to this shared milestone, including published plans and historical versions.
- **Plan content:** draft-local changes require the existing save/publish flow.

Preserve staged edits when changing selection or resizing. Cancel explicitly discards the selected form's staged edits. Do not imply that saving a plan automatically applies unsubmitted inspector fields.

### 6.4 Curriculum editor

- Default to the existing outline with the five pillar sections and ordered milestone rows.
- Keep collapsible path navigation and Whole plan access.
- Selecting a milestone opens the contextual inspector.
- Keep both pointer reordering and explicit move controls.
- Keep **Canvas** reachable through the existing view switch, including its connections, arrangement, zoom, and inspection capabilities.
- Keep versions and save/publish controls available with existing semantics.
- **Add milestones** opens a searchable reusable-content picker. Default its filter to the current pillar, with a visible way to browse all pillars.
- A new shared milestone can be created and supplied with materials from that picker using the same create-and-upload editor.
- Retain the existing plan-only custom milestone option; do not silently convert a private draft milestone into a shared definition to make uploads possible.

### 6.5 Mobile

- Preserve the existing bottom trainer navigation; update only the content destination label/accessibility text.
- Keep the two local content tabs visible and usable.
- Reflow library columns into compact rows with readable metadata and 44 px touch targets.
- Selecting or creating a milestone opens a full-screen inspector with independent scrolling.
- Restore list position, filters, selection, and focus when the inspector closes.
- Keep the focused-pillar outline and existing path selector; never stack the entire library beneath the full curriculum.
- Preserve access to Save draft and Publish without introducing a competing floating action stack.

## 7. Current implementation facts and prerequisites

Source review on 2026-11-06 found:

| Existing capability | Reuse / required supporting work |
| --- | --- |
| `TrainingPlanCatalog.tsx` already provides compact rows, filters, and inline details. | Reuse it inside the content tabs; do not rebuild completed features. |
| `PlanCanvasBuilder.tsx` already supports outline, collapsible navigation, and a responsive inspector. | Change the default view and integrate the shared content workflow. |
| `getLibraryMilestones()` returns milestone definitions. | Add authenticated list/usage reads for material counts and plan references. |
| `createCustomLibraryMilestoneAction()` currently upserts by code. | A duplicate code can update an existing definition. Introduce validated create-only behavior before exposing the new creation entry point. |
| The builder creates a synthetic `custom-def-*` ID and does not await shared registration. | Await persistence and retain the real returned ID before enabling upload. Report failure without claiming the library item was saved. |
| `updateCustomLibraryMilestoneAction()` protects standard metadata and updates matching draft nodes. | Preserve that scope and make it visible in the UI. |
| Materials already have upload authorization, confirmation, cancellation, preview, ordering, and deletion actions. | Reuse these; do not build a second storage pipeline. |
| Library deletion removes shared materials and detaches definition references. | Preserve existing rules, clearly disclose impact, and protect canonical definitions. Do not invent an archive lifecycle. |

Usage counts must be precisely labeled: count distinct reusable master/variant plans separately from private trainee instances and historical version references. Show affected active trainee counts separately. Materials impact must not be understated by showing only current catalog variants.

## 8. Ordered implementation tasks

Each task should be independently reviewable. Complete its acceptance criteria before advancing to a dependent task.

### Phase 0 — Establish safe reusable-content operations

#### TC-01 — Make shared milestone creation safe and reliable

Dependencies: None.

- [x] Validate shared creation on the server using the existing milestone field constraints.
- [x] Make creation reject duplicate codes without updating an existing definition, including canonical milestones.
- [x] Preserve authentication and existing canonical protections.
- [x] Return the actual persisted milestone ID and handle concurrent duplicate creation cleanly.
- [x] Await the result in the creation UI; do not use a synthetic ID for upload authorization.
- [x] Show success only after persistence succeeds; preserve entered fields on failure.

Acceptance: Two attempts using the same code cannot overwrite existing content. A failed request creates no optimistic success message or upload target. A successful request returns a usable definition ID. No plan is published or trainee progress changed.

#### TC-02 — Add library list and usage reads

Dependencies: None; required by TC-05 and TC-06.

- [x] Provide authenticated milestone listing with real material counts and correctly labeled usage information.
- [x] Support code/title search, pillar, and standard/custom filtering.
- [x] Resolve plan references using existing definitions and plan nodes; distinguish current/draft references from history and private instances.
- [x] Identify matching draft nodes affected by shared metadata updates, including existing code-based fallback behavior.
- [x] Avoid a separate database request for every row.
- [x] Keep storage paths, signed URLs, credentials, and trainee-private details out of list responses unless specifically needed and authorized.

Acceptance: Counts are deduplicated and reproducible from fixtures. Usage does not treat every version as a separate reusable plan. Existing trainer access rules remain enforced. No schema migration is required.

### Phase 1 — Introduce the content workspace

#### TC-03 — Add Training Content navigation and local tabs

Dependencies: None.

- [x] Rename the trainer content destination while retaining the four main destinations.
- [x] Add the two local tabs and the `/trainer/plans/library` route.
- [x] Preserve existing plan, builder, and `?create=1` entry links.
- [x] Keep selected-tab and keyboard/focus states clear on desktop and mobile.
- [x] Rename the misleading New Course shortcut to its actual role-variant action.

Acceptance: Both tabs are directly addressable; existing links still work. Mobile navigation remains usable. URL navigation performs no content mutation.

#### TC-04 — Integrate the existing plan catalog

Dependencies: TC-03.

- [x] Place the existing master summary and variant rows under the Training Plans tab.
- [x] Preserve enrolled counts, filters, inline metadata, creation, deletion, and builder links.
- [x] Keep individual instances accessible through trainee profiles, outside the reusable catalog.

Acceptance: Exactly one master remains visible. Existing variant workflows continue to work. No duplicate editor, extra confirmation, or mandatory modal is added to routine catalog editing.

### Phase 2 — Deliver library browsing and contextual editing

#### TC-05 — Build compact library rows

Dependencies: TC-02, TC-03.

- [x] Add the agreed row layout, counts, search, and filters.
- [x] Provide a keyboard-accessible milestone selection control and a clear selected-row state.
- [x] Use URL view state for selected milestone and relevant filters; preserve Back behavior without writes.
- [x] Implement loading, empty, no-results, retry, and long-content states.
- [x] Adapt the same information to compact mobile rows.

Acceptance: A trainer can find and select an existing milestone without entering a plan. Filters and scroll position survive inspector use. No horizontal overflow at supported widths.

#### TC-06 — Reuse the inspector with explicit editing contexts

Dependencies: TC-02, TC-05.

- [x] Reuse existing inspector/form/material components with a clear shared-library or plan-draft context.
- [x] Add Details, Materials, and Used-in-plans sections.
- [x] Preserve canonical protections, draft-local editing, and existing shared-update behavior.
- [x] Keep plan-node stamp design controls out of the global library definition editor.
- [x] Make shared material impact visible before replacement/deletion.
- [x] Retain staged edits, pending/error states, native mobile focus containment, Escape behavior, and focus return.

Acceptance: Trainers can identify what will change before saving. Library edits do not silently publish plan metadata or verify competencies. Nested material previews close without dismissing the underlying inspector.

### Phase 3 — Complete creation, upload, and plan insertion

#### TC-07 — Create and upload in one inspector session

Dependencies: TC-01, TC-06.

- [x] Add Create milestone with code, title, description, and pillar.
- [x] After successful persistence, transition the same inspector into material management using the real ID.
- [x] Preserve entered metadata and list context during that transition.
- [x] Reuse existing MP4/PDF/PPTX validation, 50 MB limits, signed upload, confirmation, and cleanup behavior.
- [x] Keep a saved milestone available when an upload fails or is canceled; allow retry without duplicating the milestone.
- [x] Clearly distinguish saving shared content from adding it to a plan draft.

Acceptance: Create → upload → preview requires no page reload or searching for the new item. No file upload starts before a valid saved milestone exists. Zero-material milestones remain valid. Canceling file upload does not silently delete the saved milestone.

#### TC-08 — Connect reusable milestones to plan drafts

Dependencies: TC-04, TC-06, TC-07.

- [x] In a plan context, offer Add to this draft without asking the trainer to select the same plan again.
- [x] In library-only context, offer an eligible master/variant plan picker and open the existing editor with an explicit add intent.
- [x] If a plan is published, use its existing create/open-draft workflow before insertion.
- [x] Require an explicit Add to draft action; never mutate a plan merely by visiting a link.
- [x] Reuse existing duplicate prevention, pillar matching, placement, ordering, and connection rules.
- [x] Keep Save draft and Publish as separate existing operations.
- [x] Retain the current plan-only custom creation option without silently sharing its content.

Acceptance: The correct saved definition is linked, its materials are available, duplicate insertion is blocked, and active trainees receive no new assignment or changed curriculum before the existing publish flow is completed.

### Phase 4 — Make curriculum editing the default

#### TC-09 — Open plans in the outline and retain Canvas

Dependencies: TC-04; TC-08 for the integrated add flow.

- [x] Default a fresh editor session to the curriculum outline.
- [x] Retain the five pillars, collapsible navigation, Whole plan access, and accessible reorder controls.
- [x] Keep Canvas and its existing features available through the view switch.
- [x] Use the shared content picker and inspector from the outline.
- [x] Preserve graph nodes/connections and staged draft edits while switching views or resizing.

Acceptance: A plan can be opened, edited, supplied with a reusable milestone, and saved without entering Canvas. Canvas remains fully functional and sees the same draft data.

#### TC-10 — Clarify save scope throughout the workflow

Dependencies: TC-06, TC-08, TC-09.

- [x] Use context-specific save labels and concise scope explanations.
- [x] Show current version and saved/unsaved state without repeating banners.
- [x] Preserve shared-plan sync controls and individual/shared/new-variant publishing scope, impact previews, and confirmations.
- [x] Preserve plan-removal progress checks, original stamp hashes, revocations, and audit history.

Acceptance: Saving shared material is not presented as publishing a plan. Saving inspector fields is not presented as saving the entire draft. Existing recipient selection and progress safeguards remain intact.

### Phase 5 — Verify and hand off

#### TC-11 — Run targeted functional and responsive regressions

Dependencies: TC-01 through TC-10.

- [x] Test duplicate-code creation, concurrent attempts, canonical protection, failure recovery, and real-ID handoff.
- [x] Test library reads, count deduplication, permissions, filters, selection, Back, and context restoration.
- [x] Test create → upload → preview → add to draft → save → reload.
- [x] Test upload failure/cancellation without losing saved metadata or duplicating records.
- [x] Test shared metadata versus published snapshots, shared material effects, and draft-local customizations.
- [x] Test outline/Canvas parity, reordering, empty pillars, staged edits, and published read-only inspection.
- [x] Test individual/shared/new-variant publishing and archived progress preservation.
- [x] Test original stamp hashes, revocation history, and review availability before/after content changes.
- [x] Inspect real rendered layouts at 320, 390, 768, 1024, and 1440 px, including long titles, zero materials, errors, and open inspectors.
- [x] Check keyboard access, focus return, nested previews, touch targets, and mobile bottom-navigation clearance.
- [x] Run TypeScript and production build checks.

Acceptance: Tests use isolated fixtures and clean them up. No credentials or signed URLs appear in logs/screenshots. Existing tests are adapted to changed navigation/view defaults without dropping behavioral assertions.

#### TC-12 — Final review and implementation handoff

Dependencies: TC-11.

- [x] Review the agreed end-to-end trainer journey on desktop and mobile.
- [x] Record changed files, checks run, and any remaining limitations.
- [x] Update trainer-facing usage documentation and relevant screenshots.
- [x] Confirm all existing content and trainee workflows remain accessible.

Acceptance: Each preceding task has evidence against its criteria. Any deferred work is explicitly named; none of the six interview decisions is silently omitted.

## 9. Suggested task sequence

```text
TC-01 Safe creation     ──────────────┐
TC-02 Library/usage reads ──┐         │
TC-03 Content tabs ── TC-04 Catalog   │
           └──────── TC-05 Library rows
                         └─ TC-06 Inspector
                              └─ TC-07 Create + upload
                                   └─ TC-08 Add to draft
                                        └─ TC-09 Outline default
                                             └─ TC-10 Save-scope clarity
                                                  └─ TC-11 Regressions
                                                       └─ TC-12 Handoff
```

TC-01, TC-02, and TC-03 can be prepared independently. Keep integration and acceptance checks in the dependency order above. Do not bundle all phases into one unreviewable change.

## 10. Likely implementation areas

Existing files to reuse or adapt:

- `components/admin/AdminNavigation.tsx`
- `components/admin/FloatingActionButton.tsx` — label/entry-point alignment only.
- `app/trainer/plans/page.tsx`
- `components/admin/TrainingPlanCatalog.tsx`
- `components/admin/VariantEditor.tsx`
- `app/trainer/plans/[id]/builder/page.tsx`
- `components/canvas/PlanCanvasBuilder.tsx`
- `components/canvas/PlanTreeView.tsx`
- `components/canvas/BuilderInspector.tsx`
- `components/canvas/EditMilestoneModal.tsx`
- `components/canvas/CreateMilestoneModal.tsx`
- `components/canvas/MilestoneLibraryDrawer.tsx`
- `components/admin/MaterialListPanel.tsx`
- `components/admin/MaterialUploadZone.tsx`
- `lib/actions/plans.ts` — validated create-only registration and reliable result handling.
- `lib/db/repositories/plans.ts` — library and usage reads, or a focused repository alongside it.

Likely additions, with final names left to implementation:

- `app/trainer/plans/library/page.tsx`
- Shared content tabs/navigation.
- Library list and context-aware milestone editor/picker components.
- Library/usage response types and targeted regression coverage.

Useful existing checks:

- `scripts/test_learning_paths_browser.cjs`
- `scripts/test_builder_workspace_browser.cjs`
- `scripts/test_path_edit_browser.cjs`
- `scripts/test_individual_publish_browser.cjs`
- `scripts/test_material_browser.cjs`
- `scripts/test_material_actions.cjs`
- `scripts/test_stamp_revocation_browser.cjs`
- `scripts/test_stamp_notifications_browser.cjs`

Preserve `UI-DESIGN.md` as the local styling authority. Recheck current code when each task begins; older revision documents may describe superseded layouts.

## 11. Definition of done

A trainer can create a reusable milestone, attach and preview materials, add it to a selected plan draft, arrange it within a pillar, save, review the existing publishing impact, and publish without a reload/search detour. The same workflow remains usable on mobile. Existing assignments, private customizations, stamps, revocations, and progress retain their current behavior.

**Approval:** The interview direction and implementation roadmap were approved before GitHub issue creation. Implement through the dependency-linked issues below.

## 12. GitHub implementation roadmap

Parent tracker: [#35 — Epic: Trainer Content Workspace Redesign](https://github.com/jimcsy/Passport-TBG/issues/35). The parent issue contains the approved design brief and completion checklist. Each task issue contains its required work and acceptance criteria.

TC-01 through TC-12 are complete. The table preserves their dependency order; per-task acceptance evidence is linked in the [handoff](docs/trainer-content-handoff.md#preceding-task-evidence).

| Task | GitHub issue | Prerequisites |
| --- | --- | --- |
| TC-01 | [#36 — Make shared milestone creation safe and reliable](https://github.com/jimcsy/Passport-TBG/issues/36) | None |
| TC-02 | [#37 — Add library list and usage reads](https://github.com/jimcsy/Passport-TBG/issues/37) | None |
| TC-03 | [#38 — Add Training Content navigation and local tabs](https://github.com/jimcsy/Passport-TBG/issues/38) | None |
| TC-04 | [#39 — Integrate the existing plan catalog](https://github.com/jimcsy/Passport-TBG/issues/39) | [TC-03 / #38](https://github.com/jimcsy/Passport-TBG/issues/38) |
| TC-05 | [#40 — Build compact library rows](https://github.com/jimcsy/Passport-TBG/issues/40) | [TC-02 / #37](https://github.com/jimcsy/Passport-TBG/issues/37), [TC-03 / #38](https://github.com/jimcsy/Passport-TBG/issues/38) |
| TC-06 | [#41 — Reuse the inspector with explicit editing contexts](https://github.com/jimcsy/Passport-TBG/issues/41) | [TC-02 / #37](https://github.com/jimcsy/Passport-TBG/issues/37), [TC-05 / #40](https://github.com/jimcsy/Passport-TBG/issues/40) |
| TC-07 | [#42 — Create and upload in one inspector session](https://github.com/jimcsy/Passport-TBG/issues/42) | [TC-01 / #36](https://github.com/jimcsy/Passport-TBG/issues/36), [TC-06 / #41](https://github.com/jimcsy/Passport-TBG/issues/41) |
| TC-08 | [#43 — Connect reusable milestones to plan drafts](https://github.com/jimcsy/Passport-TBG/issues/43) | [TC-04 / #39](https://github.com/jimcsy/Passport-TBG/issues/39), [TC-06 / #41](https://github.com/jimcsy/Passport-TBG/issues/41), [TC-07 / #42](https://github.com/jimcsy/Passport-TBG/issues/42) |
| TC-09 | [#44 — Open plans in the outline and retain Canvas](https://github.com/jimcsy/Passport-TBG/issues/44) | [TC-04 / #39](https://github.com/jimcsy/Passport-TBG/issues/39), [TC-08 / #43](https://github.com/jimcsy/Passport-TBG/issues/43) |
| TC-10 | [#45 — Clarify save scope throughout the workflow](https://github.com/jimcsy/Passport-TBG/issues/45) | [TC-06 / #41](https://github.com/jimcsy/Passport-TBG/issues/41), [TC-08 / #43](https://github.com/jimcsy/Passport-TBG/issues/43), [TC-09 / #44](https://github.com/jimcsy/Passport-TBG/issues/44) |
| TC-11 | [#46 — Run targeted functional and responsive regressions](https://github.com/jimcsy/Passport-TBG/issues/46) | [TC-01 / #36](https://github.com/jimcsy/Passport-TBG/issues/36), [TC-02 / #37](https://github.com/jimcsy/Passport-TBG/issues/37), [TC-03 / #38](https://github.com/jimcsy/Passport-TBG/issues/38), [TC-04 / #39](https://github.com/jimcsy/Passport-TBG/issues/39), [TC-05 / #40](https://github.com/jimcsy/Passport-TBG/issues/40), [TC-06 / #41](https://github.com/jimcsy/Passport-TBG/issues/41), [TC-07 / #42](https://github.com/jimcsy/Passport-TBG/issues/42), [TC-08 / #43](https://github.com/jimcsy/Passport-TBG/issues/43), [TC-09 / #44](https://github.com/jimcsy/Passport-TBG/issues/44), [TC-10 / #45](https://github.com/jimcsy/Passport-TBG/issues/45) |
| TC-12 | [#47 — Final review and implementation handoff](https://github.com/jimcsy/Passport-TBG/issues/47) | [TC-11 / #46](https://github.com/jimcsy/Passport-TBG/issues/46) |
