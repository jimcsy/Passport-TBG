# Growth Passport

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

TBG trainees use the portal to follow assigned learning paths, use milestone
materials, reflect on practice and request trainer review. Trainers manage reusable
training content and trainee plans, review submissions and award or revoke stamps.

## Product Purpose

Support corporate onboarding and competency development through assigned learning
milestones, trainer verification and an individual digital growth passport.

## Operating Context

The trainee workspace includes dashboard, passport, module details and
notifications. The trainer workspace includes the hub, verification queue,
training content, path builder and trainee directory. Both desktop and mobile web
workflows matter. On mobile, persistent bottom navigation provides the main tabs.

The universal foundation is “Foundation Level 1: TBG Corporate Onboarding,” with
five pillars: Onboarding, Communication Skills, Technical Skills, Personal
Effectiveness & Culture, and Leadership Skills. Trainers customize reusable role
variants and individual trainee paths while preserving existing progress and stamps.

## Capabilities and Constraints

- Materials and manual reflection/review remain part of the module workflow.
  Trainer verification, rather than AI guidance, determines earned stamps.
- Path editing must preserve existing trainee progress and awarded stamp records.
  Existing draft/publish and assignment behavior must remain explicit.
- Trainer Ask Strobi proposes editable milestone wording. Saving content,
  attaching materials and publishing remain deliberate trainer actions.
- Trainee Strobi Tips uses four preset milestone questions only: explain,
  practice, example and review preparation. It has no free-text composer.
- Trainee tips use a server-authorized eligible active-plan milestone. Module
  routes select their context without generating; dashboard/passport require an
  explicit first selection and retain a valid existing selection.
- The conversation is one combined session-memory timeline with milestone
  headings. Closing retains it; reload, sign-out, expiry and identity changes
  clear it. Previous messages are never provider context.
- Only milestone title, description/criteria and pillar enter trainee generation.
  No materials, personal records, reflections, feedback, stamps or history.
  Only nonconfidential milestone wording is suitable for the free-tier pilot.
- Generated, reused and prewritten guidance must be distinct. Strobi cannot write
  a submitted reflection, declare verification, submit review or award/revoke stamps.
- Trainee AI has an independent default-off flag. Disabled/unconfigured AI leaves
  prewritten tips and normal learning usable. Trainer AI behavior remains independent.
- Approved initial limits: three new attempts per trainee/day, trainee aggregate
  forty within the shared trainer/trainee fifty/day total. Reuse/static tips spend
  no provider attempt. No automatic retries, paid fallback or model switching.
- Guidance integration cannot alter curriculum, materials, assignments, progress,
  review decisions or stamp hashes. Final live verification and rollout are #61;
  a mocked browser success is not evidence of a successful Gemini call.

## Brand Commitments

Preserve the existing TBG/BEAT burgundy-and-gold identity and exact existing Strobi
pillar assets. Local interface changes inherit the portal rather than introducing
a replacement visual identity. Strobi provides practical learning tips and never
replaces trainer judgment.

## Evidence on Hand

The approved trainee decisions and implementation sequence are recorded in
`docs/strobi-trainee-tips-plan.md` and GitHub epic #55. Technical behavior and
verification are recorded in the contracts, storage, API, UI and integration guides
under `docs/strobi-trainee-tips-*`. Existing Strobi assets and their pillar mapping
are defined by `lib/constants/mascots.ts`. Browser test fixtures are synthetic;
they are not customer evidence or production usage claims.

## Product Principles

- Preserve learning progress and trainer authority.
- Keep authoring, saving, publishing and verification deliberate.
- Make learning guidance contextual, bounded and optional.
- Keep protected context and credentials on their intended side of the boundary.
- Preserve a usable manual workflow when AI is unavailable.

## Accessibility & Inclusion

Support keyboard navigation, visible focus, Escape and focus return, announced
request states and reduced motion. Mobile chat must fit dynamic viewports and safe
areas, contain focus while modal, and coexist with bottom navigation, notifications
and stamp celebrations. Desktop chat remains modeless so learning can continue.
