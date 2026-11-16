# The Bistro Group — "Growth Passport" Figma Make Prompt Pack

> **Design Directive**: Anti-AI-Slop, High-Craft Editorial & Physical Hospitality Passport Metaphor.
> Every screen must feel like a bespoke digital extension of The Bistro Group's premier hospitality training booklet: tactile, warm, brass-and-burgundy accented, typography-driven, and meticulously structured with zero generic SaaS purple/blue gradients.

---

## 🎨 Global Design Tokens & Style System

Before generating individual screens, paste this style foundation into Figma Make to establish the shared design language:

```text
Create a unified Design System & Component Library for a luxury hospitality training portal called "The Bistro Group Growth Passport (BEAT Program)".

Color Palette:
- Brand Maroon (Primary Dark): #5C1D24
- Brand Maroon Deep (Header/Dark Backgrounds): #3D1217
- Brand Gold (Primary Accent & Verification Foil): #C29B38
- Brand Gold Light (Subtle Tints & Highlighting): #F4EFE1
- Warm Parchment (Page Canvas Background): #FAF8F4
- Card & Sheet White (Pure White Elements): #FFFFFF
- Text Primary (Deep Charcoal/Maroon): #2C1215
- Text Secondary (Muted Editorial Charcoal): #6B5558
- Border Neutral (Fine Gold/Warm Sand): #EBE3D6
- Status Verified Green/Gold: #2E6930 / #C29B38
- Status Review Amber: #C28518
- Status Locked Neutral: #9E928F

Typography Scale (Inter / Playfair / Outfit):
- Display/Headings: Playfair Display or Outfit, Bold/Extrabold, tight tracking (-0.02em).
- Body & UI: Inter, SemiBold/Medium for labels, Regular for prose.
- Mono/Metadata: JetBrains Mono or SF Mono for employee codes, hashes, version numbers (v3 · IT_TECH_SUPPORT).

Component Primitives:
- Border Radii: 8px (pills/controls), 16px (cards), 24px (hero sections/booklet).
- Borders: 1px solid #EBE3D6 or #C29B38 with 25% opacity.
- Left Accent Bar: 6px solid #5C1D24 on primary overview cards.
- Passport Verification Stamps: Circular and scalloped rubber/wax seals in #C29B38 and #5C1D24 with distressed borders, date stamped, trainer ID, and restaurant brand watermark.
- Mascots: "Strobi" character emblems with soft pastel circular backdrops (Peach, Coral, Sand, Sage, Lavender) blended seamlessly into cards.
```

---

## Batch 1: Trainee Experience

### Prompt 1.1: Trainee Public Portal & Passwordless Lookup (`/` & `/trainee`)
**Device**: Desktop (1440×900) and Mobile (390×844)

```text
Design the public-facing trainee lookup landing page for The Bistro Group's digital Growth Passport.

Visual Theme:
- Warm parchment background (#FAF8F4) with subtle vintage hospitality watermark texture.
- Centered elegant passport authentication modal/card with deep maroon (#5C1D24) header and gold-foiled (#C29B38) BEAT program crest.

Header Area:
- The Bistro Group corporate crest and "Bistro Employee Advancement & Training (BEAT)" gold typography.
- Subtitle: "Welcome to your Growth Passport. Enter your credentials to open your training record."

Main Form Card (Width 440px):
- Pure white container with 16px radius, gold-tinted hairline border (#EBE3D6), and soft drop shadow.
- Input Field 1: "Trainee Code" with icon (e.g. TBG-2024-001) in monospace font, floating label, and clean focus ring (#C29B38).
- Input Field 2: "Corporate Email Address" (e.g. alex.santos@bistro.com.ph).
- Primary Action Button: Full-width Brand Maroon (#5C1D24) button with gold text "Open My Growth Passport →", 12px padding, subtle gold border.
- Helper Note: "First time logging in? Your trainer provided your onboarding code during batch orientation."

Brand Showcase Footer:
- Subtle row of restaurant brand logos (TGI Fridays, Italianni's, Texas Roadhouse, Denny's, Buffalo Wild Wings) in muted monochrome charcoal.
- Link at bottom: "Trainer / Admin Portal Sign-In →" leading to /trainer/login.
```

---

### Prompt 1.2: Trainee Dashboard & Learning Overview (`/trainee/dashboard`)
**Device**: Desktop (1440×1024) and Mobile (390×844)

