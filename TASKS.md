# TASKS.md - Implementation Roadmap: The Bistro Group Growth Passport

This roadmap breaks down the construction of the Growth Passport portal into atomic, verifiable issues.

---

## Milestone 1: Project Scaffolding & Design System Foundations
- [x] **Task 1.1: Initialize Next.js 14+ App with TypeScript & Tailwind CSS** ([#1](https://github.com/jimcsy/Passport-TBG/issues/1))
  - Setup Next.js App Router, TypeScript, Tailwind CSS, Lucide Icons.
  - Configure BEAT Brand Colors in `tailwind.config.ts`:
    - Brand Maroon: `#5C1D24`
    - Brand Gold: `#C29B38`
    - Canvas: `#FAF8F4`
    - Card: `#FFFFFF`
- [x] **Task 1.2: Setup Prisma with SQLite & Migrations** ([#2](https://github.com/jimcsy/Passport-TBG/issues/2))
  - Install `@prisma/client` and `prisma`.
  - Implement domain models (`AdminUser`, `Trainee`, `MilestoneDefinition`, `TraineeProgress`).
  - Run initial migration and generate Prisma Client.
- [ ] **Task 1.3: Minimal Seed Script** ([#3](https://github.com/jimcsy/Passport-TBG/issues/3))
  - Seed 1 Admin Trainer (`EMP-1001` / `password123`).
  - Seed 1 Trainee (`TBG-2024-001`, `trainee@bistro.com.ph`).
  - Seed the standard 20 milestones across the 5 development paths.

---

## Milestone 2: Authentication & Session Layer
- [ ] **Task 2.1: Lightweight Encrypted Cookie Session Utility** ([#4](https://github.com/jimcsy/Passport-TBG/issues/4))
  - Create `lib/auth/session.ts` using `jose` and `bcryptjs`.
  - Handle admin session tokens (role, employeeId, name).
  - Handle trainee lookup session tokens (traineeCode, email, traineeId).
- [ ] **Task 2.2: Route Protection & Middleware** ([#4](https://github.com/jimcsy/Passport-TBG/issues/4))
  - Protect `/admin/*` routes to require valid admin session (redirect to `/admin/login`).
  - Protect `/passport` to require valid trainee lookup session (redirect to `/`).

---

## Milestone 3: Trainee Portal (`/`)
- [ ] **Task 3.1: Passwordless Lookup Landing Page (`/`)** ([#5](https://github.com/jimcsy/Passport-TBG/issues/5))
  - Clean branded hero with BEAT logo and "Growth Passport" branding.
  - Simple form: Trainee Code + Email input.
  - Server action to verify credentials and redirect to `/passport`.
- [ ] **Task 3.2: Digital Passport Dashboard (`/passport`)** ([#6](https://github.com/jimcsy/Passport-TBG/issues/6))
  - Passport Cover component: Trainee name, brand (e.g. TGI Fridays), branch, hire date, and overall completion ring.
  - 5 Development Path tabs/sections with progress indicators.
  - Milestone cards displaying status (`LOCKED`, `IN_PROGRESS`, `READY_FOR_REVIEW`, `VERIFIED`).
  - Verified gold stamp visual badge with trainer sign-off metadata.
- [ ] **Task 3.3: "Ready for Review" Action & Modal** ([#7](https://github.com/jimcsy/Passport-TBG/issues/7))
  - Trainee click to mark milestone as ready for review.
  - Optional reflection note submission.
  - Real-time UI update reflecting pending status.

---

## Milestone 4: BEAT Admin / Trainer Portal (`/admin`)
- [ ] **Task 4.1: Admin Login Screen (`/admin/login`)** ([#8](https://github.com/jimcsy/Passport-TBG/issues/8))
  - Secured Employee ID + Password form with BEAT Maroon branding.
- [ ] **Task 4.2: Admin Layout & Navigation** ([#8](https://github.com/jimcsy/Passport-TBG/issues/8))
  - Persistent Maroon sidebar with navigation: Dashboard, Review Queue, Trainees, Batch Updates.
  - Trainer profile badge & logout action.
- [ ] **Task 4.3: Review Queue View (`/admin/queue`)** ([#9](https://github.com/jimcsy/Passport-TBG/issues/9))
  - List of all milestones flagged `READY_FOR_REVIEW`.
  - Trainee info, path, milestone title, trainee reflection note, and submission timestamp.
  - 1-Click "Verify & Stamp" action.
- [ ] **Task 4.4: Trainee Directory & Individual Passport View (`/admin/trainees`)** ([#10](https://github.com/jimcsy/Passport-TBG/issues/10))
  - Filterable table by Restaurant Brand, Branch Location, and Cohort.
  - Trainee detail page (`/admin/trainees/[id]`): Full view of trainee passport with 1-click toggles to verify any milestone.
- [ ] **Task 4.5: Batch Attendance & Bulk Sign-Off Tool (`/admin/batch`)** ([#11](https://github.com/jimcsy/Passport-TBG/issues/11))
  - Multi-filter selectors (Brand, Branch, Cohort).
  - Multi-select trainee checkbox list.
  - Milestone picker with bulk "Sign Off (N trainees)" button.

---

## Milestone 5: Verification & End-to-End Polish
- [ ] **Task 5.1: End-to-End Walkthrough Verification** ([#12](https://github.com/jimcsy/Passport-TBG/issues/12))
  - Trainee logs in $\to$ marks milestone Ready for Review.
  - Admin logs in $\to$ sees item in Review Queue $\to$ clicks 1-Click Verify.
  - Trainee refreshes $\to$ sees official Gold Seal stamp with Trainer ID.
  - Trainer performs batch sign-off on cohort.
- [ ] **Task 5.2: Supabase Preparedness Check** ([#12](https://github.com/jimcsy/Passport-TBG/issues/12))
  - Validate that all database queries are isolated in `lib/db/` so swapping SQLite to Supabase PostgreSQL is zero-friction.
