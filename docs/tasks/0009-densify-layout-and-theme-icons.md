# 0009 - Densify Layout And Theme Icons

- Status: `done`
- Priority: `P2`
- Type: `feature`
- Owner: `unassigned`
- Created: `2026-02-15`
- Updated: `2026-02-15`
- Depends on: `none`
- Parallel-safe: `yes`
- Suggested branch: `codex/ticket-0009-dense-layout-theme-icons`
- Suggested worktree: `../pomo-0009-dense-layout`

## Summary

The default interface consumed too much vertical space on both desktop and mobile and used literal text (`sun`/`moon`) for theme controls. Users asked for denser presentation and icon-based theme affordances.

## Scope

### In scope

- Compress spacing, sizing, and typography to improve single-screen fit in core views.
- Preserve readability and interactivity in both desktop and mobile layouts.
- Replace textual theme glyph labels with visual icons while maintaining accessible labels.

### Out of scope

- Full visual redesign or changes to collaboration/timer behavior.
- Accessibility feature expansion beyond preserving existing semantics.

## Likely Files

- `src/App.svelte`
- `src/app.css`
- `tests/e2e/*.spec.ts`

## Acceptance Criteria

- [x] Theme toggle renders iconography instead of textual `sun`/`moon` strings.
- [x] App shell, session panels, and timer editors use denser spacing on desktop and mobile.
- [x] Home/session visibility and navigation behavior remain covered by automated e2e checks.
- [x] `just verify` passes.

## Notes

- Added icon-only theme toggle rendering with accessible labels in `src/App.svelte`.
- Reduced spacing, panel padding, control sizing, and typography scale in `src/app.css`.
- Expanded e2e assertions in `tests/e2e/*.spec.ts` to cover first-load home visibility and leave-to-home behavior.
