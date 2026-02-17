# 0014 - Reliable Background Alert Retry

- Status: `done`
- Priority: `P2`
- Type: `bug`
- Owner: `unassigned`
- Created: `2026-02-17`
- Updated: `2026-02-17`
- Depends on: `0010`
- Parallel-safe: `yes`
- Suggested branch: `codex/ticket-0014-reliable-background-alert-retry`
- Suggested worktree: `../pomo-0014-alert-retry`

## Summary

Pomodoro phase-change alerts can fail when browser tabs are backgrounded.
This ticket updates playback recovery so retry attempts continue in background rather than only on tab focus, making audio alerts more likely to trigger when users return attention later.

## Scope

### In scope

- Queue alerts when playback is blocked while hidden.
- Retry alert playback on an interval until success while tab visibility is hidden.
- Ensure hidden retries are cleared on successful playback or when stopping the component.
- Add Playwright regression coverage for suspended-web-audio recovery after hidden-tab transitions.

### Out of scope

- Notification API fallback.
- Server-side/push notification support for timer completion.

## Likely Files

- `src/lib/PomodoroTimer.svelte`
- `tests/e2e/*.spec.ts`

## Acceptance Criteria

- [x] Alerts are queued when playback is blocked in background/hidden states.
- [x] Alert playback is retried while hidden and can play once policy/state allows.
- [x] Pending retry interval is stopped on successful alert playback and component teardown.
- [x] E2E coverage includes suspended-context alert recovery assertion.
- [x] Existing quality gates remain green (`just verify`).

## Notes

- Keep retries bounded by interval management and existing alert deduping behavior to avoid repeated immediate bursts.
