# The Bistro Group: Digital "Growth Passport" (BEAT Program)

A lightweight, dual-access digital training portal for **The Bistro Group** that replaces physical training booklets with a digital progress tracker across 5 standardized development paths.

---

## 🌟 Key Features

1. **Trainee Portal (`/`)**:
   - **Passwordless Entry**: Fast, low-friction lookup using **Trainee Code** (e.g. `TBG-2024-001`) and registered **Email**.
   - **Digital Passport Mirror**: Visual reproduction of the physical passport booklet with circular progress indicators.
   - **Self-Service Verification Requests**: Trainees mark competencies as "Ready for Review" with optional reflection notes.
   - **Verified Gold Seal Stamps**: Displays authentic gold stamps with the verifying trainer's credentials and timestamp.

2. **Dynamic Role-Based Path Builder**:
   - **Role-Tailored Plans**: Role-specific milestone requirements (e.g. Barista vs. Kitchen Staff vs. Floor Server vs. Store Supervisor) replacing hardcoded static 4/4 tracks.
   - **Interactive Node Canvas**: Built on `@xyflow/react` drag-and-drop tree canvas with Dagre auto-layout.
   - **Safe Reconcile Engine**: Modifying plans preserves completed/in-review milestones, soft-archives removed nodes, and seamlessly injects new nodes for active trainees.
   - **Two-Tier Tree Architecture**: 5 core development path root hubs connecting to child milestone nodes.

3. **5 Uniform Development Paths (BEAT Master Library)**:
   - 🔰 **Onboarding** (`ONBOARDING`): Orientation, food safety, store tour, 30-day check-in.
   - 🗣️ **Communication Skills** (`COMMUNICATION`): Guest greetings, active listening, service recovery, shift handovers.
   - 🍳 **Technical Skills** (`TECHNICAL`): POS competency, recipe specs, table service sequence, closing audits.
   - 🤝 **Personal Effectiveness & Culture** (`CULTURE`): Core Bistro values, grooming standards, composure, peer recognition.
   - 🏆 **Leadership Skills** (`LEADERSHIP`): Peer mentoring, station supervision, huddle facilitation, capstone sign-off.

4. **Universal Corporate Foundation**:
   - Every new trainee receives **Foundation Level 1: TBG Corporate Onboarding**, regardless of department or position.
   - Five pillars appear in order: Onboarding, Communication Skills, Technical Skills, Personal Effectiveness & Culture, Leadership Skills. Each starts with four modules (20 total).
   - Trainers may append position-specific modules through versioned Path Builder drafts. Registration creates a private instance from the latest published foundation version, including those additions; drafts are never assigned.
   - Existing specialist plans and trainee assignments remain intact. They are no longer registration defaults.

---

## 🎨 BEAT Brand Design System

Built strictly with the official BEAT brand tokens:
- **Brand Maroon (Primary Dark)**: `#5C1D24` *(Sidebars, navbar, primary action buttons, headers)*
- **Brand Gold (Accent)**: `#C29B38` *(Active states, link highlights, badge borders, passport stamps)*
- **Background Canvas**: `#FAF8F4` *(Warm off-white neutral)*
- **Card Background**: `#FFFFFF` *(Pure white)*

---

## 🔑 Demo & Test Credentials

The database is seeded with minimal test accounts:

### 1. Trainee Portal (`/`)
- **Trainee Code**: `TBG-2024-001`
- **Email**: `trainee@bistro.com.ph`
- *(Or click "Quick Fill Demo Trainee" on the login screen)*