```text
Design the primary desktop Trainee Learning Overview page for The Bistro Group Growth Passport.

Canvas & Layout:
- Background: #FAF8F4. Top sticky minimal navbar with trainee profile chip (Alex Santos · Italianni's BGC), unread stamp notifications bell (with gold badge "2"), and "View Passport Booklet" button.

1. Passport Cover Profile Header (Width: 100%):
- Elegant horizontal banner modeled after a physical embossed leatherette passport cover.
- Deep Maroon (#5C1D24) textured background with gold foil debossed lettering: "PHILIPPINES • THE BISTRO GROUP • BEAT GROWTH PASSPORT".
- Trainee Photo avatar with gold circular border, Name: "Alex Santos", Role: "Front of House · Captain Waiter", Branch: "Bonifacio Global City", Cohort: "Cohort-2024-Q4".
- Overall progress donut gauge or segmented bar: "14 of 21 Milestones Verified · 67% Complete".

2. Collided Curriculum & Development Paths Showcase (Wide Hero Section):
- Outer Card: 16px radius, #FAF7F2 warm tint, 6px solid #5C1D24 left accent border, fine gold border #EBE3D6.
- Top Wide Header Row:
  - Pill badge: "ROLE CURRICULUM" in gold badge + monospace "v3 · FOH_SERVER".
  - Big Title: "FOH Server & Guest Experience Track".
  - Subtitle: "Role-specific BEAT curriculum · 21 required competencies across 5 pillars".
  - Preserved Endorsements Pill: "2 historical stamps preserved from Foundation v1".
- Bottom Content Row (Two Columns, Equal Height):
  - Left Column (Width 300px): Strobi Learning Guide card. Circular mascot emblem with Strobi the Sprinter (Onboarding mentor), label "YOUR LEARNING GUIDE", title "Strobi the Sprinter", and a speech bubble with golden pointer: "Hi, I'm Strobi! Master guest table touchpoints to unlock your next stamp!"
  - Right Column: 5 Development Path Cards in a horizontal row:
    - Card 01: Onboarding (Peach circle avatar, "01", "Onboarding", "4/4 verified · 100%", full gold bar, small green checkmark).
    - Card 02: Communication Skills (Coral circle avatar, "02", "Communication", "3/4 verified · 75%").
    - Card 03: Technical Skills (Sand circle avatar, "03", "Technical Skills", "4/5 verified · 80%").
    - Card 04: Culture & Values (Sage circle avatar, "04", "Culture & Values", "2/4 verified · 50%").
    - Card 05: Leadership Skills (Lavender circle avatar, "05", "Leadership Skills", "1/4 verified · 25%").
  - Hover Interaction: Hovering over any card highlights the card with a gold ring and dynamically swaps the left Strobi mascot and speech bubble.

3. "Continue Learning" Section:
- Heading: "Continue Learning" with subtitle "Your next modules ready for practice".
- 3 Milestone Cards in progress with status pill "IN PROGRESS" or "READY FOR REVIEW", showing competency code (e.g. FOH-COMM-03: "Handling Guest Allergens"), estimated time, and action button "Open Module".
- LinkedIn Learning integration card at right: "Hospitality Communication Essentials" with LinkedIn logo and "Available Online".
```

---

### Prompt 1.3: Digital Growth Passport Booklet Flipbook (`/trainee/dashboard/booklet`)
**Device**: Desktop (1440×900)

