# 0003 - Make Schedule Updates Non-Destructive And Explicit

- Status: `done`
- Priority: `P1`
- Type: `bug`
- Owner: `unassigned`
- Created: `2026-02-15`
- Updated: `2026-02-15`
- Depends on: `none`
- Parallel-safe: `yes`
- Suggested branch: `codex/ticket-0003-safe-schedule-updates`
- Suggested worktree: `../pomo-0003-schedule`

## Summary

Users report that applying schedule settings can feel destructive once a session has started. The UI currently does not clearly communicate effect/impact of schedule changes.

## Scope

### In scope

- Clarify what duration updates change immediately vs later.
- Prevent destructive active-phase shortening without explicit confirmation.
- Separate cycle-related settings from duration settings.

### Out of scope

- New scheduling model beyond current pomodoro phases.

## Likely Files

- `src/lib/PomodoroTimer.svelte`
- `src/lib/scheduleSafety.ts`
- `src/lib/scheduleSafety.test.ts`

## Acceptance Criteria

- [x] Users can understand schedule impact before applying.
- [x] Potentially destructive active-session changes require confirmation or safe fallback behavior.
- [x] Behavior is covered by automated tests.
- [x] Existing timer sync behavior remains deterministic.

## Notes

- Duration and cycle controls are now split into separate forms.
- When the timer is running and a duration change would shorten the active phase, first submit warns and second submit confirms.
- Safety helper behavior is covered by `src/lib/scheduleSafety.test.ts`.
