# 0002 - Investigate Session Render Stall Reports

- Status: `done`
- Priority: `P1`
- Type: `bug`
- Owner: `unassigned`
- Created: `2026-02-15`
- Updated: `2026-02-15`
- Depends on: `none`
- Parallel-safe: `yes`
- Suggested branch: `codex/ticket-0002-session-render-stall`
- Suggested worktree: `../pomo-0002-render-stall`

## Summary

A user-reported issue indicates the session UI does not appear until toggling light/dark mode. This behavior is currently not consistently reproducible and needs investigation with instrumentation and deterministic reproduction steps.

## Scope

### In scope

- Reproduce the stall in either `peerjs` or `broadcast` transport.
- Identify root cause and patch.
- Add regression coverage once root cause is known.

### Out of scope

- Broad session UX redesign unrelated to the stall.

## Likely Files

- `src/lib/PomodoroSession.svelte`
- `src/lib/p2pStore.ts`
- `src/App.svelte`
- `tests/e2e/session.spec.ts`

## Acceptance Criteria

- [x] A reliable repro path is documented in this ticket.
- [x] Root cause is documented (state, render, or transport timing issue).
- [x] Fix is merged with regression test coverage.
- [x] No regressions in `just verify`.

## Notes

- Repro path: loading `/pomo/` could leave the main app view blank until an unrelated state update (like toggling theme) forced a rerender.
- Root cause: base-path route activation for the root view was not consistently resolving on initial render/navigation transitions.
- Fix: app-level pathname view resolution in `src/App.svelte` plus a dedicated navigation helper (`src/lib/navigation.ts`) used by `Home.svelte` and `PomodoroSession.svelte`.
- Regression coverage: `tests/e2e/session.spec.ts` now includes a first-load home-route visibility assertion and a leave-to-home assertion.
