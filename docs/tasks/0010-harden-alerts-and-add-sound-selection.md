# 0010 - Harden Alerts And Add Sound Selection

- Status: `done`
- Priority: `P1`
- Type: `feature`
- Owner: `unassigned`
- Created: `2026-02-15`
- Updated: `2026-02-15`
- Depends on: `none`
- Parallel-safe: `yes`
- Suggested branch: `codex/ticket-0010-harden-alerts-sounds`
- Suggested worktree: `../pomo-0010-alerts-sounds`

## Summary

Users reported that alert behavior could be missed after long tab inactivity, and asked for better alert sound choices. The implementation adds deterministic alert fallback logic, a per-user alert sound selector, and clearer theme-control affordances before hosting/connection.

## Scope

### In scope

- Add alert transition fallback for phase changes detected before host token commits.
- Queue alert playback while tab is hidden and flush once visible.
- Add selectable per-user alert sounds with persistent preference.
- Lock room theme editing UI until connection is established.
- Expand unit/e2e coverage for the new behaviors.

### Out of scope

- System-level notifications outside browser audio/visual alerts.
- Remote synchronization of per-user sound preferences.

## Likely Files

- `src/lib/PomodoroTimer.svelte`
- `src/lib/alertFeedback.ts`
- `src/lib/alertFeedback.test.ts`
- `src/lib/PomodoroSession.svelte`
- `src/app.css`
- `tests/e2e/session.spec.ts`

## Acceptance Criteria

- [x] Alert fallback logic handles projected phase changes without duplicate token alerts.
- [x] Hidden-tab pending alert playback triggers once tab returns to visible state.
- [x] Users can pick an alert sound from a dropdown and preference persists locally.
- [x] Theme customization controls are not shown as actionable before connection/hosting.
- [x] `just verify` passes with updated tests.

## Notes

- Added pure transition helper `evaluateAlertTransition` with dedicated unit tests.
- Added timer sound options: `chime`, `bell`, `marimba`, `pulse`.
- Added Playwright assertions for locked pre-connect theme UI and persisted sound selection.
