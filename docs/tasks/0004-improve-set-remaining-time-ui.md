# 0004 - Improve Set Remaining Time UI

- Status: `ready`
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

The remaining-time editor currently looks like a wide form with oversized number inputs for small values. Desired behavior is a compact minute/second (`MM:SS`) control that stays out of the way until user intent is clear (hover/focus).

## Scope

### In scope

- Redesign remaining-time controls to compact side-by-side minute/second inputs.
- Prefer hover/focus reveal instead of always-visible form-like controls.
- Preserve accessibility and keyboard operation.

### Out of scope

- Full timer shell redesign.

## Likely Files

- `src/lib/PomodoroTimer.svelte`
- `src/app.css`
- `tests/e2e/session.e2e.test.ts`

## Acceptance Criteria

- [ ] Remaining-time controls render as compact side-by-side minute/second inputs.
- [ ] Controls are hidden by default and shown via hover/focus intent.
- [ ] Keyboard and screen-reader interactions remain usable.
- [ ] Existing remaining-time e2e flow passes or is updated.

## Notes

- Keep test selectors stable where possible to minimize downstream churn.
