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

References reviewed for this refinement:

- [Linear's March 2026 interface refresh](https://linear.app/now/behind-the-latest-design-refresh): less competing decoration, fewer icons, and predictable control placement.
- [Vercel Geist](https://vercel.com/geist/introduction) and [buttons](https://vercel.com/geist/button): consistent component hierarchy and primary/secondary controls.

These inform spacing and hierarchy; BEAT retains its own palette and system font.
