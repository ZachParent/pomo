# 0004 - Improve Set Remaining Time UI

- Status: `done`
- Priority: `P1`
- Type: `bug`
- Owner: `unassigned`
- Created: `2026-02-15`
- Updated: `2026-02-15`
- Depends on: `none`
- Parallel-safe: `yes`
- Suggested branch: `codex/ticket-0004-improve-remaining-time-ui`
- Suggested worktree: `../pomo-0004-remaining-time`

## Summary

The previous hover-reveal behavior for remaining-time editing hid key controls and caused discoverability issues. The flow now uses explicit always-visible controls with compact `MM:SS` fields.

## Scope

### In scope

- Redesign remaining-time controls to compact side-by-side minute/second inputs.
- Remove hover-reveal interaction so controls are immediately actionable.
- Preserve accessibility and keyboard operation.

### Out of scope

- Full timer shell redesign.

## Likely Files

- `src/lib/PomodoroTimer.svelte`
- `src/app.css`
- `tests/e2e/session.spec.ts`

## Acceptance Criteria

- [x] Remaining-time controls render as compact side-by-side minute/second inputs.
- [x] Controls are visible and directly actionable without hover/focus reveal.
- [x] Keyboard and screen-reader interactions remain usable.
- [x] Existing remaining-time e2e flow passes or is updated.

## Notes

- Removed `toggle-remaining-editor` affordance and hover-only CSS transitions.
- Updated Playwright coverage to assert direct visibility of remaining-time controls.
