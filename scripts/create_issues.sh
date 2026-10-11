#!/usr/bin/env bash
set -e

REPO="jimcsy/Passport-TBG"

echo "Creating remaining GitHub Issues for $REPO..."

# Milestone 1 Issues
gh issue create --repo "$REPO" \
  --title "Milestone 1.2: Prisma SQLite Database Setup & Models" \
  --body "### Objective
Setup Prisma ORM with SQLite and create domain models.

### Models
- \`AdminUser\`: Employee ID, password hash, role (Trainer, Admin)
- \`Trainee\`: Trainee code, email, restaurant brand, branch, cohort
- \`MilestoneDefinition\`: 5 development paths, linear orderIndex, code, title
- \`TraineeProgress\`: TraineeId, milestoneId, status, reflection note, verifier

### Acceptance Criteria
- [ ] Prisma schema with SQLite provider and clean models
- [ ] Migrations applied successfully
- [ ] Prisma client generated"

gh issue create --repo "$REPO" \
  --title "Milestone 1.3: Database Seed with BEAT Development Paths" \
  --body "### Objective
Implement \`prisma/seed.ts\` to populate canonical milestones and minimal test accounts.

### Seed Data
- 1 Sample Admin Trainer (\`EMP-1001\` / \`password123\`)
- 1 Sample Trainee (\`TBG-2024-001\`, \`trainee@bistro.com.ph\`)
- 20 canonical milestones across the 5 development paths

### Acceptance Criteria
- [ ] \`npm run db:seed\` executes idempotently
- [ ] Database contains admin, trainee, and all 20 milestones"

# Milestone 2 Issues
gh issue create --repo "$REPO" \
  --title "Milestone 2.1: Encrypted Session Cookie & Auth Layer" \
  --body "### Objective
Implement lightweight encrypted HTTP-only session cookies with \`jose\` and \`bcryptjs\`.

### Capabilities
- Trainee session: code + email lookup verification
- Admin session: employee ID + password verification
- Zero third-party auth service lock-in

### Acceptance Criteria
- [ ] \`lib/auth/session.ts\` creates and verifies encrypted session cookies
- [ ] Admin password hashing with bcryptjs
- [ ] Route middleware protecting \`/admin/*\` and \`/passport\`"

# Milestone 3 Issues
gh issue create --repo "$REPO" \
  --title "Milestone 3.1: Passwordless Trainee Lookup Portal (/)" \
  --body "### Objective
Build public-facing passwordless trainee lookup landing page at \`/\`.

### Capabilities
- Branded hero with BEAT logo and Growth Passport branding
- Form: Trainee Code (e.g. \`TBG-2024-001\`) + Email
- Validates against database and issues trainee session

### Acceptance Criteria
- [ ] Branded input form with validation feedback
- [ ] Redirects authenticated trainee to \`/passport\`"

gh issue create --repo "$REPO" \
  --title "Milestone 3.2: Digital Passport Dashboard & 5 Paths (/passport)" \
  --body "### Objective
Build the Digital Passport Dashboard mirroring the physical booklet.

### UI Components
- Trainee Passport Cover: brand, branch, cohort, completion ring
- 5 Path navigation: Onboarding, Communication, Technical, Culture, Leadership
- Milestone cards with statuses (Locked, In Progress, Ready for Review, Verified)
- Trainer Gold Seal stamp when verified

### Acceptance Criteria
- [ ] Visual passport layout adheres to BEAT brand tokens
- [ ] Accurate path completion calculations"

gh issue create --repo "$REPO" \
  --title "Milestone 3.3: Self-Reporting 'Ready for Review' Workflow" \
  --body "### Objective
Allow trainees to mark milestones as 'Ready for Review' with an optional reflection note.

### Acceptance Criteria
- [ ] Trainee can trigger Ready for Review modal
- [ ] Submits note and transitions milestone status
- [ ] Updates trainer review queue"

# Milestone 4 Issues
gh issue create --repo "$REPO" \
  --title "Milestone 4.1: BEAT Admin Login & Layout (/admin)" \
  --body "### Objective
Build the secured BEAT Trainer/Admin portal layout and login.

### Acceptance Criteria
- [ ] Admin login at \`/admin/login\` with Employee ID + Password
- [ ] Persistent Maroon sidebar with navigation to Queue, Trainees, Batch
- [ ] Trainer user badge and logout action"

gh issue create --repo "$REPO" \
  --title "Milestone 4.2: Trainer Review Queue with 1-Click Verification" \
  --body "### Objective
Implement actionable Review Queue at \`/admin/queue\` displaying pending milestone submissions.

### Acceptance Criteria
- [ ] Displays all milestones in \`READY_FOR_REVIEW\` status
- [ ] Shows trainee info, milestone, reflection note, and timestamp
- [ ] 1-Click 'Verify & Stamp' action immediately stamps milestone"

gh issue create --repo "$REPO" \
  --title "Milestone 4.3: Trainee Directory with Brand & Cohort Filtering" \
  --body "### Objective
Build trainee directory filterable by restaurant brand, branch, and cohort batch.

### Acceptance Criteria
- [ ] Filterable directory table
- [ ] Trainee detail view (\`/admin/trainees/[id]\`) displaying individual passport with verification toggles"

gh issue create --repo "$REPO" \
  --title "Milestone 4.4: Batch Attendance & Bulk Sign-Off Tool (/admin/batch)" \
  --body "### Objective
Build cohort batch sign-off tool for restaurant operations training sessions.

### Acceptance Criteria
- [ ] Filter trainees by Brand, Branch, Cohort
- [ ] Multi-select checkboxes for cohort attendees
- [ ] Bulk sign-off for selected milestone in a single transaction"

# Milestone 5 Issues
gh issue create --repo "$REPO" \
  --title "Milestone 5.1: End-to-End Walkthrough & Supabase Readiness Audit" \
  --body "### Objective
Verify complete trainee-trainer loop and confirm repository abstraction for future Supabase migration.

### Acceptance Criteria
- [ ] Trainee self-report -> Trainer 1-click verify -> Trainee gold stamp verified
- [ ] Cohort batch update verified
- [ ] All database queries isolated in \`lib/db/\` for drop-in Supabase PostgreSQL migration"

echo "All remaining issues created successfully!"
