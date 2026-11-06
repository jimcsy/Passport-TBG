# Trainer Content implementation handoff

Date: 2026-11-06 · Branch: `feat/trainer-content-workspace`
Roadmap: [approved plan](../TRAINER-WORKSPACE-REDESIGN-PLAN.md) ·
[TC-12 / #47](https://github.com/jimcsy/Passport-TBG/issues/47)

Start with the [trainer usage guide](trainer-content-guide.md). For repeatable
checks and the detailed acceptance coverage map, use the
[regression guide](trainer-content-regressions.md).

## Six agreed decisions

| Interview decision | Delivered behavior | Evidence |
| --- | --- | --- |
| Content management first | Changes concentrate on content navigation, catalog, library and builder. Queue, trainee profiles and trainee navigation remain accessible. | #38, #39, #46; access map below |
| One Training Content area | Training Plans and Milestone Library have direct routes and local tabs. Four main trainer destinations remain. | `test_training_content_navigation.cjs` |
| Outline first, Canvas optional | Fresh sessions open Outline/Whole plan with five pillars; desktop Canvas retains its graph and controls. | `test_outline_default_browser.cjs`, `test_builder_workspace_browser.cjs` |
| Contextual inspector | Desktop right inspector; full-screen mobile inspector; shared/draft/published contexts, staged fields, nested previews and focus return. | `test_contextual_inspector_browser.cjs` |
| Save then upload in place | Validated create-only save returns a real ID before enabling upload. Failed/canceled uploads retain metadata; explicit insertion follows. | `test_shared_creation_upload_browser.cjs`, `test_plan_insertion_browser.cjs` |
| Compact library rows | Code/title, pillar, origin, material count and distinct current reusable-plan count, with search/filter and URL selection. | `test_milestone_library_reads.cjs`, `test_milestone_library_browser.cjs` |

No interview decision is deferred. The interface retains BEAT maroon/gold,
the five pillars, and the master/variant/private-instance hierarchy.

## End-to-end review

The final walkthrough uses a temporary trainer, master-linked role variant,
shared definitions and an uploaded PDF. It reviews desktop at 1440 px and mobile
at 390 px: catalog → create in the library inspector → real upload → preview →
eligible plan picker → explicit draft insertion → reorder → Save draft → reload →
publish impact review → confirm publish → read-only inspection. No real trainee
assignments are used. Fixtures and the Storage object are removed on completion.

The preceding regression pass additionally covers recipient selection,
individual/shared/new-variant publishing, private customizations, progress
archival, original hashes, revoked awards and audit history with isolated trainees.

### Screenshot index

These are actual rendered application captures with walkthrough fixture content.
No credentials, signed URLs, real trainee names or reflection text are included.

| Screen | Desktop | Mobile |
| --- | --- | --- |
| Catalog | [Training Plans](images/trainer-content/plans-desktop.png) | Bottom navigation and compact catalog covered in #46 |
| Create | Same inspector transitions to materials | [Create milestone](images/trainer-content/create-mobile.png) |
| Materials | [Library inspector](images/trainer-content/library-desktop.png) | [Materials inspector](images/trainer-content/materials-mobile.png) |
| Curriculum | [Outline](images/trainer-content/outline-desktop.png) | [Focused outline](images/trainer-content/outline-mobile.png) |
| Publication | [Impact review](images/trainer-content/publish-desktop.png) | [Impact review](images/trainer-content/publish-mobile.png) |

Regenerate against a production server on port 3100 using:

```sh
node --env-file=.env scripts/capture_trainer_content_handoff.cjs
```

Set `PLAYWRIGHT_MODULE` and `PLAYWRIGHT_BROWSERS_PATH` if installed externally.
This script writes the eight PNGs above and creates/deletes only its own fixtures.
Run it separately from regression suites that compare whole-database snapshots.
The PDF fixture verifies transport/viewer access, not document-rendering fidelity.

## Workflow access map

| Existing workflow | Access after redesign | Verification |
| --- | --- | --- |
| Trainer hub and cohort navigation | `/trainer` | Navigation/browser regression and unchanged hub links |
| Queue and stamp verification | Verifications → `/trainer/queue`; `/trainer/batch` remains supported | `module_review_browser`, `stamp_notifications_browser` |
| Trainee directory and registration | Trainees → `/trainer/trainees`; `/trainer/trainees/new` | Existing routes retained; navigation regression |
| Assignment, private path, promotion | `/trainer/trainees/[id]` | `learning_paths_browser`, `individual_publish_browser` |
| Master and variant CRUD/enrolled counts | Training Content → Training Plans | `learning_paths_browser` |
| Existing builder links and create shortcut | `/trainer/plans/[id]/builder`, `/trainer/plans?create=1` | `training_content_navigation`, `learning_paths_browser` |
| Shared material management | Library inspector or linked draft inspector | Material action/browser and contextual inspector suites |
| Plan-only custom content | Builder Add Milestone; shared-library checkbox off | `plan_insertion_browser` |
| Canvas, versions, dependencies and reorder | Builder desktop view switch and Versions | Workspace, Outline and path-edit suites |
| Draft and all publishing scopes | Builder Save draft / Publish | Save-scope and individual-publish suites |
| Stamp revocation and history | Trainee profile | `stamp_revocation_browser` |
| Trainee Dashboard, passport, Strobi and notifications | Existing trainee routes and bottom navigation | Module-review and stamp-notification suites; #46 mobile tap fix |
| Reflection and requesting review | Trainee module → Review & feedback | `module_review_browser`, revocation/content-change review assertions |

The roadmap adds no course/completion model, changes no schema, and introduces no
watch tracking or automatic stamps. Supporting backend work is limited to
validated create-only registration, authenticated batched usage/plan reads and
preserving unlinked plan-only nodes on save. Published metadata snapshots,
assignment reconciliation and verification/revocation rules retain their scope.

## Checks and remaining limits

- TC-12 final checks passed: the isolated desktop/mobile capture walkthrough
  through actual publication and read-only inspection; `npx tsc --noEmit`;
  `PASSPORT_BUILD_DIR=.next-mobile-check npm run build`; script syntax and
  `git diff --check`; 85 local documentation links; eight PNG dimensions; and
  eleven predecessor evidence links. All eight captured screens were visually
  reviewed. Temporary database records and the uploaded PDF were cleaned up.
- #46 completed all 18 targeted action/browser suites, reconciliation/rollback,
  canvas layout, plan diff and path merge checks. See its evidence below.
- Responsive renders were inspected at 320, 390, 768, 1024 and 1440 px, including
  long titles, empty/error states, inspectors, keyboard/focus, nested previews,
  44px targets and bottom-navigation clearance.
- TypeScript and the production build passed for the implemented application.
  The final handoff adds documentation, screenshots and a fixture-based review
  script; it does not change application behavior.
- Chromium desktop/mobile viewport coverage is complete. Safari, Firefox,
  physical iOS/Android devices, screen-reader sessions and slow-network/load
  testing remain follow-up validation, not claimed passes.
- The 50 MB boundary is validated without allocating/uploading a 50 MB fixture.
  MP4/PDF/PPTX transport and preview components are exercised; codec playback and
  full document/slide fidelity need representative training media.
- **Explicitly deferred:** upload directly while creating a plan-only custom
  milestone remains outside this roadmap, as requested earlier. Use saved shared
  milestone creation for the integrated upload flow.
- **Explicitly excluded:** watch tracking, automatic completion, quizzes, ratings,
  certificates, thumbnails, recommendations and engagement analytics.
- Merging, deployment, production data migration and retirement of the comparison
  branch are separate decisions. This handoff does not deploy the redesign.

## Preceding task evidence

The following completion comments record the original acceptance checks. The
regression guide maps the cross-cutting verification back to the test sources.

| Task | Completion evidence |
| --- | --- |
| TC-01 / #36 | [Verified implementation and checks](https://github.com/jimcsy/Passport-TBG/issues/36#issuecomment-6678360895) |
| TC-02 / #37 | [Verified implementation and checks](https://github.com/jimcsy/Passport-TBG/issues/37#issuecomment-6678365012) |
| TC-03 / #38 | [Verified implementation and checks](https://github.com/jimcsy/Passport-TBG/issues/38#issuecomment-6678459697) |
| TC-04 / #39 | [Verified implementation and checks](https://github.com/jimcsy/Passport-TBG/issues/39#issuecomment-6678581025) |
| TC-05 / #40 | [Verified implementation and checks](https://github.com/jimcsy/Passport-TBG/issues/40#issuecomment-6679699206) |
| TC-06 / #41 | [Verified implementation and checks](https://github.com/jimcsy/Passport-TBG/issues/41#issuecomment-6680087997) |
| TC-07 / #42 | [Verified implementation and checks](https://github.com/jimcsy/Passport-TBG/issues/42#issuecomment-6680215273) |
| TC-08 / #43 | [Verified implementation and checks](https://github.com/jimcsy/Passport-TBG/issues/43#issuecomment-6681221072) |
| TC-09 / #44 | [Verified implementation and checks](https://github.com/jimcsy/Passport-TBG/issues/44#issuecomment-6685770508) |
| TC-10 / #45 | [Verified implementation and checks](https://github.com/jimcsy/Passport-TBG/issues/45#issuecomment-6686419592) |
| TC-11 / #46 | [Verified implementation and checks](https://github.com/jimcsy/Passport-TBG/issues/46#issuecomment-6687404246) |

## Changed-file inventory

Implementation baseline: `4756af4` (before TC-01); reviewed implementation head:
`90b7e0b` (includes TC-11). This inventory comes from
`git diff --name-only 4756af4..90b7e0b`.

### Screens and components

- [app/trainer/page.tsx](../app/trainer/page.tsx)
- [app/trainer/plans/[id]/builder/page.tsx](../app/trainer/plans/[id]/builder/page.tsx)
- [app/trainer/plans/library/page.tsx](../app/trainer/plans/library/page.tsx)
- [app/trainer/plans/page.tsx](../app/trainer/plans/page.tsx)
- [components/admin/AdminNavigation.tsx](../components/admin/AdminNavigation.tsx)
- [components/admin/FloatingActionButton.tsx](../components/admin/FloatingActionButton.tsx)
- [components/admin/MaterialListPanel.tsx](../components/admin/MaterialListPanel.tsx)
- [components/admin/MaterialPreviewModal.tsx](../components/admin/MaterialPreviewModal.tsx)
- [components/admin/MilestoneUsage.tsx](../components/admin/MilestoneUsage.tsx)
- [components/admin/TrainingContentHeader.tsx](../components/admin/TrainingContentHeader.tsx)
- [components/admin/TrainingPlanCatalog.tsx](../components/admin/TrainingPlanCatalog.tsx)
- [components/admin/library/CreateSharedMilestoneForm.tsx](../components/admin/library/CreateSharedMilestoneForm.tsx)
- [components/admin/library/LibraryPlanPicker.tsx](../components/admin/library/LibraryPlanPicker.tsx)
- [components/admin/library/MilestoneLibrary.tsx](../components/admin/library/MilestoneLibrary.tsx)
- [components/canvas/BuilderInspector.tsx](../components/canvas/BuilderInspector.tsx)
- [components/canvas/CreateMilestoneModal.tsx](../components/canvas/CreateMilestoneModal.tsx)
- [components/canvas/EditMilestoneModal.tsx](../components/canvas/EditMilestoneModal.tsx)
- [components/canvas/IndividualPublishModal.tsx](../components/canvas/IndividualPublishModal.tsx)
- [components/canvas/MilestoneLibraryDrawer.tsx](../components/canvas/MilestoneLibraryDrawer.tsx)
- [components/canvas/PlanCanvasBuilder.tsx](../components/canvas/PlanCanvasBuilder.tsx)
- [components/canvas/PlanTreeView.tsx](../components/canvas/PlanTreeView.tsx)
- [components/canvas/PublishPlanModal.tsx](../components/canvas/PublishPlanModal.tsx)
- [components/passport/PassportStamp.tsx](../components/passport/PassportStamp.tsx)

### Actions, repositories and validation

- [lib/actions/plans.ts](../lib/actions/plans.ts)
- [lib/db/repositories/milestone-library.ts](../lib/db/repositories/milestone-library.ts)
- [lib/db/repositories/milestones.ts](../lib/db/repositories/milestones.ts)
- [lib/db/repositories/plans.ts](../lib/db/repositories/plans.ts)
- [lib/validations/milestones.ts](../lib/validations/milestones.ts)

### Checks and supporting documentation

- [TRAINER-WORKSPACE-REDESIGN-PLAN.md](../TRAINER-WORKSPACE-REDESIGN-PLAN.md)
- [docs/milestone-library-reads.md](../docs/milestone-library-reads.md)
- [docs/trainer-content-regressions.md](../docs/trainer-content-regressions.md)
- [package.json](../package.json)
- [scripts/test_builder_workspace_browser.cjs](../scripts/test_builder_workspace_browser.cjs)
- [scripts/test_contextual_inspector_browser.cjs](../scripts/test_contextual_inspector_browser.cjs)
- [scripts/test_individual_publish_browser.cjs](../scripts/test_individual_publish_browser.cjs)
- [scripts/test_learning_paths_browser.cjs](../scripts/test_learning_paths_browser.cjs)
- [scripts/test_material_browser.cjs](../scripts/test_material_browser.cjs)
- [scripts/test_milestone_creation_actions.cjs](../scripts/test_milestone_creation_actions.cjs)
- [scripts/test_milestone_creation_browser.cjs](../scripts/test_milestone_creation_browser.cjs)
- [scripts/test_milestone_library_browser.cjs](../scripts/test_milestone_library_browser.cjs)
- [scripts/test_milestone_library_reads.cjs](../scripts/test_milestone_library_reads.cjs)
- [scripts/test_module_review_browser.cjs](../scripts/test_module_review_browser.cjs)
- [scripts/test_outline_default_browser.cjs](../scripts/test_outline_default_browser.cjs)
- [scripts/test_path_edit_browser.cjs](../scripts/test_path_edit_browser.cjs)
- [scripts/test_path_edit_reconcile.ts](../scripts/test_path_edit_reconcile.ts)
- [scripts/test_plan_insertion_browser.cjs](../scripts/test_plan_insertion_browser.cjs)
- [scripts/test_responsive_browser.cjs](../scripts/test_responsive_browser.cjs)
- [scripts/test_save_scope_browser.cjs](../scripts/test_save_scope_browser.cjs)
- [scripts/test_shared_creation_upload_browser.cjs](../scripts/test_shared_creation_upload_browser.cjs)
- [scripts/test_stamp_browser.cjs](../scripts/test_stamp_browser.cjs)
- [scripts/test_stamp_revocation_browser.cjs](../scripts/test_stamp_revocation_browser.cjs)
- [scripts/test_trainer_content_regressions.cjs](../scripts/test_trainer_content_regressions.cjs)
- [scripts/test_training_content_navigation.cjs](../scripts/test_training_content_navigation.cjs)

### TC-12 handoff additions

- `docs/trainer-content-guide.md` — trainer instructions.
- `docs/trainer-content-handoff.md` — decisions, evidence, access map and limits.
- `docs/images/trainer-content/*.png` — eight reviewed desktop/mobile captures.
- `scripts/capture_trainer_content_handoff.cjs` — reproducible isolated walkthrough.
- `TRAINER-WORKSPACE-REDESIGN-PLAN.md` — completed roadmap and handoff links.
- `README.md` — current trainer/trainee routes, navigation and content workflow.
- `UI-DESIGN.md` — implemented workspace conventions.
- `docs/trainer-content-regressions.md` — durable handoff screenshot reference.