```text
Design an ultra-tactile 32-page Digital Passport Booklet reader that looks like a real physical official passport.

Visual Atmosphere:
- Warm dark library desktop background (#2C1215 with 5% vignette and subtle woodgrain texture).
- In the center: A realistic two-page spread open booklet (approx 980px × 640px) with central book spine crease shadow, soft page curl, and gold gilded page edges.

Left Page (Visa Page - "Communication Skills"):
- Delicate background security guilloche pattern printed in pale gold/beige (#EFE6D5) with Bistro Group monogram watermark.
- Page header: "PAGE 08 • BEAT GROWTH PASSPORT • COMMUNICATION PILLAR".
- 4 visa stamp boxes with perforated dashed lines.
- Box 1: Stamped with an official round burgundy-and-gold ink stamp seal: "TBG VERIFIED • MAR 14 2024 • TRAINER ID #TBG-TR-881 • BEAT COLLABORATION AWARD". Distressed ink texture.
- Box 2: Stamped with an octagonal brass wax seal stamp: "TBG COMM-02 VERIFIED • GUEST RECOVERY MASTERY".
- Box 3: Empty box with watermark "Awaiting Trainer Verification".
- Box 4: Empty box marked "Locked • Prerequisite Required".

Right Page (Visa Page - "Technical Skills"):
- Page header: "PAGE 09 • BEAT GROWTH PASSPORT • TECHNICAL PILLAR".
- Trainee signature line at bottom with digital handwritten signature of trainee.
- Official bar code and security serial number along the outer margin.

Booklet Navigation Controls:
- Bottom floating dock with pill shape (#5C1D24 with gold border): "Previous Page (7)", "Page 8 of 32", "Next Page (9)", and a "Jump to Pillar" dropdown selector.
- Top right button: "Download Verified PDF Passport ⤓".
```

---

### Prompt 1.4: Milestone Module Detail & Submission with Strobi AI Tips (`/trainee/dashboard/modules/[id]`)
**Device**: Desktop (1440×1024) and Mobile (390×844)

```text
Design the interactive Milestone Module Detail and Self-Review Submission page.

Header:
- Breadcrumbs: "Learning Overview > Communication Skills > FOH-COMM-02: Table Touch Points".
- Milestone Title: "FOH-COMM-02: Executing the 2-Minute Table Touch Point".
- Pillar Chip: Coral badge "COMMUNICATION SKILLS" + Status Badge: "IN PROGRESS" (Amber).
- Verification Seal Preview: Monochromatic outline of the unearned stamp showing what badge unlocks upon completion.

Main Two-Column Layout (70% / 30%):
Left Column (Competency Content & Submission Form):
1. Competency Objective Box:
   - "Standards of Excellence": Clear bulleted checklist of expected behaviors during table touch point in Italianni's restaurant.
   - Resource attachments: PDF guide "Table Service SOP v4.pdf" and video clip "Perfect Touch Point Demonstration (3 mins)".
2. Trainee Submission Box:
   - "Self-Reflection & Trainer Notes": Rich text editor with placeholder "Describe a shift where you handled a table concern within the 2-minute standard...".
   - Optional File Attachment: Dropzone for shift photos or shift feedback slips.
   - Action Button: Big Brand Maroon button with Gold border: "Mark Ready for Trainer Review ✓".
   - Helper label: "Your trainer will be notified to observe your shift and stamp this milestone."

Right Column (Strobi AI Assistant Side Drawer):
- Strobi Assistant Card with rounded-2xl border (#C29B38/30) and header: "Ask Strobi the Speaker".
- Strobi circular avatar on podium.
- 4 Preset Prompt Chips (Zero freeform typing allowed, strictly pre-configured):
  1. "💡 Explain this milestone"
  2. "📋 What does the trainer check?"
  3. "💬 Give me an example phrase"
  4. "❓ Practice scenario"
- Chat Message Feed: Shows Strobi's practical restaurant tips in friendly speech bubbles, with badge "Reused AI tip" or "Standard BEAT Guidance".
```

---

### Prompt 1.5: Stamp Celebration Modal & Notifications (`/trainee/dashboard/notifications`)
**Device**: Desktop modal overlay (1440×900) and Mobile sheet

```text
Design a celebratory "Passport Stamped!" modal overlay that triggers when a trainer verifies a trainee's milestone.

Atmosphere:
- Darkened backdrop (80% opacity #2C1215 with subtle celebratory golden confetti particles).
- Center celebratory card (520px width, pure white with double gold hairline borders and decorative corner ornaments).

Card Content:
- Top Header: "PASSPORT ENDORSEMENT RECORDED" in gold uppercase serif lettering.
- Centerpiece Graphic: Animated high-fidelity brass wax seal & rubber stamp stamp-down graphic:
  - Deep Maroon (#5C1D24) outer scalloped ring with "THE BISTRO GROUP • BEAT VERIFIED".
  - Gold foil center with custom pillar mascot icon (Strobi the Craftsman).
  - Stamped date "NOVEMBER 10, 2024" and Trainer Signature "Verified by Chef Marco D. (TR-042)".
- Milestone Awarded: "FOH-TECH-04: POS Speed & Split-Billing Protocol".
- Trainer Note Quote: "Excellent accuracy during Friday dinner rush with zero void errors. Well deserved!" — Chef Marco.
- Hash Verification Stamp: Monospace security hash "SHA256: 8f2a...c019 (Tamper-proof endorsement)".
- Primary Button: Brand Maroon button "View in Passport Booklet →".
- Secondary Link: "Close & Continue Learning".
```

