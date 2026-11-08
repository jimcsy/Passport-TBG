# Trainer Hub insights

The Hub (`/trainer`) follows the BEAT theme with three summary cards, an
interactive engagement graph below, and pillar/attention insights on the right.
Cards stack on mobile; the insights follow the graph and existing cohort progress.

## Metric definitions

- **Registered trainees:** current trainee records, including those without an
  active plan. The action opens the trainee directory.
- **Training Content:** distinct registered trainees who have opened at least one
  authorized module page. Opens Training Content. Shared milestone and material
  totals provide catalog context; they are not view counts.
- **Awaiting verification:** non-archived `READY_FOR_REVIEW` records, matching the
  existing verification queue. The action opens Verifications. Current verified
  milestone totals count only nodes in each trainee's latest active assignment.
- **Engagement graph:** cumulative registered/viewed counts for current trainee
  records over 7, 30 or 90 days. Date buckets use Asia/Manila. Pointer exploration
  and keyboard Left/Right/Home/End expose exact daily totals. Historical counts
  can change when trainee records are deleted; this is not an immutable audit.
- **Pillar progress:** verified versus required nodes in current active plans,
  plus trainees with a verified milestone in each pillar. Archived records,
  superseded-version nodes and revoked stamps do not count toward completion.
- **Needs attention:** pending reviews, oldest dated review age, and trainees
  without an active plan. Existing brand/cohort drill-down remains below the graph.

## Module views

View tracking begins with this update (2026-11-08); earlier views are not inferred
from registrations, seeded progress, reflections or stamps. A view means opening
a module, not watching a video, downloading a file or completing training.

`TraineeContentView` stores only the trainee ID and first opening timestamp.
The module client records after the page is mounted and the document is visible,
so server rendering and route prefetches do not count. The authenticated action
checks active-assignment or owned archived-progress access. A primary key and
duplicate-safe insertion keep concurrent/repeated visits at one record per
trainee without changing the first-view date. Deleting the trainee removes the
view record. Tracking failures do not block module learning or review submission.

The table has RLS enabled and Data API privileges revoked consistently with the
portal's existing server-side Prisma access. Dashboard responses contain aggregate
counts rather than trainee identities, verification hashes or private notes.
The graph updates on a fresh Hub request; it does not poll continuously.

Apply the included migration and regenerate the Prisma client in other
environments before deploying the updated app:

```sh
npx prisma migrate deploy
npx prisma generate
```

The migration `20261108000000_trainee_content_views` was applied to the configured
development database during implementation. It adds the view table and does not
change assignments, progress, publishing or stamp records.

## Verification

```sh
node --import tsx scripts/test_hub_dashboard.ts
node --import tsx scripts/test_hub_insights.ts
node --env-file=.env scripts/test_content_view_actions.cjs
```

Against a production server on port 3100, with Playwright configured:

```sh
node --env-file=.env scripts/test_hub_insights_browser.cjs
```

The browser test creates and cleans up its own trainer, trainee, plan and view
fixtures. It verifies actual module viewing, repeat-visit deduplication, displayed
viewer counts, CTA links, chart controls and keyboard access, plus layouts at
320/390/768/1024/1440 px. Screenshots are local `/tmp/hub-insights-*.png` artifacts.
