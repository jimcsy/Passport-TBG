# GEMINI.md - The Bistro Group "Growth Passport" Project Rules

## 1. Project Overview & Architecture
- **Application**: Digital "Growth Passport" portal for **The Bistro Group** (BEAT Program).
- **Core Purpose**: Replaces physical training booklets with a digital progress tracker across 5 standardized development paths.
- **Architecture**: Next.js 14+ (App Router, TypeScript) monolithic full-stack application with strict route grouping:
  - `(trainee)`: Public / passwordless lookup at `/` via `Trainee Code + Email`.
  - `(admin)`: Secured BEAT Trainer/Admin portal at `/admin` via `Employee ID + Password`.
- **Database & ORM**: SQLite via Prisma ORM for initial zero-friction development, isolated cleanly for easy migration to Supabase (PostgreSQL) post-verification.
- **Sessions & Auth**: Lightweight encrypted HTTP-only session cookies (`jose` + `bcryptjs`).

---

## 2. Brand Identity & Design System (BEAT)
All UI components, styles, and layouts MUST adhere strictly to the BEAT brand tokens:
- **Brand Maroon (Primary Dark)**: `#5C1D24` (Sidebars, navbar, primary action buttons, headers)
- **Brand Gold (Accent)**: `#C29B38` (Active states, link highlights, badge borders, passport verification stamps)
- **Background Canvas**: `#FAF8F4` (Warm off-white neutral for page backgrounds)
- **Card Background**: `#FFFFFF` (Pure white for cards, sheets, modals, and passport pages)
- **Component Primitives**: Tailwind CSS, shadcn/ui-inspired primitives, and Lucide React icons.
- **UX Metaphor**: Physical Growth Passport booklet recreated digitally (stamps, verified seals, progress bars).

---

## 3. The 5 Development Paths
Every trainee progresses through the following 5 uniform development paths:
1. **Onboarding** (`ONBOARDING`)
2. **Communication Skills** (`COMMUNICATION`)
3. **Technical Skills** (`TECHNICAL`)
4. **Personal Effectiveness & Culture** (`CULTURE`)
5. **Leadership Skills** (`LEADERSHIP`)

Milestone statuses:
- `LOCKED`: Prerequisite milestone not yet completed.
- `IN_PROGRESS`: Milestone actively being worked on.
- `READY_FOR_REVIEW`: Trainee self-marked as complete with optional reflection note, awaiting trainer verification.
- `VERIFIED`: Trainer confirmed and stamped with trainer ID and timestamp.

---

## 4. Workflows & Core Capabilities
1. **Trainee Portal (`/`)**:
   - Passwordless lookup using `traineeCode` (e.g. `TBG-2024-001`) and `email`.
   - Visual passport book dashboard displaying completion rates across the 5 paths.
   - Self-service toggle: Mark milestone "Ready for Review" with optional reflection note.
2. **BEAT Admin Portal (`/admin`)**:
   - Login via `employeeId` + `password`.
   - **Review Queue**: Actionable list of milestones flagged `READY_FOR_REVIEW` with 1-click verify.
   - **Trainee Directory**: Filterable by restaurant brand, branch, cohort batch, and status.
   - **Hybrid Tracking**:
     - Fast 1-click individual approval toggle.
     - Batch attendance / bulk sign-off for restaurant cohort sessions.

---

## 5. Development & Verification Commands
- **Install Dependencies**: `npm install`
- **Run Dev Server**: `npm run dev` (Port 3000)
- **Database Migrations**: `npx prisma migrate dev`
- **Prisma Studio**: `npx prisma studio`
- **Seed Database**: `npm run db:seed`
- **Lint & Typecheck**: `npm run lint` && `npx tsc --noEmit`
- **Test Suite**: `npm test`

---

## 6. Coding & AI Agent Guidelines
- **Zero Mock Fallbacks in Production Code**: Keep Prisma models clean and strongly typed.
- **Type Safety**: Strictly typed server actions and API route handlers using Zod validation.
- **Clean DB Abstraction**: Keep all database queries in `/lib/db/` or dedicated repository functions to ensure moving from SQLite to Supabase PostgreSQL later is a drop-in change.
- **Maintain Schema Documentation**: Whenever any model, relation, or field is added or modified in `prisma/schema.prisma`, you MUST simultaneously update `DATABASE_SCHEMA.md` and its visual Mermaid ER diagram.
- **Preserve Brand Tokens**: Never use default generic blue or purple buttons; always use Brand Maroon `#5C1D24` and Brand Gold `#C29B38`.