### 2. BEAT Trainer Portal (`/admin/login`)
- **Employee ID**: `EMP-1001`
- **Password**: `password123`
- *(Or click "Quick Fill Demo Trainer" on the login screen)*

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14+ (App Router, TypeScript)
- **Styling**: Tailwind CSS + Lucide React Icons
- **Database**: SQLite (via Prisma ORM) for zero-friction local development
- **Sessions & Security**: Encrypted HTTP-only cookies (`jose` + `bcryptjs`)
- **Transactions**: Atomic Prisma transactions for batch attendance

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Initialize Database & Seed
```bash
npx prisma migrate dev
npm run db:seed
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) for the Trainee Portal, or [http://localhost:3000/admin/login](http://localhost:3000/admin/login) for the Trainer Portal.

### 4. Run Test Suite
```bash
npm test
```

### 5. Production Build
```bash
npm run build
```

---

## 🐘 Supabase Migration Runbook

For the current PostgreSQL deployment, apply checked-in migrations with
`npx prisma migrate deploy`. See [database security](docs/database-security.md)
for the RLS lockdown, deployment prerequisites, and verification steps.

All database queries are strictly isolated in `lib/db/repositories/` and `lib/actions/`. When ready to graduate from local SQLite to Supabase (PostgreSQL):

1. **Update `.env`**:
   ```env
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres"
   ```
2. **Update `prisma/schema.prisma`**:
   Change provider from `sqlite` to `postgresql`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. **Run Migration & Seed**:
   ```bash
   npx prisma migrate dev --name init_supabase
   npm run db:seed
   ```
4. All application code, server actions, and repositories remain 100% unchanged.
# Trainee dashboard and digital booklet

See [UI-DESIGN.md](./UI-DESIGN.md) for shared surface, typography, control,
and copy conventions and the design references behind the interface refinement.

The trainer content workflow is documented in the [trainer guide](docs/trainer-content-guide.md),
with reviewed screenshots, acceptance evidence and limitations in the
[implementation handoff](docs/trainer-content-handoff.md).

The builder opens in Outline/Whole plan with five pillar sections. Desktop Canvas
remains optional. The on-demand Milestones picker and contextual inspector dock
on desktop and use a full-screen inspector on mobile. Inspect, edit, reorder,
create shared content, upload and add to the draft without a reload/search detour.
Apply to draft, Save draft, Save shared details and Publish have distinct scopes.
Versions and publishing-impact review retain their existing behavior.

When selected, Canvas starts
with a visual training-plan root and a vertical spine of five path hubs.
Milestones branch to both sides of their hub in staggered rows, with individual
curved connectors rather than one shared horizontal bus. Path spacing adapts
to milestone counts and measured sizes. The spine is visual only and is excluded
from saved/published graph data. Initial loading applies this grouped layout
rather than displaying raw seed coordinates; Whole plan fits the entire tree.
Once React Flow measures the
new node, the viewport smoothly focuses it at a readable zoom (instant with
reduced motion). Path shortcuts focus a category; Whole plan restores the overview.
The pannable, zoomable minimap remains at bottom left and zoom controls at bottom
right. Viewport behavior uses React Flow's measured-node and fitView APIs:
https://reactflow.dev/api-reference/hooks/use-nodes-initialized
https://reactflow.dev/api-reference/types/react-flow-instance
`node --import tsx scripts/test_canvas_layout.ts` checks vertical path ordering,
staggered branches, and collision-free placement with uneven milestone counts.

The authenticated `/trainer` workspace keeps four main destinations: Hub,
Verifications, Training Content and Trainees. Training Content contains Training
Plans (`/trainer/plans`) and Milestone Library (`/trainer/plans/library`). Desktop
uses the header navigation; phones use icon-based bottom navigation. Trainer
identity, notifications and Sign out remain available. Batch sign-off retains
`/trainer/batch`; existing plan and builder links remain valid.

The [Hub insights](docs/hub-insights.md) show registered trainees, unique module
viewers and pending verifications, with an interactive engagement graph, pillar
progress and the existing cohort drill-down. Module-view tracking starts with
this update; historical reviews and stamps are not treated as page views.

Authenticated trainee screens share `app/trainee/dashboard/layout.tsx` and
`components/trainee/TraineeNavigation.tsx`. Dashboard, My passport and Notifications
use bottom navigation on mobile. Modules retain Dashboard as their parent section.
The header includes Sign out, and keyboard skip links target the main content.

`/trainee/dashboard` renders live learning progress and development paths with
Strobi guidance. Paths and stamps lead to authenticated module pages at
`/trainee/dashboard/modules/[id]`. Materials appear before Review & feedback;
trainees submit their reflection there. The trainer queue is `/trainer/queue`.
Server guards prevent duplicate requests and preserve existing approvals.

My passport opens `/trainee/dashboard/booklet`. Desktop retains the page-turn
reader and path shortcuts; mobile uses equal-sized swipeable pages and selectors
for jumping to a development path or page. Informational stamp tooltips show
status and approval details; clicking/tapping a stamp opens its module. Tooltips
ignore pointer events so they cannot block that navigation. Review submission is
not available directly from the passport. Dynamic pagination keeps all milestones
accessible as paths grow; empty pillars retain their exemption view.

Stamp notifications are available at `/trainee/dashboard/notifications` and the
notification control. First opening an unread earned stamp triggers its Strobi
celebration; subsequent openings navigate to the module. Mobile notifications
behave as a navigation tab rather than a dismissible overlay.

Verified stamps display the recorded trainer name, employee ID, approval date in
Asia/Manila, and trainer note. The signature area represents digital approval
attribution; the current database does not store handwritten signature images.
LinkedIn Learning cards are upcoming integrations. Supply the dashboard's optional
`courses` prop with real `href` values to enable course links; course completion
sync is not implemented.

Validation: `npm run build`, `npx tsc --noEmit`, and
`npx tsx scripts/test_passport_book.ts`. The pagination test uses fixtures and does
not modify trainee records.
`npx tsx scripts/test_review_submission.ts` verifies submission and state guards
against a disposable SQLite database, without changing application records.

## Corporate registration and safe seeding

Register trainees at `/trainer/trainees/new`. Choose a Department, then a Position from that department. Position is disabled until a department is selected, and changing the department clears the position. Both values are required and checked again on the server against `lib/constants/tbg-org.ts` (18 departments). The trainee record stores `department` and `position`; `jobRole` mirrors position for existing passport/directory displays. Legacy records keep nullable organization fields rather than being guessed or overwritten.

Apply the additive profile migration and seed the foundation:

```bash
npx prisma migrate deploy
npm run db:seed
```

Normal seeding preserves existing credentials, profiles, published snapshots, drafts, assignments, progress, and awarded stamps. It creates the foundation only when absent, plus missing optional specialist library entries. It does not move existing trainees to the new foundation. Destructive `FORCE_RESET` seeding is rejected. If the foundation is missing, archived, or lacks its core 20 module codes in the correct pillars, registration fails without partial records instead of choosing an unrelated plan.

Registration integration checks use a disposable PostgreSQL schema and remove it afterward (the configured database user needs CREATE SCHEMA permission):

```bash
node --env-file=.env --import tsx scripts/test_trainee_registration.ts
npm run build
```

Manual check: open registration, confirm Position is initially disabled, select ICT Department → Application Developer, then switch to Finance Department. Position must clear and offer only Finance positions. Complete registration and inspect the trainee's foundation passport: five pillars with four initial modules each. A published appended custom module should appear for subsequent registrations; existing stamps must survive a normal seed rerun and version reconciliation.

## Master catalog, role variants and trainee instances

`/trainer/plans` shows one **Foundation Level 1: TBG Corporate Onboarding** master summary and compact role-variant rows. Use **Create role variant**, search/status filters, **Edit details** for inline title/tag and default-node changes, or **Edit plan** to open the Outline builder. Rows show enrolled counts and contextual deletion. Node changes save to a draft; review and publish it through the builder before assigning the published path.

`LearningPath` stores hierarchy metadata and links one-to-one to the existing `TrainingPlan` version graph:

- MASTER: the universal foundation (`isTemplate: true`).
- VARIANT: a reusable role track under the master, with title and department/position tags.
- INSTANCE: a private copy of a published master/variant version owned by one trainee.

New registrations still always begin with the corporate foundation, regardless of organizational tags. Trainer reassignment creates an independent instance of the selected published catalog path and safely reconciles progress. Another trainee's private instance cannot be assigned. Renaming or editing a catalog variant does not alter existing instances. **Delete Variant** archives the catalog entry; it preserves its versions, instance references, progress and stamps.

At `/trainer/trainees/[id]`, use **Customize Individual Path** to edit that trainee's graph. Publish and sync the instance before **Promote to Reusable Variant**; promotion copies the active published graph (including node order, edges, stamp designs and path labels) into a new draft variant under the master. Progress records and awarded approvals are never copied into the catalog.

The hierarchy migration adds metadata for existing plans without changing any assignment targets. Existing shared assignments remain shared until a trainer explicitly clicks **Create Individual Instance** on that trainee's profile. Simply opening a profile does not change records. A tested optional bulk converter exists at `scripts/backfill_path_instances.ts`; it changes assignment targets and should be run only after explicit approval for the configured database. Conversion retains original progress IDs, statuses, notes, approval timestamps and verification hashes and preserves old assignments as SUPERSEDED.

Verification:

```bash
node --env-file=.env --import tsx scripts/test_learning_paths.ts
node --env-file=.env --import tsx scripts/test_trainee_registration.ts
npm run build
```

The database tests create/drop temporary PostgreSQL schemas. Chrome checks are in `scripts/test_learning_paths_browser.cjs` and `scripts/test_registration_browser.cjs` (see their header commands). They clean up their own fixtures.

Trainer single/batch sign-off resolves the selected milestone by code/library identity inside each trainee's active instance. It never writes a catalog node's progress for an instance owner. Repeat sign-off preserves the original award, and selecting trainees without that milestone rejects the entire batch without partial approvals. Passport reads no longer auto-assign arbitrary published paths to unassigned trainees.

Each role variant displays its enrolled-trainee count in the catalog. Counts include unique ACTIVE trainees on any private instance version derived from that variant, plus legacy direct assignments. Superseded assignments and historical inactive instances are excluded. Assignment and reassignment actions invalidate the catalog so the badge updates when trainers navigate back.

## Publishing individual changes with an explicit scope

Open a trainee's **Customize Individual Path**, create/edit a draft, then click **Publish**. The scope dialog always defaults to **Only this trainee**, even when a role variant has multiple enrolled trainees.

- **Only this trainee:** publish and reconcile only this individual's instance; the shared variant and other trainees remain unchanged.
- **Create a new reusable variant:** enter its title and department/position tags. Confirmation publishes the new reusable definition, links this trainee's instance to it, and moves their enrollment count. Other trainees remain on the original variant.
- **Update the shared variant:** available only when the instance originates from an available role VARIANT (not the universal MASTER). The current trainee is always included; all other enrolled trainees start unchecked. Select exactly who should receive the published shared changes.

Every choice requires **Review impact** before **Confirm and publish**. Preview shows affected names, milestone additions/removals/updates/reorders, path renames, connection changes, archive counts, and retained customizations. Shared distribution performs a three-way comparison against each instance's original catalog snapshot: individual extra nodes, customized values and milestone sequences, local removals, extra connections, and renamed paths are retained where they conflict with shared changes. The preview identifies those conflicts; it never silently overwrites them. Where a trainee customized the sequence or added individual nodes, new shared milestones append after their existing nodes to preserve that ordering. A selected trainee's unfinished draft blocks distribution until that trainee is deselected or their draft is resolved. An unfinished shared-variant draft must also be resolved first.

Confirmation checks the reviewed plan/enrollment/progress fingerprint again under row locks. Changes after preview require a new review. Publishing the shared definition, all selected private snapshots, provenance updates, and progress reconciliation is atomic: failure rolls back the entire operation. Removed progress is archived and original award metadata/hashes are retained. Unselected trainees are never converted or updated. Snapshot saves do not rename shared milestone-library definitions; editing the library remains a separate explicit action.

Checks:

```bash
node --import tsx scripts/test_path_merge.ts
node --env-file=.env --import tsx scripts/test_individual_publish.ts
npm run build
```

The integration script uses a disposable PostgreSQL schema, including a forced failure to verify all-or-nothing rollback. `scripts/test_individual_publish_browser.cjs` checks defaults, cancellation/reset, recipient selection, impact review, conflict retention, curated variants and mobile controls using its own self-cleaning fixtures. No schema migration is required for publish scopes.

### Optional Strobi AI assistance

The server-side Gemini service, quota setup and verification commands are documented
in [Strobi service setup](docs/strobi-service.md). AI is disabled by default; the
creation-form UI is tracked separately in issues #51–#53.
