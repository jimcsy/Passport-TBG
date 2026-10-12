# The Bistro Group: Digital "Growth Passport" (BEAT Program)

A lightweight, dual-access digital training portal for **The Bistro Group** that replaces physical training booklets with a digital progress tracker across 5 standardized development paths.

---

## 🌟 Key Features

1. **Trainee Portal (`/`)**:
   - **Passwordless Entry**: Fast, low-friction lookup using **Trainee Code** (e.g. `TBG-2024-001`) and registered **Email**.
   - **Digital Passport Mirror**: Visual reproduction of the physical passport booklet with circular progress indicators.
   - **Self-Service Verification Requests**: Trainees mark competencies as "Ready for Review" with optional reflection notes.
   - **Verified Gold Seal Stamps**: Displays authentic gold stamps with the verifying trainer's credentials and timestamp.

2. **BEAT Admin & Trainer Portal (`/admin`)**:
   - **Secured Authentication**: Login via **Employee ID** (e.g. `EMP-1001`) and password.
   - **Actionable Review Queue (`/admin/queue`)**: Centralized inbox of pending trainee submissions with **1-Click Verify & Stamp**.
   - **Trainee Directory (`/admin/trainees`)**: Search and filter by Restaurant Brand, Branch Location, and Cohort Batch.
   - **Individual Passport Inspector (`/admin/trainees/[id]`)**: Deep-dive employee passport view with individual sign-off toggles.
   - **Cohort Batch Attendance Tool (`/admin/batch`)**: Multi-select attendees and bulk-stamp milestones in an atomic transaction.

3. **5 Uniform Development Paths**:
   - 🔰 **Onboarding** (`ONBOARDING`): Orientation, food safety, store tour, 30-day check-in.
   - 🗣️ **Communication Skills** (`COMMUNICATION`): Guest greetings, active listening, service recovery, shift handovers.
   - 🍳 **Technical Skills** (`TECHNICAL`): POS competency, recipe specs, table service sequence, closing audits.
   - 🤝 **Personal Effectiveness & Culture** (`CULTURE`): Core Bistro values, grooming standards, composure, peer recognition.
   - 🏆 **Leadership Skills** (`LEADERSHIP`): Peer mentoring, station supervision, huddle facilitation, capstone sign-off.

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

All authenticated trainee screens share `app/passport/layout.tsx` and
`components/trainee/TraineeNavigation.tsx`: a white header, Dashboard / My passport
links with a gold active underline, trainee identity, and a separate Sign out
action with a pending state. On smaller screens the links sit beneath the brand
and account actions. Module pages keep Dashboard active as their parent section.
The brand links home to the dashboard, and a keyboard skip link targets the main
content. Navigation follows the current GOV.UK service-navigation guidance:
https://design-system.service.gov.uk/patterns/navigate-a-service/
The shared header and right-side account utilities also draw on Carbon's UI shell:
https://www.carbondesignsystem.com/building-blocks/core/components/ui-shell-header/guidelines

The authenticated `/passport` route renders `components/trainee/TraineeDashboard.tsx`
with live repository data. Track selection filters the learning cards. The detailed
milestone list has been removed from the dashboard; cards link to authenticated
`/passport/modules/[id]` screens for module details and trainer review requests.
Use "View all modules" to access every module in the selected track.

The "View passport" action navigates to the authenticated `/passport/booklet`
screen, which uses the portal's maroon, gold, warm canvas, and white card theme.
`components/passport/PassportBook.tsx` renders an inline reader with CSS 3D page
turns, arrow keys, track shortcuts, spread selection, and reduced motion support.
A "Back to dashboard" link returns to the operational view. On narrow screens,
the two-page spread scrolls horizontally.
Below the reader, `StampDetailCallout.tsx` provides an inline detail panel for every
stamp state. Hover, keyboard focus, and tap update the preview, verification
status, trainer approval, and trainee reflection. The selection remains visible
until another stamp is inspected or the spread changes. The panel stays in normal
page flow so it cannot cover the reader controls. Incomplete, unlocked milestones
include an optional reflection field and a Submit for review action. Drafts are
kept per milestone while browsing. Submission uses the existing server action to
set `READY_FOR_REVIEW` and put the milestone in `/admin/queue`, matching the
notification workflow in `architecture.md`; it does not send email or push alerts.
Queued, verified, and locked milestones show their current state and cannot be
resubmitted. Server-side guards preserve existing trainer approvals and prevent
duplicate queue entries. Empty reflections use the portal's existing reflection
prompt. The named reference images were not
supplied with this change, so their exact placeholder wording is unverified.
`lib/passport/book.ts` allocates exactly 32 pages: cover, holder profile, then one
introduction and five milestone pages for each of the five paths. This is a
provisional allocation based on the supplied wireframe; a full physical booklet
specification was not supplied. Milestones are sorted and distributed without
omission, including when a track has more than five milestones.

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
