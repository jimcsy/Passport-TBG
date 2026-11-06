# Training Content regression checks — issue #46

Verified on 2026-11-06: all 18 targeted action/browser suites passed after focused
reruns, together with reconciliation/rollback, canvas layout, plan diff and path
merge checks. TypeScript and the production build passed. Rendered library
inspectors were reviewed at 320, 390, 768, 1024 and 1440 px, alongside builder
inspectors and library error/empty states. Temporary fixture cleanup completed.

Run on `feat/trainer-content-workspace` against a production build. These tests
create temporary fixture records and Storage objects and remove them in `finally`.
Use a configured development database and private `course-materials` bucket.
Keep credentials in `.env`; do not paste credentials or signed URLs into reports.

## Reproduce

```sh
npx tsc --noEmit
PASSPORT_BUILD_DIR=.next-mobile-check npm run build
PASSPORT_BUILD_DIR=.next-mobile-check npm run start -- -p 3100
```

In a second terminal, set `PLAYWRIGHT_MODULE` and `PLAYWRIGHT_BROWSERS_PATH` if
Playwright is installed outside the repository, then run:

```sh
npm run test:trainer-content
node --env-file=.env --import tsx scripts/test_path_edit_reconcile.ts
node --import tsx scripts/test_canvas_layout.ts
node --import tsx scripts/test_plan_diff.ts
node --import tsx scripts/test_path_merge.ts
```

Run database-writing suites sequentially. Navigation and creation tests compare
whole-database snapshots to prove they do not modify unrelated records; another
suite writing fixtures concurrently invalidates those assertions. Do not rebuild
the production directory while its server is running.

For a focused rerun, pass suite names to `npm run test:trainer-content --`, for
example `plan_insertion_browser`. The runner preserves each suite's failure exit
status and redacts configured credentials and URLs from output.

## Acceptance coverage

| Requirement | Regression suites |
| --- | --- |
| Duplicate/concurrent creation, canonical protection, real saved ID | `milestone_creation_actions`, `shared_creation_upload_browser` |
| Library permissions, batched/deduplicated counts, filters | `milestone_library_reads`, `milestone_library_browser` |
| Selection, Back/Forward, reload, focus and scroll restoration | `milestone_library_browser`, `training_content_navigation` |
| Create → upload → preview → insert → save → reload | `plan_insertion_browser` |
| Failed/canceled uploads retain metadata; retry does not duplicate | `shared_creation_upload_browser`, `material_actions` |
| Shared metadata/material scope, published snapshots, local edits | `contextual_inspector_browser`, `save_scope_browser`, `material_browser` |
| Outline/Canvas parity, reorder, empty pillars, staged fields, read-only | `outline_default_browser`, `builder_workspace_browser`, `path_edit_browser` |
| Catalog CRUD, private instances, promotion | `learning_paths_browser` |
| Individual/shared/new-variant publish and recipient/conflict controls | `individual_publish_browser`, `save_scope_browser` |
| Archived progress, hash preservation, reconciliation rollback | `test_path_edit_reconcile.ts`, `path_edit_browser`, `save_scope_browser` |
| Revocation audit, fresh review, review state after content changes | `stamp_revocation_browser`, `module_review_browser` |
| Stamp notifications, celebration, persisted read state | `stamp_notifications_browser` |
| 320/390/768/1024/1440 layouts, long titles, empty/error states | `milestone_library_browser`, `learning_paths_browser` |
| Keyboard, focus return, nested preview, 44px targets, bottom-nav clearance | `contextual_inspector_browser`, `milestone_library_browser`, `training_content_navigation` |

Screenshots are temporary local artifacts under `/tmp/tc*`; they are not committed.
The final handoff includes a curated, reproducible set of committed screenshots
in [the trainer guide](trainer-content-guide.md), with provenance and remaining
limits in [the handoff](trainer-content-handoff.md).
Media fixtures check transport and preview elements, rather than codec decoding.
Browser coverage uses Chromium; physical-device and other-browser testing remain
separate checks.

## Harness updates

- Legacy Canvas workflows explicitly select Canvas after opening/reloading the
  builder; Outline and Whole plan remain the product defaults.
- Material tests open the contextual inspector from an Outline milestone and use
  the configured/bundled browser rather than requiring macOS Chrome.
- Legacy shared-assignment reconciliation fixtures use direct shared assignments;
  modern private-instance assignment and all publishing scopes have separate
  browser coverage. Reconciliation assertions remain intact.
- Insertion coverage previews the uploaded file, saves the linked node, reloads,
  and verifies its materials again before testing plan-only content.
- Library checks capture all five widths and error/empty states, wait for rendered
  focus transitions, and assert 44px navigation targets and bottom-nav clearance.
- Revocation coverage publishes changed milestone content and verifies the
  pending review and revocation audit are retained.
- Module-review coverage uses the mobile carousel page selector after resizing;
  inactive slides remain inert rather than becoming clickable test shortcuts.

The regression uncovered a mobile interaction bug: the informational stamp
tooltip could cover its own module link and intercept the click. `PassportStamp`
now uses `pointer-events: none` on that tooltip. Hover/focus metadata remains
available, and the module link receives the tap. Database schemas and business
logic are unchanged.
