# BEAT interface conventions

Use the portal as a working interface: lead with the task, its current state,
and the next action. Use the same conventions in trainee and trainer screens.

- Keep the BEAT colors: maroon `#5C1D24`, gold `#C29B38`, canvas `#FAF8F4`, and white cards. Use maroon for primary actions and gold for progress, selection, and passport approvals.
- Use the system sans-serif stack. Prefer sentence case, regular body text, and semibold headings. Reserve monospace for identifiers where it helps reading.
- Use 8px corners on routine cards and 12px on larger surfaces and dialogs. Use a border or spacing for separation; reserve stronger shadows for overlays and the physical passport.
- Add an icon when it identifies a control or status. Avoid decorative sparkles, repeated icon tiles, star banners, and verification icons on ordinary page labels.
- Give each action group a clear primary action. Secondary actions use white or canvas backgrounds. Keep functional progress indicators and loading feedback; avoid pulsing ordinary status labels.
- Write direct labels: “Sign in”, “Submit for review”, “Arrange”, and “No pending reviews”. Avoid promotional slogans and implementation terms in product instructions.
- Preserve the passport's circular seals and page-turn metaphor. Routine metadata, plan versions, and job roles do not need stamp borders.
- Keep focus indicators, visible status labels, and keyboard access. Canvas actions must be reachable on keyboard focus as well as pointer hover.
- Development-only demo credentials stay out of the production interface.
- Use the shared `beat-control`, `beat-primary`, and `beat-segment` styles for compact builder and version controls. Primary actions use maroon; version selection uses white/canvas with explicit pressed states, rather than green/amber fills.
- Keep version states explicit in text: Published, Draft, Read only, New, and Viewing. Use a single quiet status strip and avoid repeating the same state in banners, badges, and action buttons.
- Version history uses a simple divided list. The active version has a gold selection edge; load and draft actions retain the same control hierarchy as the builder.

## Training Content workspace

- Keep four trainer destinations: Hub, Verifications, Training Content and Trainees. Training Content contains Training Plans and Milestone Library; preserve existing builder links and the mobile bottom navigation.
- Use compact divided catalog/library rows with readable text metadata, explicit origin and precisely labeled counts. Count current reusable plans separately from history, private instances and active trainees.
- Open fresh builders in Outline/Whole plan with five pillars. Preserve desktop Canvas as an optional view over the same draft. Mobile uses the focused outline and path selector.
- Use a docked inspector on desktop and a full-screen, independently scrolling inspector on mobile. Preserve staged fields across selection/resizing; Escape closes nested previews first and returns focus on inspector close.
- Keep save scope next to its action: Apply to draft, Save draft, Save shared details and Publish. Saved shared materials affect linked references immediately; unpublished inspector fields are excluded from draft save/publish.
- Create shared milestones before enabling uploads, transition the same inspector to materials, then require explicit draft insertion. Show validation, pending, retry and zero-material states without introducing a new content lifecycle.
- Keep routine controls and mobile navigation at usable touch sizes, visible focus states and bottom-navigation clearance. Informational stamp tooltips must not intercept module-link taps.

Implemented workflow: [trainer guide](docs/trainer-content-guide.md). Reviewed screenshots, evidence and limits: [handoff](docs/trainer-content-handoff.md).

References reviewed for this refinement:

- [Linear's March 2026 interface refresh](https://linear.app/now/behind-the-latest-design-refresh): less competing decoration, fewer icons, and predictable control placement.
- [Vercel Geist](https://vercel.com/geist/introduction) and [buttons](https://vercel.com/geist/button): consistent component hierarchy and primary/secondary controls.

These inform spacing and hierarchy; BEAT retains its own palette and system font.
