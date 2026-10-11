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
