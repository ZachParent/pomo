# 0003 - Make Schedule Updates Non-Destructive And Explicit

- Status: `ready`
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

- Clarify what "Apply Schedule" changes immediately vs later.
- Prevent or confirm destructive changes while timer is active.
- Ensure cycle-related settings are clearly separated from duration settings.

### Out of scope

- New scheduling model beyond current pomodoro phases.

## Likely Files

- `src/lib/PomodoroTimer.svelte`
- `src/lib/timerEngine.ts`
- `src/lib/timerStore.ts`
- `tests/e2e/session.e2e.test.ts`

## Acceptance Criteria

- [ ] Users can understand schedule impact before applying.
- [ ] Potentially destructive active-session changes require confirmation or safe fallback behavior.
- [ ] Behavior is covered by automated tests.
- [ ] Existing timer sync behavior remains deterministic.

## Notes

- Keep host/client synchronization semantics unchanged unless required by fix.
