# 0005 - Show Host Fallback Actions While Connecting

- Status: `ready`
- Priority: `P2`
- Type: `bug`
- Owner: `unassigned`
- Created: `2026-02-15`
- Updated: `2026-02-15`
- Depends on: `none`
- Parallel-safe: `yes`
- Suggested branch: `codex/ticket-0005-host-fallback-during-connect`
- Suggested worktree: `../pomo-0005-host-fallback`

## Summary

On room join, users may wait several seconds before host fallback actions become available. This can feel like the app is stalled. Exposing host fallback options earlier can reduce confusion and perceived latency.

## Scope

### In scope

- Show host fallback actions in the connecting state when safe.
- Keep clear distinction between "join host" and "become host" paths.
- Preserve deterministic behavior for `broadcast` and `peerjs`.

### Out of scope

- Full reconnect/backoff strategy redesign.

## Likely Files

- `src/lib/PomodoroSession.svelte`
- `src/lib/p2pStore.ts`
- `tests/e2e/session.e2e.test.ts`

## Acceptance Criteria

- [ ] Users can choose to host without waiting for timeout when no host is available.
- [ ] Connecting/hosting state messaging remains clear.
- [ ] No regressions in host/client synchronization tests.

## Notes

- Coordinate with ticket `0002` if both touch the same state transitions.
