# Milestone library reads (TC-02 / #37)

`listMilestoneLibraryAction({ search?, path?, origin? })` requires the existing trainer/admin session. It returns a typed success/error result. `origin` is `ALL` (default), `STANDARD`, or `CUSTOM`; `path` is an existing pillar enum. Search is a trimmed, case-insensitive substring of code or title, limited to 100 characters. The builder's existing list action is unchanged for compatibility.

Each row contains shared milestone metadata and the real database material count. No file metadata, storage paths, signed URLs, trainee identities, or private instance titles/IDs are returned.

## Count semantics

- `reusablePlanCount` counts distinct MASTER/VARIANT plans with a linked node in a draft or latest published version, excluding archived plans. `reusablePlans` includes one row per plan, with independent draft/published flags. A newer published version without the milestone makes an older reference historical.
- `historicalReusablePlanCount` and `historicalVersionCount` count linked reusable plans and versions outside that current scope, including archived plans. A plan can appear in both current and historical counts; do not add these buckets together as a total.
- `privateInstanceCount` counts distinct INSTANCE plans across every version; only the count is exposed.
- `unclassifiedPlanCount` counts distinct legacy plans without a LearningPath classification, without assuming they are reusable or private.
- `activeTraineeCount` (also explicitly named `materialAffectedActiveTraineeCount`) counts distinct trainees with ACTIVE assignments to any version containing a node linked to the definition. This includes older versions, private instances, archived plans and legacy plans. Repeated assignments/nodes do not inflate it. This is shared-material exposure, not completion or pending-review tracking.
- `metadataAffectedDraftNodeCount` and `metadataAffectedDraftPlanCount` reproduce the existing shared custom-metadata update predicate: DRAFT version and either matching definition ID or exact matching code on a custom node. This includes private/legacy drafts and code matches linked elsewhere. `metadataCodeFallbackDraftNodeCount` identifies matches made only by code. Canonical definitions report zero because their metadata is protected. Published snapshots are never included. These are draft impacts, not automatically updated active trainees.
- Code-only fallback matches predict metadata updates; they do not grant shared material access or inflate linked reusable-plan/material-recipient counts. This mirrors existing material authorization.

Counts use three batched reads in one repeatable-read transaction, independent of row count, with stable row/reference ordering. Empty results need only the definition query. No schema or write behavior changes are introduced.

## Verification

Run `node --env-file=.env scripts/test_milestone_library_reads.cjs` against the configured development database. The test creates unique temporary fixtures and removes them afterward; it never calls storage or displays environment values. It checks authentication, filters, material counts, multiple versions/nodes/assignments, history-only references, private and legacy scopes, canonical protection, exact legacy fallback behavior, privacy, repeatable results, and bounded query count.

## Library browser (TC-05 / #40)

Open `/trainer/plans/library` to search and inspect existing shared milestones without entering a plan. View-state query parameters are `q` (code/title search), `pillar` (pillar enum), `origin` (`STANDARD` or `CUSTOM`, omitted for all), and `milestone` (saved definition ID). Selection and filter links support browser Back/Forward. Search replaces the current history entry while typing; changing a filter or selection adds an entry. These operations do not write content.

The desktop panel and full-screen native mobile inspector reuse the builder form and existing material controls (TC-06/#41). Custom shared details synchronize matching draft nodes; canonical details stay protected. Shared editing has no stamp design picker. Published plan inspection remains read-only. Closing or switching preserves staged fields; Cancel discards the current form, and failed saves retain entered details. Shared material impact is shown before deletion; uploads with the same name add a separate file rather than replacing one. Nested material previews keep their parent inspector open. Closing details preserves filters and list position, restoring focus to the selected row or search if that row is no longer visible. Counts retain the definitions above; zero materials is valid.

Browser verification: `PLAYWRIGHT_MODULE=<playwright-module-path> node --env-file=.env scripts/test_milestone_library_browser.cjs`, with the production app running on port 3100 and its build in `.next-mobile-check` (override with `LIBRARY_TEST_ORIGIN` and `PASSPORT_BUILD_DIR`). It uses isolated database metadata fixtures, simulates a failed read and an empty response in the browser, and cleans up its records without touching storage objects.

Contextual-inspector verification: `PLAYWRIGHT_MODULE=<playwright path> node --env-file=.env scripts/test_contextual_inspector_browser.cjs`. This exercises isolated custom/canonical definitions, draft/published nodes, an existing fixture stamp, and real temporary material uploads/reordering/previews/deletion. It cleans up its database fixtures and storage files.

## Create and attach materials (TC-07 / #42)

Choose **Create milestone** in the library (view-state `create=1`). Enter code, title, description/criteria and pillar, then **Save shared milestone**. The same inspector switches to the saved definition's materials using the server-returned ID; no reload or search is needed, even when current filters exclude the new item. The filters remain unchanged. Saving shared content does not insert a node into a plan draft or publish anything; plan insertion is scoped to TC-08/#43.

Creation errors retain the fields. Closing preserves an unsaved form; **Cancel** discards it. After persistence, upload failures, upload cancellation and closing the inspector leave the saved definition intact. Existing file validation, 50 MB limits, signed upload/confirmation/cancellation and preview are reused. Zero-material milestones are valid.

Verification: `PLAYWRIGHT_MODULE=<playwright path> node --env-file=.env scripts/test_shared_creation_upload_browser.cjs` with the production app on port 3100. It uses temporary records and storage files, simulates upload failure/cancellation, retries a real PDF upload, previews it in the same inspector, checks mobile creation and zero-material persistence, and cleans up afterward.
