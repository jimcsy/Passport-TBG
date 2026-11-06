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