---

## Batch 2: Trainer & Admin Portal

### Prompt 2.1: Trainer & Admin Login (`/trainer/login`)
**Device**: Desktop (1440×900)

```text
Design the secured BEAT Trainer and Corporate Admin login portal.

Visual Theme:
- Deep Maroon (#3D1217 to #5C1D24) subtle radial gradient background with hospitality monogram motif.
- Elevated split-card in center:
  - Left Side (40%): Editorial photo of restaurant trainers mentoring team members in a busy Bistro Group dining room, with golden overlay text: "Inspire Excellence. Verify Growth. The Bistro Group BEAT Portal."
  - Right Side (60%): Clean white login panel.

Login Panel Details:
- Brand Logo: "The Bistro Group" in gold + "BEAT Operations & Verification Portal".
- Field 1: "Employee ID" (e.g. EMP-1092).
- Field 2: "Password" with visibility toggle.
- "Remember this terminal" checkbox for restaurant floor iPads.
- Primary Button: Brand Maroon button "Sign In to Trainer Workspace →".
- Security Badge: "Secured with HTTP-only encrypted session cookies & RBAC".
```

---

### Prompt 2.2: Trainer Review Queue (`/trainer/queue`)
**Device**: Desktop (1440×1024)

```text
Design the high-efficiency Trainer Review Queue where trainers approve trainee milestones.

Header & Quick Stats Bar:
- Title: "Verification Queue".
- 4 Stat Pills: "12 Awaiting Review", "48 Verified This Week", "Italianni's BGC", "Batch 2024-Q4".
- Search & Filter bar: Search by trainee name/code, filter by restaurant brand (TGI Fridays, Italianni's, etc.), filter by pillar.

Main Review Table / Card Stack:
- List of trainee milestone submissions awaiting review:
  - Trainee Info: Avatar, "Maria Gomez (TBG-2024-042)", Brand: "Texas Roadhouse Uptown", Role: "BOH Line Cook".
  - Milestone: "BOH-TECH-02: Cold Line Prep & Sanitation Standards".
  - Submission Date: "2 hours ago".
  - Trainee Reflection Note Snippet: "Completed morning prep checklist and passed line temperature audit."
  - Action 1: "Quick Verify" (instant 1-click stamp button with gold checkmark).
  - Action 2: "Review Details" (opens review drawer).

Review Drawer (Slide-out from right, 480px width):
- Full trainee submission note, attached photos of prep station.
- Trainer Evaluation Input: Optional encouragement note to appear in the trainee's passport booklet.
- Rubber Stamp Selector: Choose custom commemorative stamp design.
- Dual Action Buttons:
  - "Approve & Stamp Passport" (Brand Maroon, full width).
  - "Request Revisions" (Ghost button with feedback field).
```

---

### Prompt 2.3: Trainee Directory & Individual Custom Path (`/trainer/trainees` & `/trainer/trainees/[id]`)
**Device**: Desktop (1440×1024)

```text
Design the Trainee Roster Directory and the Individual Trainee Progress Profile.

Screen 1: Trainee Roster (`/trainer/trainees`):
- Filterable data table of all 150+ enrolled trainees.
- Columns: Trainee Name & Code, Restaurant Brand & Branch, Assigned Training Plan ("IT & Tech Support v3" vs "Foundation Level 1"), Progress Bar (% completed with 5 micro-color dots for the 5 pillars), Last Activity, Actions.
- Bulk Actions Bar: Select multiple trainees for "Bulk Sign-Off" or "Reassign Plan".
- Top right button: "+ Enroll New Trainee".

Screen 2: Individual Trainee Profile & Plan Customizer (`/trainer/trainees/[id]`):
- Top Banner: Trainee summary (Alex Santos, Italianni's, hired Oct 2024).
- Plan Badge: "Custom Individual Instance (derived from FOH Server v2)".
- Button: "Customize Individual Path" (opens draft builder modal).
- 5 Pillar Accordion Tabs showing all 21 milestones:
  - Each milestone row displays: Code, Title, Current Status (Verified with Trainer Name, In Progress, Locked), and stamp preview.
  - One-click override toggle for trainers to mark any milestone verified directly.
```

