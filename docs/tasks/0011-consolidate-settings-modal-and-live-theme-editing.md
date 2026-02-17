# 0011 - Consolidate Settings Modal And Live Theme Editing

- Status: `done`
- Priority: `P1`
- Type: `feature`
- Owner: `unassigned`
- Created: `2026-02-15`
- Updated: `2026-02-15`
- Depends on: `none`
- Parallel-safe: `yes`
- Suggested branch: `codex/ticket-0011-settings-modal-live-theme`
- Suggested worktree: `../pomo-0011-settings-modal`

## Summary

The main timer surface was still too dense and room theme controls required extra explanatory language. This work moves advanced controls into a modal/sheet, applies room theme edits instantly (no save/cancel), and uses an out-of-the-box emoji picker for full emoji selection.

## Scope

### In scope

- Replace always-visible settings surfaces with a single `Settings` entry point.
- Use responsive modal/sheet behavior for desktop/mobile.
- Move room theme editing into settings and apply updates immediately.
- Integrate a production emoji picker component supporting full emoji selection.
- Expand e2e coverage for new modal, tooltip, emoji, and mobile flows.

### Out of scope

- Full redesign of timer layout beyond density and settings placement.
- Server-side persistence for user sound preferences.

## Likely Files

- `src/lib/PomodoroSession.svelte`
- `src/lib/PomodoroTimer.svelte`
- `src/app.css`
- `tests/e2e/*.spec.ts`
- `package.json`

## Acceptance Criteria

- [x] Desktop and mobile default session views keep primary controls visible without expanded settings forms.
- [x] Settings open via a single action and close via standard close affordances.
- [x] Room theme updates apply instantly without save/cancel controls.
- [x] Emoji selection uses an out-of-the-box picker and supports full emoji choices.
- [x] Mobile e2e coverage validates settings-sheet behavior.
- [x] `just verify` passes.

## Notes

- Added `emoji-picker-element` dependency and lazy-loaded picker initialization.
- Added settings help tooltip behind a `?` control to reduce persistent UI text.