---

### Prompt 2.4: Training Plans Master Catalog & Outline Builder (`/trainer/plans` & `/trainer/plans/[id]/builder`)
**Device**: Desktop (1440×1024)

```text
Design the Training Plan Catalog and Interactive Node-Based Curriculum Builder.

Screen 1: Training Plan Catalog (`/trainer/plans`):
- Master Foundation Card: Top prominent hero card for "Foundation Level 1: TBG Corporate Onboarding (Master Template, 5 Pillars, 20 Milestones)". Button: "Edit Master Nodes".
- Role Variants Table: Reusable branch tracks:
  - "FOH Server Track (v3 · Published · 21 Milestones · 45 Trainees Enrolled)".
  - "BOH Line Cook Track (v2 · Published · 24 Milestones · 38 Trainees Enrolled)".
  - "IT & Tech Support Track (v3 · Published · 21 Milestones · 6 Trainees Enrolled)".
- Top Button: "+ Create Role Variant".

Screen 2: Path Builder Canvas (`/trainer/plans/[id]/builder`):
- Header Bar: Plan Name, Version badge (v3 DRAFT), "Discard Changes", and Brand Maroon "Publish Revision" button with scope selector ("Only This Plan" vs "Propagate to Trainees").
- Left Palette: Milestone Library drawer (drag-and-drop reusable competencies into tracks).
- Center Canvas: Clean 5-column pillar track board (Onboarding, Communication, Technical, Culture, Leadership) with connected milestone nodes.
  - Nodes have code, title, prerequisite arrow connectors, and drag handles.
- Right Inspector: Selected node inspector (edit title, description, order, stamp design, and required proof).
```

---

### Prompt 2.5: Batch Session Attendance & Workshop Sign-Off (`/trainer/batch`)
**Device**: Desktop (1440×1024)

```text
Design the Batch Session Attendance and Bulk Sign-Off interface for in-person training workshops.

Context:
- A trainer conducts an in-person orientation or food safety workshop with 15 trainees in a classroom. They need to bulk-sign off attendance and stamp everyone's passport in 10 seconds.

UI Structure:
- Top Controls:
  - Select Workshop / Milestone: Dropdown (e.g. "CULT-01: The Bistro Way & Hospitality Core Values").
  - Select Cohort Batch: "Cohort 2024-Q4 • Manila Hub".
  - Date & Trainer ID: "Nov 10, 2024 • Certified by HRD Director".

Main Interactive Grid:
- Roster checklist of all 15 trainees in the batch with checkboxes.
- Column 1: Trainee avatar, code, and restaurant brand.
- Column 2: Current status for this milestone (e.g. "Not Started" or "In Progress").
- Column 3: Workshop Attendance toggle ("Present" / "Absent").
- Column 4: Assessment Score / Practical Check (Pass/Needs Review).

Bottom Sticky Action Bar:
- "14 Trainees Selected for Sign-Off".
- Trainer Stamp Note: "Batch Workshop Session completed at Bistro Academy Hub".
- Primary Action: Big Gold & Maroon button: "Bulk Stamp 14 Passports Now ✦".
- Confirmation feedback: Success toast showing 14 stamp hashes generated in parallel.
```

---

## 🛠️ Step-by-Step Instructions to Run in Figma

1. **Open Figma** and launch **Figma AI / Make Designs** (or your Figma AI prompt panel).
2. **Start with the Style System**: Paste the **Global Design Tokens & Style System** prompt first to create your colors, font styles, and card components.
3. **Generate Batch 1 (Trainee)**: Paste prompts **1.1 through 1.5** one by one. Review each frame and ensure the `#5C1D24` maroon and `#C29B38` gold brand tokens are applied.
4. **Generate Batch 2 (Trainer)**: Paste prompts **2.1 through 2.5** to generate the administrative and builder screens.
5. **Review Consistency**:
   - Check that the Strobi mascots use circular pastel badges.
   - Verify that stamp seals have authentic distress/distinction.
   - Ensure table typography uses monospace fonts for codes (`TBG-2024-001`) and editorial serif/sans for headings.
